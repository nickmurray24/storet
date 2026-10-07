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
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Please sign in to manage payouts." }, 401);
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabase = createClient(supabaseUrl, requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Please sign in to manage payouts." }, 401);
    const admin = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    // Never accept a connected account ID from the browser.
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role, stripe_connect_account_id").eq("id", user.id).single();
    if (profileError || !profile) return jsonResponse({ error: "Storet profile was not found." }, 404);
    if (!["Host", "Both"].includes(profile.role)) return jsonResponse({ error: "Only hosts can manage payouts." }, 403);
    if (!profile.stripe_connect_account_id) return jsonResponse({ error: "Complete payout setup before managing payouts." }, 409);
    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const link = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
    return jsonResponse({ url: link.url });
  } catch (error) {
    console.error("create-connect-login-link failed", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "Could not open Stripe payout settings. Please try again." }, 500);
  }
});
