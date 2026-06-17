import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeHostAnalytics } from "../utils/hostAnalyticsUtils";

export const hostAnalyticsService = {
  async getCurrentHostAnalytics() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse(null, userError);
    }

    const { data, error: rpcError } = await supabase.rpc(
      "get_host_dashboard_analytics"
    );

    if (rpcError) {
      return formatServiceResponse(null, rpcError);
    }

    return formatServiceResponse(normalizeHostAnalytics(data));
  },
};
