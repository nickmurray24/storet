import { requireSupabase, formatServiceResponse } from "./backendServiceUtils";
import { bookingRanges, isBackendListingId } from "../utils/rentalDates";
const LOCAL_KEY = "storet_listing_calendar_blocks_v1";
function localBlocks() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; } }
const mapRange = r => ({ id: r.id, startDate: r.start_date, endDate: r.end_date, kind: r.kind, reason: r.reason || "" });
export const listingAvailabilityService = {
  async getRanges(listingId, bookings = []) {
    if (!isBackendListingId(listingId)) return formatServiceResponse([
      ...localBlocks().filter(r => String(r.listingId) === String(listingId)), ...bookingRanges(bookings, listingId)]);
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse([], error);
    const result = await supabase.rpc("get_listing_availability", { p_listing_id: listingId });
    return formatServiceResponse((result.data || []).map(mapRange), result.error);
  },
  async getHostBlocks(listingId) {
    if (!isBackendListingId(listingId)) return formatServiceResponse(localBlocks().filter(r => String(r.listingId) === String(listingId)));
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse([], error);
    const result = await supabase.from("listing_calendar_blocks").select("id,start_date,end_date,kind,reason")
      .eq("listing_id", listingId).eq("kind", "blocked").order("start_date");
    return formatServiceResponse((result.data || []).map(mapRange), result.error);
  },
  async addBlock(listingId, startDate, endDate, reason) {
    if (!isBackendListingId(listingId)) {
      const item = { id: `block-${Date.now()}-${Math.random().toString(36).slice(2)}`, listingId, startDate, endDate, reason, kind: "blocked" };
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...localBlocks(), item])); return formatServiceResponse(item);
    }
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse(null, error);
    const result = await supabase.from("listing_calendar_blocks").insert({ listing_id: listingId, start_date: startDate, end_date: endDate, reason, kind: "blocked" });
    return formatServiceResponse(result.data, result.error);
  },
  async removeBlock(listingId, id) {
    if (!isBackendListingId(listingId)) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(localBlocks().filter(r => r.id !== id || String(r.listingId) !== String(listingId))));
      return formatServiceResponse(null);
    }
    const { supabase, error } = requireSupabase(); if (error) return formatServiceResponse(null, error);
    const result = await supabase.from("listing_calendar_blocks").delete().eq("id", id).eq("listing_id", listingId).eq("kind", "blocked");
    return formatServiceResponse(result.data, result.error);
  },
};
export function availabilityError(error) {
  if (error?.code === "23P01") return "Those dates overlap a reservation or another blocked range. Refresh the calendar and try different dates.";
  return error?.message || "Availability could not be loaded. Please try again.";
}
