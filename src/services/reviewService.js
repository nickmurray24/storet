import {
  mapAppReviewToDatabaseReview,
  mapDatabaseReviewToAppReview,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { normalizeReview, normalizeReviewList } from "../utils/reviewUtils";

const REVIEW_SELECT = "*";

export const reviewService = {
  async getListingReviews(listingId) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const { data, error: queryError } = await supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      normalizeReviewList((data || []).map(mapDatabaseReviewToAppReview))
    );
  },

  async createReview(review) {
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

    const payload = mapAppReviewToDatabaseReview(review, { reviewerId: user.id });

    const { data, error: insertError } = await supabase
      .from("reviews")
      .insert(payload)
      .select(REVIEW_SELECT)
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(normalizeReview(mapDatabaseReviewToAppReview(data)));
  },
};
