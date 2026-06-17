import { NOTIFICATION_STATUSES } from "../constants/appEnums";
import {
  mapDatabaseNotificationToAppNotification,
  mapAppNotificationToDatabaseNotification,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeNotificationList } from "../utils/notificationUtils";

const NOTIFICATION_SELECT = "*";

async function getCurrentUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { userId: null, error };
  }

  return { userId: data?.user?.id || null, error: null };
}

export const notificationService = {
  async getCurrentUserNotifications() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const { userId, error: userError } = await getCurrentUserId(supabase);

    if (userError || !userId) {
      return formatServiceResponse([], userError || { message: "You must be signed in to load notifications." });
    }

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      normalizeNotificationList((data || []).map(mapDatabaseNotificationToAppNotification))
    );
  },

  async markNotificationRead(notificationId) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const now = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from("notifications")
      .update(
        mapAppNotificationToDatabaseNotification({
          status: NOTIFICATION_STATUSES.READ,
          readAt: now,
        })
      )
      .eq("id", notificationId)
      .select(NOTIFICATION_SELECT)
      .single();

    if (updateError) {
      return formatServiceResponse(null, updateError);
    }

    return formatServiceResponse(mapDatabaseNotificationToAppNotification(data));
  },

  async markAllNotificationsRead() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const { userId, error: userError } = await getCurrentUserId(supabase);

    if (userError || !userId) {
      return formatServiceResponse([], userError || { message: "You must be signed in to update notifications." });
    }

    const now = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from("notifications")
      .update(
        mapAppNotificationToDatabaseNotification({
          status: NOTIFICATION_STATUSES.READ,
          readAt: now,
        })
      )
      .eq("recipient_id", userId)
      .eq("status", NOTIFICATION_STATUSES.UNREAD)
      .select(NOTIFICATION_SELECT);

    if (updateError) {
      return formatServiceResponse([], updateError);
    }

    return formatServiceResponse(
      normalizeNotificationList((data || []).map(mapDatabaseNotificationToAppNotification))
    );
  },

  subscribeToCurrentUserNotifications(userId, onChange) {
    const { supabase } = requireSupabase();

    if (!supabase || !userId || typeof onChange !== "function") {
      return {
        unsubscribe() {},
      };
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        onChange
      )
      .subscribe();

    return {
      unsubscribe() {
        supabase.removeChannel(channel);
      },
    };
  },
};
