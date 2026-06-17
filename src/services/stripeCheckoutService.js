import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";

export const stripeCheckoutService = {
  async createCheckoutSession({ requestId, returnPath } = {}) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    if (!requestId) {
      return formatServiceResponse(null, "Missing booking request id.");
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: {
          requestId,
          returnPath,
        },
      }
    );

    if (functionError) {
      return formatServiceResponse(null, functionError);
    }

    if (data?.error) {
      return formatServiceResponse(null, data.error);
    }

    return formatServiceResponse(data || null);
  },
};
