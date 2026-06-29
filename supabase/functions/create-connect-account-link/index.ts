import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOST_ROLES = new Set(["Host", "Both"]);

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

function buildAppUrl(path = "/host-dashboard") {
  const appUrl = Deno.env.get("STORET_APP_URL") || "http://localhost:3000";
  const safePath = typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/host-dashboard";

  return `${appUrl.replace(/\/$/, "")}${safePath}`;
}

function buildAppBaseUrl() {
  const appUrl = Deno.env.get("STORET_APP_URL") || "http://localhost:3000";
  return appUrl.replace(/\/$/, "");
}

function getBusinessProfile() {
  const appUrl = buildAppBaseUrl();
  const businessProfile: Stripe.AccountCreateParams.BusinessProfile = {
    // 4225 = Public Warehousing and Storage
    mcc: "4225",
    product_description:
      "Storet hosts rent out storage space to renters through the Storet storage marketplace.",
    name: "Storet host",
  };

  // Stripe expects business_profile.url to be a real public website.
  // Keep localhost/dev URLs out of the connected account and rely on product_description locally.
  if (
    appUrl.startsWith("https://") &&
    !appUrl.includes("localhost") &&
    !appUrl.includes("127.0.0.1")
  ) {
    businessProfile.url = appUrl;
  }

  return businessProfile;
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
    : "in_progress";

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

async function updateProfileForAccount(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  account: Stripe.Account,
) {
  const status = getAccountStatus(account);
  const now = new Date().toISOString();

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_details_submitted: status.detailsSubmitted,
      stripe_connect_charges_enabled: status.chargesEnabled,
      stripe_connect_payouts_enabled: status.payoutsEnabled,
      stripe_connect_onboarding_complete: status.onboardingComplete,
      payout_setup_status: status.payoutSetupStatus,
      payout_setup_completed_at: status.onboardingComplete ? now : null,
      payout_setup_updated_at: now,
      updated_at: now,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return { profile, status };
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

    const body = await req.json().catch(() => ({}));
    const returnPath = body?.returnPath || "/host-dashboard?payout=return";
    const refreshPath = body?.refreshPath || "/host-dashboard?payout=refresh";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "You must be signed in to set up payouts." }, 401);
    }

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !existingProfile) {
      return jsonResponse({ error: "Storet profile was not found." }, 404);
    }

    if (!HOST_ROLES.has(existingProfile.role)) {
      return jsonResponse({ error: "Only host-capable accounts can set up payouts." }, 403);
    }

    const stripe = new Stripe(stripeSecretKey);
    let account: Stripe.Account;

    if (existingProfile.stripe_connect_account_id) {
      const retrievedAccount = await stripe.accounts.retrieve(existingProfile.stripe_connect_account_id);

      if ((retrievedAccount as Stripe.DeletedAccount).deleted) {
        return jsonResponse({ error: "The connected Stripe account was deleted. Contact Storet support before continuing." }, 409);
      }

      account = retrievedAccount as Stripe.Account;

      const nextBusinessProfile = getBusinessProfile();
      const shouldRefreshBusinessProfile =
        account.business_profile?.mcc !== nextBusinessProfile.mcc ||
        account.business_profile?.product_description !== nextBusinessProfile.product_description ||
        (!account.business_profile?.url && Boolean(nextBusinessProfile.url)) ||
        account.business_profile?.name !== nextBusinessProfile.name;

      if (shouldRefreshBusinessProfile) {
        try {
          account = await stripe.accounts.update(account.id, {
            business_profile: nextBusinessProfile,
          });
        } catch (updateError) {
          console.warn("Could not refresh connected account business profile.", updateError);
        }
      }
    } else {
      account = await stripe.accounts.create({
        type: "express",
        country: Deno.env.get("STRIPE_CONNECT_COUNTRY") || "US",
        email: user.email || existingProfile.email || undefined,
        business_type: "individual",
        business_profile: getBusinessProfile(),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          storet_user_id: user.id,
          storet_profile_email: existingProfile.email || user.email || "",
          storet_connected_account_type: "host_payouts",
        },
      });
    }

    const { profile, status } = await updateProfileForAccount(supabaseAdmin, user.id, account);

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: buildAppUrl(refreshPath),
      return_url: buildAppUrl(returnPath),
      type: "account_onboarding",
    });

    return jsonResponse({
      url: accountLink.url,
      accountId: account.id,
      profile,
      status,
    });
  } catch (error) {
    console.error("create-connect-account-link error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Could not start payout setup." },
      500,
    );
  }
});
