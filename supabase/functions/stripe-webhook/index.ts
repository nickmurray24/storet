import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
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

function toInteger(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : fallback;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent;

  if (!paymentIntent) {
    return null;
  }

  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
    const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const stripe = new Stripe(stripeSecretKey);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return jsonResponse({ error: "Missing Stripe signature." }, 400);
    }

    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );

    if (event.type !== "checkout.session.completed") {
      return jsonResponse({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.booking_request_id || session.client_reference_id;

    if (!requestId) {
      return jsonResponse({ error: "Missing booking request metadata." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("booking_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (bookingError || !booking) {
      throw bookingError || new Error("Booking request was not found.");
    }

    const storageChargeCents = toInteger(
      session.metadata?.storage_charge_cents,
      Math.round(Number(booking.listing_price || 0) * 100)
    );
    const serviceFeeCents = toInteger(session.metadata?.service_fee_cents, 1900);
    const amountCents = toInteger(
      session.amount_total,
      storageChargeCents + serviceFeeCents
    );
    const paidAt = new Date().toISOString();
    const receiptNumber = `ST-${session.id.slice(-12).toUpperCase()}`;

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payment_records")
      .upsert(
        {
          booking_request_id: requestId,
          listing_id: booking.listing_id,
          host_id: booking.host_id,
          renter_id: booking.renter_id,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: getPaymentIntentId(session),
          display_card_brand: "Stripe",
          display_last4: "Checkout",
          storage_charge_cents: storageChargeCents,
          service_fee_cents: serviceFeeCents,
          amount_cents: amountCents,
          currency: session.currency || "usd",
          rate_period: booking.rate_period,
          rate_label: booking.rate_label,
          rate_display: booking.rate_display,
          status: "Paid",
          receipt_number: receiptNumber,
          paid_at: paidAt,
          updated_at: paidAt,
        },
        { onConflict: "booking_request_id" }
      )
      .select("id")
      .single();

    if (paymentError) {
      throw paymentError;
    }

    const { error: updateBookingError } = await supabaseAdmin
      .from("booking_requests")
      .update({
        status: "Confirmed",
        confirmed_at: paidAt,
        updated_at: paidAt,
      })
      .eq("id", requestId);

    if (updateBookingError) {
      throw updateBookingError;
    }

    return jsonResponse({ received: true, paymentId: payment?.id });
  } catch (error) {
    console.error("stripe-webhook error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Webhook handling failed." },
      400
    );
  }
});
