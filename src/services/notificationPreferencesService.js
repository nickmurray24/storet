import { requireSupabase, formatServiceResponse } from "./backendServiceUtils";
import { normalizeNotificationPreferences, preferenceRows } from "../utils/notificationPreferences";
export const notificationPreferencesService = {
  async load() {
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse(null, error);
    const auth = await supabase.auth.getUser();
    if (auth.error || !auth.data?.user) return formatServiceResponse(null, auth.error || { message: "Sign in to manage notification settings." });
    const result = await supabase.from("notification_preferences").select("category,in_app,email").eq("user_id", auth.data.user.id);
    return formatServiceResponse({ preferences: normalizeNotificationPreferences(result.data || []),
      email: auth.data.user.email || "", emailVerified: Boolean(auth.data.user.email_confirmed_at) }, result.error);
  },
  async save(preferences) {
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse(null, error);
    const auth = await supabase.auth.getUser();
    if (auth.error || !auth.data?.user) return formatServiceResponse(null, auth.error || { message: "Sign in to save your settings." });
    const result = await supabase.from("notification_preferences")
      .upsert(preferenceRows(preferences, auth.data.user.id), { onConflict: "user_id,category" }).select("category,in_app,email");
    return formatServiceResponse(normalizeNotificationPreferences(result.data || []), result.error);
  },
};
