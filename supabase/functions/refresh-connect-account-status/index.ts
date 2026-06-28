import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function getAccountStatus(account: Stripe.Account) {
  const detailsSubmitted = Boolean(account.details_submitted);
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const onboardingComplete = detailsSubmitted && chargesEnabled && payoutsEnabled;
  const currentlyDue = account.requirements?.currently_due || [];
  const pastDue = account.requirements?.past_due || [];
  const disabledReason = account.requirements?.disabled_reason || "";
  const needsAttention = Boolean(disabledReason || currentlyDue.length || pastDue.length);
  const payoutSetupStatus = onboardingComplete
    ? "ready"
    : detailsSubmitted && needsAttention
    ? "restricted"
    : account.id
    ? "in_progress"
    : "not_started";

  return {
    payoutSetupStatus,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete,
    currentlyDue,
    pastDue,
    disabledReason,
  };
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
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "You must be signed in to check payout setup." }, 401);
    }

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !existingProfile) {
      return jsonResponse({ error: "Storet profile was not found." }, 404);
    }

    if (!existingProfile.stripe_connect_account_id) {
      return jsonResponse({
        profile: existingProfile,
        status: {
          payoutSetupStatus: "not_started",
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
          currentlyDue: [],
          pastDue: [],
          disabledReason: "",
        },
      });
    }

    const stripe = new Stripe(stripeSecretKey);
    const retrievedAccount = await stripe.accounts.retrieve(existingProfile.stripe_connect_account_id);

    if ((retrievedAccount as Stripe.DeletedAccount).deleted) {
      return jsonResponse({ error: "The connected Stripe account was deleted. Contact Storet support before continuing." }, 409);
    }

    const account = retrievedAccount as Stripe.Account;
    const status = getAccountStatus(account);
    const now = new Date().toISOString();

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        stripe_connect_details_submitted: status.detailsSubmitted,
        stripe_connect_charges_enabled: status.chargesEnabled,
        stripe_connect_payouts_enabled: status.payoutsEnabled,
        stripe_connect_onboarding_complete: status.onboardingComplete,
        payout_setup_status: status.payoutSetupStatus,
        payout_setup_completed_at: status.onboardingComplete ? now : null,
        payout_setup_updated_at: now,
        updated_at: now,
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      accountId: account.id,
      profile,
      status,
    });
  } catch (error) {
    console.error("refresh-connect-account-status error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Could not refresh payout setup." },
      500,
    );
  }
});
