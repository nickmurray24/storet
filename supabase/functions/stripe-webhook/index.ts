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

    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return jsonResponse({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.booking_request_id || session.client_reference_id;

    if (!requestId) {
      return jsonResponse({ error: "Missing booking request metadata." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (session.payment_status !== "paid") return jsonResponse({ received: true, awaitingPayment: true });
    const intentId = getPaymentIntentId(session);
    const { data: result, error: paymentError } = await supabaseAdmin.rpc("record_dated_booking_payment", {
      p_booking_id: requestId, p_session_id: session.id, p_intent_id: intentId,
      p_amount_cents: session.amount_total, p_currency: session.currency,
    });
    if (paymentError) throw paymentError; // Retry technical failures; never acknowledge a lost receipt.
    if (!result?.ok) {
      if (!intentId) throw new Error("A paid session is missing its payment intent.");
      // A cancellation or a second paid checkout must never resurrect a reservation.
      // Stripe idempotency makes webhook retries safe if a refund response is lost.
      await stripe.refunds.create({ payment_intent: intentId }, { idempotencyKey: `storet-unavailable-${session.id}` });
      console.warn("Refunded unfulfillable checkout", session.id, result?.error);
      return jsonResponse({ received: true, refunded: true });
    }
    return jsonResponse({ received: true, paymentId: result.paymentId });
  } catch (error) {
    console.error("stripe-webhook error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Webhook handling failed." },
      500
    );
  }
});
