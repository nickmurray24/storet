import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SERVICE_FEE_CENTS = 1900;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildAppUrl(path: string) {
  const appUrl = Deno.env.get("STORET_APP_URL") || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}${path}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const { requestId } = await req.json();

    if (!requestId) {
      return jsonResponse({ error: "Missing booking request id." }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "You must be signed in to start checkout." }, 401);
    }

    const { data: booking, error: bookingError } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (bookingError || !booking) {
      return jsonResponse({ error: "Booking request was not found." }, 404);
    }

    if (booking.renter_id !== user.id) {
      return jsonResponse({ error: "Only the renter can pay for this booking." }, 403);
    }

    if (booking.status !== "Approved") {
      return jsonResponse({ error: "This booking is not ready for checkout." }, 409);
    }

    const storageChargeCents = Math.max(0, Math.round(Number(booking.listing_price || 0) * 100));
    const amountCents = storageChargeCents + SERVICE_FEE_CENTS;

    if (amountCents <= 0) {
      return jsonResponse({ error: "Checkout amount must be greater than $0." }, 400);
    }

    const stripe = new Stripe(stripeSecretKey);

    const successUrl = buildAppUrl(
      `/checkout/${requestId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    );
    const cancelUrl = buildAppUrl(`/checkout/${requestId}?checkout=cancelled`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: requestId,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Storet booking: ${booking.listing_title}`,
              description: `${booking.rate_display || "Storage rental"} with ${booking.host_display_name || "Storet host"}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_request_id: requestId,
        listing_id: booking.listing_id,
        host_id: booking.host_id,
        renter_id: booking.renter_id,
        storage_charge_cents: String(storageChargeCents),
        service_fee_cents: String(SERVICE_FEE_CENTS),
        amount_cents: String(amountCents),
        rate_period: booking.rate_period,
        rate_label: booking.rate_label,
        rate_display: booking.rate_display,
      },
      payment_intent_data: {
        metadata: {
          booking_request_id: requestId,
          listing_id: booking.listing_id,
          host_id: booking.host_id,
          renter_id: booking.renter_id,
        },
      },
    });

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("create-checkout-session error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Could not create checkout session." },
      500
    );
  }
});
