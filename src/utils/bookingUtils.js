import { BOOKING_STATUSES, PAYMENT_STATUSES } from "../constants/appEnums";
import { buildCheckoutPath, buildListingPath } from "../routes/appRoutes";
import {
  DEFAULT_BOOKING_REQUEST_MODEL,
  DEFAULT_PAYMENT_RECORD_MODEL,
  MODEL_PREFIXES,
  createModelId,
  getIsoTimestamp,
} from "../models/storetModels";
import { normalizeListing, parseNumber } from "./listingUtils";

export { BOOKING_STATUSES, PAYMENT_STATUSES };

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
  const now = new Date().toISOString();
  const createdAt = getIsoTimestamp(request.createdAt || request.submittedAt, now);
  const updatedAt = getIsoTimestamp(request.updatedAt || createdAt, createdAt);
  const requesterName =
    request.requesterName || request.renterName || request.fullName || DEFAULT_BOOKING_REQUEST_MODEL.requesterName;
  const requesterEmail =
    request.requesterEmail || request.renterEmail || request.email || DEFAULT_BOOKING_REQUEST_MODEL.requesterEmail;

  return {
    ...DEFAULT_BOOKING_REQUEST_MODEL,
    ...request,
    id: String(request.id || `booking-${index + 1}`),
    listingId: String(request.listingId || DEFAULT_BOOKING_REQUEST_MODEL.listingId),
    listingTitle: request.listingTitle || DEFAULT_BOOKING_REQUEST_MODEL.listingTitle,
    listingLocation: request.listingLocation || request.location || DEFAULT_BOOKING_REQUEST_MODEL.listingLocation,
    listingPrice: parseNumber(request.listingPrice ?? request.price, DEFAULT_BOOKING_REQUEST_MODEL.listingPrice),
    hostName: request.hostName || request.host || DEFAULT_BOOKING_REQUEST_MODEL.hostName,
    hostId: String(request.hostId || request.ownerId || DEFAULT_BOOKING_REQUEST_MODEL.hostId),
    hostEmail: request.hostEmail || request.ownerEmail || DEFAULT_BOOKING_REQUEST_MODEL.hostEmail,
    renterName: request.renterName || requesterName,
    renterEmail: request.renterEmail || requesterEmail,
    renterId: String(request.renterId || request.requesterId || requesterEmail || DEFAULT_BOOKING_REQUEST_MODEL.renterId),
    requesterName,
    requesterEmail,
    submittedAt: getIsoTimestamp(request.submittedAt || createdAt, createdAt),
    moveInDate: request.moveInDate || DEFAULT_BOOKING_REQUEST_MODEL.moveInDate,
    moveOutDate: request.moveOutDate || DEFAULT_BOOKING_REQUEST_MODEL.moveOutDate,
    duration: request.duration || DEFAULT_BOOKING_REQUEST_MODEL.duration,
    notes: request.notes || DEFAULT_BOOKING_REQUEST_MODEL.notes,
    status: request.status || BOOKING_STATUSES.PENDING,
    createdAt,
    updatedAt,
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
  const renterName =
    requestData.fullName || currentUser?.fullName || currentUser?.name || DEFAULT_BOOKING_REQUEST_MODEL.renterName;
  const renterEmail = requestData.email || currentUser?.email || "";
  const renterId = String(currentUser?.id || currentUser?.userId || renterEmail || "demo-renter");

  return normalizeBookingRequest({
    id: createModelId(MODEL_PREFIXES.BOOKING),
    listingId: normalizedListing.id,
    listingTitle: normalizedListing.title,
    listingLocation: normalizedListing.location,
    listingPrice: normalizedListing.price,
    hostName: normalizedListing.host,
    hostId: normalizedListing.hostId,
    hostEmail: normalizedListing.hostEmail,
    renterName,
    renterEmail,
    renterId,
    requesterName: renterName,
    requesterEmail: renterEmail,
    moveInDate: requestData.moveInDate || DEFAULT_BOOKING_REQUEST_MODEL.moveInDate,
    moveOutDate: requestData.moveOutDate || DEFAULT_BOOKING_REQUEST_MODEL.moveOutDate,
    duration: requestData.duration || DEFAULT_BOOKING_REQUEST_MODEL.duration,
    notes: requestData.notes || "Created from the listing details page.",
    status,
    submittedAt: now,
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
    ...DEFAULT_PAYMENT_RECORD_MODEL,
    id: createModelId(MODEL_PREFIXES.PAYMENT),
    requestId: request.id,
    listingId: request.listingId,
    listingTitle: request.listingTitle,
    hostName: request.hostName,
    hostId: request.hostId || "",
    hostEmail: request.hostEmail || "",
    renterName: request.renterName,
    renterEmail: request.renterEmail,
    renterId: request.renterId || request.requesterId || request.renterEmail || "",
    cardholderName: paymentData.cardholderName || request.renterName,
    billingZip: paymentData.billingZip || "",
    last4: paymentData.last4 || "0000",
    cardBrand: paymentData.cardBrand || "Card",
    storageCharge,
    serviceFee,
    amount: totalAmount,
    status: PAYMENT_STATUSES.PAID,
    paidAt: now,
    createdAt: now,
    updatedAt: now,
    receiptNumber: `ST-${Date.now().toString().slice(-8)}`,
  };
}

export function buildBookingActivity(request) {
  const normalizedRequest = normalizeBookingRequest(request);
  const type = normalizedRequest.status === BOOKING_STATUSES.WAITLISTED ? "waitlist" : "booking";

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

  const shouldOpenCheckout = checkoutStatuses.includes(normalizedRequest.status);

  return {
    id: `activity-booking-${normalizedRequest.id}-${normalizedRequest.status}`,
    type,
    title: `${normalizedRequest.listingTitle} booking ${normalizedRequest.status.toLowerCase()}`,
    description: `${normalizedRequest.renterName}'s request for ${normalizedRequest.listingTitle} is ${statusCopy[normalizedRequest.status] || normalizedRequest.status.toLowerCase()}.`,
    time: normalizedRequest.updatedAt || normalizedRequest.createdAt,
    status: normalizedRequest.status,
    actionLabel:
      normalizedRequest.status === BOOKING_STATUSES.APPROVED
        ? "Continue to checkout"
        : shouldOpenCheckout
        ? "View booking"
        : "View listing",
    actionTo: shouldOpenCheckout
      ? buildCheckoutPath(normalizedRequest.id)
      : buildListingPath(normalizedRequest.listingId),
    userName: normalizedRequest.renterName,
  };
}
