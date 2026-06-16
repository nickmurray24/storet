import {
  mapAppListingToDatabaseListing,
  mapDatabaseListingToAppListing,
  mapDatabaseSavedListingToAppId,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeListing, normalizeListingList } from "../utils/listingUtils";

const LISTING_SELECT = "*";

export const listingService = {
  async getActiveListings() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const { data, error: queryError } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      normalizeListingList((data || []).map(mapDatabaseListingToAppListing))
    );
  },

  async getCurrentUserListings() {
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
      .from("listings")
      .select(LISTING_SELECT)
      .eq("host_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      normalizeListingList((data || []).map(mapDatabaseListingToAppListing))
    );
  },

  async createListing(listing) {
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

    const payload = mapAppListingToDatabaseListing(listing, { hostId: user.id });

    const { data, error: insertError } = await supabase
      .from("listings")
      .insert(payload)
      .select(LISTING_SELECT)
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(normalizeListing(mapDatabaseListingToAppListing(data)));
  },

  async updateListing(listingId, updates) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const payload = mapAppListingToDatabaseListing(updates, { partial: true });

    const { data, error: updateError } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listingId)
      .select(LISTING_SELECT)
      .single();

    if (updateError) {
      return formatServiceResponse(null, updateError);
    }

    return formatServiceResponse(normalizeListing(mapDatabaseListingToAppListing(data)));
  },

  async deleteListing(listingId) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(false, error);
    }

    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    return formatServiceResponse(!deleteError, deleteError);
  },

  async getSavedListingIds() {
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
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id);

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse((data || []).map(mapDatabaseSavedListingToAppId));
  },

  async saveListing(listingId) {
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

    const { data, error: upsertError } = await supabase
      .from("saved_listings")
      .upsert(
        {
          user_id: user.id,
          listing_id: listingId,
        },
        { onConflict: "user_id,listing_id" }
      )
      .select("listing_id")
      .single();

    if (upsertError) {
      return formatServiceResponse(null, upsertError);
    }

    return formatServiceResponse(mapDatabaseSavedListingToAppId(data));
  },

  async unsaveListing(listingId) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(false, error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse(false, userError);
    }

    const { error: deleteError } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    return formatServiceResponse(!deleteError, deleteError);
  },
};
