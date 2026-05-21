import { normalizeListing, parseNumber } from "./listingUtils";

export const BOOKING_STATUSES = {
  PENDING: "Pending",
  APPROVED: "Approved",
  WAITLISTED: "Waitlisted",
  DECLINED: "Declined",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function getInitialBookingStatus(listing = {}) {
  if (listing.waitlist && !listing.instantBook) {
    return BOOKING_STATUSES.WAITLISTED;
  }

  if (listing.instantBook) {
    return BOOKING_STATUSES.APPROVED;
  }

  return BOOKING_STATUSES.PENDING;
}

export function normalizeBookingRequest(request = {}, index = 0) {
  const createdAt = request.createdAt || new Date().toISOString();

  return {
    id: String(request.id || `booking-${index + 1}`),
    listingId: String(request.listingId || ""),
    listingTitle: request.listingTitle || "Storage space",
    listingPrice: parseNumber(request.listingPrice ?? request.price, 0),
    hostName: request.hostName || request.host || "Storet Host",
    renterName:
      request.renterName || request.requesterName || request.fullName || "Demo User",
    renterEmail:
      request.renterEmail || request.requesterEmail || request.email || "",
    requesterName:
      request.requesterName || request.renterName || request.fullName || "Demo User",
    requesterEmail:
      request.requesterEmail || request.renterEmail || request.email || "",
    submittedAt: request.submittedAt || createdAt,
    moveInDate: request.moveInDate || "Not selected",
    moveOutDate: request.moveOutDate || "Not selected",
    duration: request.duration || "Month-to-month",
    notes: request.notes || "",
    status: request.status || BOOKING_STATUSES.PENDING,
    createdAt,
    updatedAt: request.updatedAt || createdAt,
    approvedAt: request.approvedAt || null,
    waitlistedAt: request.waitlistedAt || null,
    declinedAt: request.declinedAt || null,
    confirmedAt: request.confirmedAt || null,
    activatedAt: request.activatedAt || null,
    completedAt: request.completedAt || null,
    cancelledAt: request.cancelledAt || null,
    paymentRecordId: request.paymentRecordId || null,
  };
}

export function normalizeBookingRequestList(requests) {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const seenIds = new Set();

  return safeRequests.map(normalizeBookingRequest).filter((request) => {
    if (!request.id || seenIds.has(request.id)) {
      return false;
    }

    seenIds.add(request.id);
    return true;
  });
}

export function createBookingRequest({ listing, currentUser, requestData = {} }) {
  const normalizedListing = normalizeListing(listing);
  const now = new Date().toISOString();
  const status = getInitialBookingStatus(normalizedListing);

  return normalizeBookingRequest({
    id: `booking-${Date.now()}`,
    listingId: normalizedListing.id,
    listingTitle: normalizedListing.title,
    listingPrice: normalizedListing.price,
    hostName: normalizedListing.host,
    renterName:
      requestData.fullName || currentUser?.fullName || currentUser?.name || "Demo User",
    renterEmail: requestData.email || currentUser?.email || "",
    moveInDate: requestData.moveInDate || "Not selected",
    moveOutDate: requestData.moveOutDate || "Not selected",
    duration: requestData.duration || "Month-to-month",
    notes: requestData.notes || "Created from the listing details page.",
    status,
    createdAt: now,
    updatedAt: now,
    approvedAt: status === BOOKING_STATUSES.APPROVED ? now : null,
    waitlistedAt: status === BOOKING_STATUSES.WAITLISTED ? now : null,
  });
}

export function updateBookingRequestStatus(request, status) {
  const now = new Date().toISOString();

  return normalizeBookingRequest({
    ...request,
    status,
    updatedAt: now,
    approvedAt: status === BOOKING_STATUSES.APPROVED ? now : request.approvedAt,
    waitlistedAt:
      status === BOOKING_STATUSES.WAITLISTED ? now : request.waitlistedAt,
    declinedAt: status === BOOKING_STATUSES.DECLINED ? now : request.declinedAt,
  });
}

export function updateBookingLifecycle(request, status) {
  const now = new Date().toISOString();

  return normalizeBookingRequest({
    ...request,
    status,
    updatedAt: now,
    confirmedAt:
      status === BOOKING_STATUSES.CONFIRMED ? now : request.confirmedAt,
    activatedAt: status === BOOKING_STATUSES.ACTIVE ? now : request.activatedAt,
    completedAt: status === BOOKING_STATUSES.COMPLETED ? now : request.completedAt,
    cancelledAt: status === BOOKING_STATUSES.CANCELLED ? now : request.cancelledAt,
  });
}

export function createPaymentRecord(request, paymentData = {}) {
  const now = new Date().toISOString();
  const storageCharge = Number(paymentData.storageCharge || 0);
  const serviceFee = Number(paymentData.serviceFee || 0);
  const totalAmount = Number(paymentData.totalAmount || storageCharge + serviceFee);

  return {
    id: `payment-${Date.now()}`,
    requestId: request.id,
    listingId: request.listingId,
    listingTitle: request.listingTitle,
    hostName: request.hostName,
    renterName: request.renterName,
    renterEmail: request.renterEmail,
    cardholderName: paymentData.cardholderName || request.renterName,
    billingZip: paymentData.billingZip || "",
    last4: paymentData.last4 || "0000",
    cardBrand: paymentData.cardBrand || "Card",
    storageCharge,
    serviceFee,
    amount: totalAmount,
    paidAt: now,
    receiptNumber: `ST-${Date.now().toString().slice(-8)}`,
  };
}

export function buildBookingActivity(request) {
  const type = request.status === BOOKING_STATUSES.WAITLISTED ? "waitlist" : "booking";

  const statusCopy = {
    [BOOKING_STATUSES.PENDING]: "waiting for host review",
    [BOOKING_STATUSES.APPROVED]: "approved and ready for checkout",
    [BOOKING_STATUSES.WAITLISTED]: "added to the waitlist",
    [BOOKING_STATUSES.DECLINED]: "declined by the host",
    [BOOKING_STATUSES.CONFIRMED]: "confirmed after checkout",
    [BOOKING_STATUSES.ACTIVE]: "active now",
    [BOOKING_STATUSES.COMPLETED]: "completed",
    [BOOKING_STATUSES.CANCELLED]: "cancelled",
  };

  const checkoutStatuses = [
    BOOKING_STATUSES.APPROVED,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.ACTIVE,
    BOOKING_STATUSES.COMPLETED,
    BOOKING_STATUSES.CANCELLED,
  ];

  const shouldOpenCheckout = checkoutStatuses.includes(request.status);

  return {
    id: `activity-booking-${request.id}-${request.status}`,
    type,
    title: `${request.listingTitle} booking ${request.status.toLowerCase()}`,
    description: `${request.renterName}'s request for ${request.listingTitle} is ${statusCopy[request.status] || request.status.toLowerCase()}.`,
    time: request.updatedAt || request.createdAt,
    status: request.status,
    actionLabel:
      request.status === BOOKING_STATUSES.APPROVED
        ? "Continue to checkout"
        : shouldOpenCheckout
        ? "View booking"
        : "View listing",
    actionTo: shouldOpenCheckout
      ? `/checkout/${request.id}`
      : `/listing/${request.listingId}`,
    userName: request.renterName,
  };
}
