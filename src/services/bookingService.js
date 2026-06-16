import {
  mapAppBookingToDatabaseBooking,
  mapDatabaseBookingToAppBooking,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeBookingRequest } from "../utils/bookingUtils";

export const bookingService = {
  async getCurrentUserBookings() {
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
      .from("booking_requests")
      .select("*")
      .or(`renter_id.eq.${user.id},host_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      (data || []).map((booking) =>
        normalizeBookingRequest(mapDatabaseBookingToAppBooking(booking))
      )
    );
  },

  async createBookingRequest(booking) {
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

    const payload = mapAppBookingToDatabaseBooking(booking, { renterId: user.id });

    const { data, error: insertError } = await supabase
      .from("booking_requests")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(
      normalizeBookingRequest(mapDatabaseBookingToAppBooking(data))
    );
  },

  async updateBookingRequest(bookingId, updates) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const payload = mapAppBookingToDatabaseBooking(updates);

    const { data, error: updateError } = await supabase
      .from("booking_requests")
      .update(payload)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (updateError) {
      return formatServiceResponse(null, updateError);
    }

    return formatServiceResponse(
      normalizeBookingRequest(mapDatabaseBookingToAppBooking(data))
    );
  },
};
