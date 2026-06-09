import {
  mapAppHostMessageToDatabaseMessage,
  mapDatabaseHostMessageToAppMessage,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeHostMessage } from "../utils/hostMessageUtils";

export const messageService = {
  async getCurrentUserMessages() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse([], userError);
    }

    const { data, error: queryError } = await supabase
      .from("host_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},host_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      (data || []).map((message) => normalizeHostMessage(mapDatabaseHostMessageToAppMessage(message)))
    );
  },

  async createHostMessage(message) {
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

    const payload = mapAppHostMessageToDatabaseMessage(message, { senderId: user.id });

    const { data, error: insertError } = await supabase
      .from("host_messages")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(normalizeHostMessage(mapDatabaseHostMessageToAppMessage(data)));
  },

  async updateHostMessage(messageId, updates) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const payload = mapAppHostMessageToDatabaseMessage(updates);

    const { data, error: updateError } = await supabase
      .from("host_messages")
      .update(payload)
      .eq("id", messageId)
      .select("*")
      .single();

    if (updateError) {
      return formatServiceResponse(null, updateError);
    }

    return formatServiceResponse(normalizeHostMessage(mapDatabaseHostMessageToAppMessage(data)));
  },
};
