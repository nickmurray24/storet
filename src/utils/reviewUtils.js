import { BOOKING_STATUSES } from "../constants/appEnums";
import {
  MODEL_PREFIXES,
  createModelId,
  getIsoTimestamp,
} from "../models/storetModels";

export function normalizeReview(review = {}, index = 0) {
  const now = new Date().toISOString();
  const createdAt = getIsoTimestamp(review.createdAt || review.submittedAt, now);
  const updatedAt = getIsoTimestamp(review.updatedAt || createdAt, createdAt);
  const ratingNumber = Number(review.rating || 0);

  return {
    id: String(review.id || createModelId(MODEL_PREFIXES.REVIEW) || `review-${index + 1}`),
    listingId: String(review.listingId || review.listing_id || ""),
    bookingRequestId: String(
      review.bookingRequestId || review.booking_request_id || review.requestId || ""
    ),
    reviewerId: String(review.reviewerId || review.reviewer_id || review.renterId || ""),
    reviewerName:
      review.reviewerName ||
      review.reviewer_display_name ||
      review.renterName ||
      review.requesterName ||
      "Storet renter",
    hostId: String(review.hostId || review.host_id || ""),
    rating: Number.isFinite(ratingNumber) ? Math.min(Math.max(ratingNumber, 1), 5) : 5,
    comment: review.comment || review.reviewText || review.message || "",
    createdAt,
    updatedAt,
  };
}

export function normalizeReviewList(reviews = []) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const seenIds = new Set();

  return safeReviews.map(normalizeReview).filter((review) => {
    if (!review.id || seenIds.has(review.id)) {
      return false;
    }

    seenIds.add(review.id);
    return true;
  });
}

export function createReviewRecord({ listing, bookingRequest, currentUser, reviewData = {} }) {
  const now = new Date().toISOString();
  const ratingNumber = Number(reviewData.rating || 5);

  return normalizeReview({
    id: reviewData.id || createModelId(MODEL_PREFIXES.REVIEW),
    listingId: listing?.id || bookingRequest?.listingId,
    bookingRequestId: bookingRequest?.id || reviewData.bookingRequestId,
    reviewerId: currentUser?.id || bookingRequest?.renterId,
    reviewerName:
      currentUser?.fullName ||
      currentUser?.name ||
      bookingRequest?.renterName ||
      bookingRequest?.requesterName ||
      "Storet renter",
    hostId: listing?.hostId || bookingRequest?.hostId,
    rating: Number.isFinite(ratingNumber) ? ratingNumber : 5,
    comment: reviewData.reviewText || reviewData.comment || "",
    createdAt: now,
    updatedAt: now,
  });
}

export function getReviewSummary(reviews = [], fallback = {}) {
  const normalizedReviews = normalizeReviewList(reviews);

  if (normalizedReviews.length === 0) {
    const fallbackRating = Number(fallback.rating || fallback.averageRating || 0);
    const fallbackCount = Number(fallback.reviewCount || fallback.reviews || 0);

    return {
      averageRating: Number.isFinite(fallbackRating) ? fallbackRating : 0,
      reviewCount: Number.isFinite(fallbackCount) ? fallbackCount : 0,
    };
  }

  const ratingTotal = normalizedReviews.reduce(
    (total, review) => total + Number(review.rating || 0),
    0
  );

  return {
    averageRating: ratingTotal / normalizedReviews.length,
    reviewCount: normalizedReviews.length,
  };
}

export function getReviewForBooking(reviews = [], bookingRequestId) {
  const normalizedBookingId = String(bookingRequestId || "");

  if (!normalizedBookingId) {
    return null;
  }

  return normalizeReviewList(reviews).find(
    (review) => String(review.bookingRequestId) === normalizedBookingId
  ) || null;
}

export function getEligibleReviewRequest({ listingId, bookingRequests = [], reviews = [], currentUser = null }) {
  const normalizedListingId = String(listingId || "");
  const currentUserId = String(currentUser?.id || currentUser?.userId || "");

  if (!normalizedListingId || !currentUser?.isAuthenticated || !currentUserId) {
    return null;
  }

  const reviewedBookingIds = new Set(
    normalizeReviewList(reviews)
      .map((review) => String(review.bookingRequestId || ""))
      .filter(Boolean)
  );

  return (Array.isArray(bookingRequests) ? bookingRequests : []).find((request) => {
    const isSameListing = String(request.listingId) === normalizedListingId;
    const isCurrentRenter = String(request.renterId || request.requesterId || "") === currentUserId;
    const isCompleted = request.status === BOOKING_STATUSES.COMPLETED;
    const hasReview = reviewedBookingIds.has(String(request.id || ""));

    return isSameListing && isCurrentRenter && isCompleted && !hasReview;
  }) || null;
}
