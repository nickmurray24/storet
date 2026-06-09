import { getSupabaseClient, getSupabaseConfigStatus } from "../lib/supabaseClient";

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "Supabase is not configured yet. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart npm start.";

export function createServiceError(message, details = {}) {
  return {
    message,
    ...details,
  };
}

export function requireSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      supabase: null,
      error: createServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE, {
        configStatus: getSupabaseConfigStatus(),
      }),
    };
  }

  return {
    supabase,
    error: null,
  };
}

export function formatServiceResponse(data, error = null) {
  return {
    data,
    error,
    ok: !error,
  };
}
