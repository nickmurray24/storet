import {
  AVAILABILITY_STATUSES,
  BOOKING_MODES,
  LISTING_STATUSES,
  LISTING_TYPES,
} from "../constants/appEnums";
import {
  DEFAULT_LISTING_MODEL,
  MODEL_PREFIXES,
  createModelId,
  getIsoTimestamp,
} from "../models/storetModels";

export { AVAILABILITY_STATUSES, BOOKING_MODES, LISTING_STATUSES, LISTING_TYPES };

export function parseNumber(value, fallbackValue) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    const parsedValue = Number(cleanedValue);

    if (!Number.isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return fallbackValue;
}

export function normalizeSavedIds(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value instanceof Set) {
    return Array.from(value).map(String);
  }

  if (value && Array.isArray(value.ids)) {
    return value.ids.map(String);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, isSaved]) => Boolean(isSaved))
      .map(([id]) => String(id));
  }

  return [];
}

export function getListingBookingMode(listing = {}) {
  if (listing.bookingMode) {
    return listing.bookingMode;
  }

  if (listing.waitlist || listing.availability === AVAILABILITY_STATUSES.WAITLIST) {
    return BOOKING_MODES.WAITLIST;
  }

  if (listing.instantBook || listing.instantBooking || listing.bookingType === BOOKING_MODES.INSTANT) {
    return BOOKING_MODES.INSTANT;
  }

  return BOOKING_MODES.REQUEST;
}

export function getListingAvailabilityStatus(listing = {}) {
  if (listing.availabilityStatus) {
    return listing.availabilityStatus;
  }

  if (listing.waitlist || listing.availability === AVAILABILITY_STATUSES.WAITLIST) {
    return AVAILABILITY_STATUSES.WAITLIST;
  }

  if (listing.status === LISTING_STATUSES.PAUSED || listing.status === LISTING_STATUSES.ARCHIVED) {
    return AVAILABILITY_STATUSES.UNAVAILABLE;
  }

  return AVAILABILITY_STATUSES.AVAILABLE;
}

export function normalizeListing(listing = {}, index = 0) {
  const now = new Date().toISOString();
  const createdAt = getIsoTimestamp(listing.createdAt, now);
  const updatedAt = getIsoTimestamp(listing.updatedAt || listing.createdAt, createdAt);

  const price = parseNumber(
    listing.price ??
      listing.monthlyPrice ??
      listing.monthlyRate ??
      listing.pricePerMonth ??
      listing.rate,
    DEFAULT_LISTING_MODEL.price
  );

  const sqft = parseNumber(
    listing.sqft ??
      listing.squareFeet ??
      listing.sizeSqft ??
      listing.squareFootage ??
      listing.size,
    DEFAULT_LISTING_MODEL.sqft
  );

  const listingType =
    listing.listingType ??
    listing.hostType ??
    (listing.isCommercial ? LISTING_TYPES.COMMERCIAL : LISTING_TYPES.PRIVATE_HOST);

  const bookingMode = getListingBookingMode(listing);
  const instantBook = Boolean(
    listing.instantBook ??
      listing.instantBooking ??
      bookingMode === BOOKING_MODES.INSTANT
  );
  const waitlist = Boolean(
    listing.waitlist ??
      listing.hasWaitlist ??
      (listing.availability === AVAILABILITY_STATUSES.WAITLIST ||
        bookingMode === BOOKING_MODES.WAITLIST)
  );

  const hostName = listing.host ?? listing.hostName ?? DEFAULT_LISTING_MODEL.host;
  const hostEmail = listing.hostEmail ?? listing.ownerEmail ?? "";
  const hostId = String(
    listing.hostId ?? listing.ownerId ?? listing.createdBy ?? hostEmail ?? ""
  );

  return {
    ...DEFAULT_LISTING_MODEL,
    ...listing,
    id: String(listing.id ?? createModelId(MODEL_PREFIXES.LISTING) ?? `listing-${index + 1}`),
    title: listing.title ?? listing.name ?? DEFAULT_LISTING_MODEL.title,
    location: listing.location ?? listing.address ?? DEFAULT_LISTING_MODEL.location,
    distance: listing.distance ?? DEFAULT_LISTING_MODEL.distance,
    price,
    sqft,
    size: listing.size ?? `${sqft} sq ft`,
    storageType: listing.storageType ?? listing.type ?? DEFAULT_LISTING_MODEL.storageType,
    type: listing.type ?? listing.storageType ?? DEFAULT_LISTING_MODEL.storageType,
    listingType,
    access: listing.access ?? DEFAULT_LISTING_MODEL.access,
    rating: Number(listing.rating ?? listing.averageRating ?? DEFAULT_LISTING_MODEL.rating),
    averageRating: Number(listing.averageRating ?? listing.rating ?? DEFAULT_LISTING_MODEL.rating),
    reviews: Number(listing.reviews ?? listing.reviewCount ?? DEFAULT_LISTING_MODEL.reviews),
    reviewCount: Number(listing.reviewCount ?? listing.reviews ?? DEFAULT_LISTING_MODEL.reviews),
    instantBook,
    waitlist,
    bookingMode,
    availability: listing.availability || (waitlist ? "Waitlist" : "Available"),
    availabilityStatus: getListingAvailabilityStatus({ ...listing, waitlist, bookingMode }),
    status: listing.status || LISTING_STATUSES.ACTIVE,
    host: hostName,
    hostName,
    hostId,
    hostEmail,
    ownerId: String(listing.ownerId ?? hostId),
    ownerEmail: listing.ownerEmail ?? hostEmail,
    createdBy: String(listing.createdBy ?? hostId),
    description:
      listing.description ??
      DEFAULT_LISTING_MODEL.description,
    tags: Array.isArray(listing.tags) ? listing.tags : [],
    amenities: Array.isArray(listing.amenities)
      ? listing.amenities
      : DEFAULT_LISTING_MODEL.amenities,
    images: Array.isArray(listing.images) ? listing.images : [],
    createdAt,
    updatedAt,
  };
}

export function normalizeListingList(listings) {
  const safeListings = Array.isArray(listings) ? listings : [];
  const seenIds = new Set();

  return safeListings.map(normalizeListing).filter((listing) => {
    if (seenIds.has(listing.id)) {
      return false;
    }

    seenIds.add(listing.id);
    return true;
  });
}

export function createListingRecord({ listingData = {}, currentUser = null }) {
  const now = new Date().toISOString();
  const hostName = currentUser?.fullName || currentUser?.name || listingData.host || "Storet Host";
  const hostEmail = currentUser?.email || listingData.hostEmail || "";
  const hostId = String(currentUser?.id || currentUser?.userId || hostEmail || "demo-host");

  return normalizeListing({
    ...listingData,
    id: listingData.id || createModelId(MODEL_PREFIXES.LISTING),
    host: hostName,
    hostName,
    hostEmail,
    hostId,
    ownerId: hostId,
    ownerEmail: hostEmail,
    createdBy: hostId,
    createdAt: listingData.createdAt || now,
    updatedAt: now,
  });
}
