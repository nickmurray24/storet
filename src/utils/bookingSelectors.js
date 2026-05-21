import { BOOKING_STATUSES, normalizeBookingRequestList } from "./bookingUtils";

const CHECKOUT_READY_STATUSES = new Set([BOOKING_STATUSES.APPROVED]);
const CHECKOUT_HISTORY_STATUSES = new Set([
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.ACTIVE,
  BOOKING_STATUSES.COMPLETED,
  BOOKING_STATUSES.CANCELLED,
]);
const OPEN_REQUEST_STATUSES = new Set([
  BOOKING_STATUSES.PENDING,
  BOOKING_STATUSES.APPROVED,
  BOOKING_STATUSES.WAITLISTED,
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.ACTIVE,
]);

export function getBookingTimestamp(request = {}) {
  return (
    request.updatedAt ||
    request.submittedAt ||
    request.createdAt ||
    request.confirmedAt ||
    request.approvedAt ||
    request.waitlistedAt ||
    null
  );
}

export function getBookingTimestampValue(request = {}) {
  const timestamp = getBookingTimestamp(request);
  const value = new Date(timestamp || 0).getTime();

  return Number.isNaN(value) ? 0 : value;
}

export function sortBookingRequestsByNewest(requests = []) {
  return normalizeBookingRequestList(requests).sort(
    (a, b) => getBookingTimestampValue(b) - getBookingTimestampValue(a)
  );
}

export function getBookingRequestById(requests = [], requestId) {
  return sortBookingRequestsByNewest(requests).find(
    (request) => String(request.id) === String(requestId)
  ) || null;
}

export function getPaymentRecordForRequest(paymentRecords = [], requestId) {
  const safeRecords = Array.isArray(paymentRecords) ? paymentRecords : [];

  return safeRecords.find(
    (payment) => String(payment.requestId) === String(requestId)
  ) || null;
}

export function getRenterBookingRequests(requests = [], currentUser = {}) {
  const activeEmail = currentUser?.email?.toLowerCase?.() || "";
  const normalizedRequests = sortBookingRequestsByNewest(requests);

  if (!activeEmail) {
    return normalizedRequests;
  }

  return normalizedRequests.filter(
    (request) => request.renterEmail?.toLowerCase?.() === activeEmail
  );
}

export function getHostBookingRequests(requests = [], hostListings = []) {
  const hostListingIds = new Set(
    (Array.isArray(hostListings) ? hostListings : [])
      .map((listing) => String(listing.id))
      .filter(Boolean)
  );

  const normalizedRequests = sortBookingRequestsByNewest(requests);

  if (hostListingIds.size === 0) {
    return [];
  }

  return normalizedRequests.filter((request) =>
    hostListingIds.has(String(request.listingId))
  );
}

export function getLatestBookingRequestForListing(
  requests = [],
  listingId,
  currentUser = null
) {
  const activeEmail = currentUser?.email?.toLowerCase?.() || "";

  return sortBookingRequestsByNewest(requests).find((request) => {
    const matchesListing = String(request.listingId) === String(listingId);

    if (!matchesListing) {
      return false;
    }

    if (!activeEmail) {
      return true;
    }

    return request.renterEmail?.toLowerCase?.() === activeEmail;
  }) || null;
}

export function canCheckoutBookingRequest(request = {}) {
  return CHECKOUT_READY_STATUSES.has(request.status);
}

export function canViewCheckoutHistory(request = {}) {
  return CHECKOUT_HISTORY_STATUSES.has(request.status);
}

export function hasOpenBookingRequest(request = {}) {
  return OPEN_REQUEST_STATUSES.has(request.status);
}

export function getBookingRequestCheckoutPath(request = {}) {
  if (!request?.id) {
    return "/profile";
  }

  return `/checkout/${request.id}`;
}

export function getBookingRequestPrimaryAction(request = {}) {
  if (canCheckoutBookingRequest(request)) {
    return {
      label: "Checkout",
      to: getBookingRequestCheckoutPath(request),
    };
  }

  if (canViewCheckoutHistory(request)) {
    return {
      label: "View receipt",
      to: getBookingRequestCheckoutPath(request),
    };
  }

  return {
    label: "View listing",
    to: `/listing/${request.listingId}`,
  };
}

export function getCheckoutBlockedReason(request = {}) {
  if (!request) {
    return {
      title: "Checkout not available",
      description: "We couldn’t find that booking request for your account.",
      actionLabel: "Back to Profile",
      actionTo: "/profile",
    };
  }

  if (request.status === BOOKING_STATUSES.PENDING) {
    return {
      title: "Checkout is not ready yet",
      description:
        "Your booking request is still pending. Checkout becomes available after the host approves your request.",
      actionLabel: "Back to Profile",
      actionTo: "/profile",
    };
  }

  if (request.status === BOOKING_STATUSES.WAITLISTED) {
    return {
      title: "You’re currently waitlisted",
      description:
        "This booking is on the waitlist, so checkout is not available yet.",
      actionLabel: "Back to Profile",
      actionTo: "/profile",
    };
  }

  if (request.status === BOOKING_STATUSES.DECLINED) {
    return {
      title: "Request declined",
      description:
        "This booking request was declined, so checkout is no longer available for it.",
      actionLabel: "Browse Other Listings",
      actionTo: "/explore",
    };
  }

  return null;
}
