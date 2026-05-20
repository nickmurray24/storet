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

export function normalizeListing(listing = {}, index = 0) {
  const price = parseNumber(
    listing.price ??
      listing.monthlyPrice ??
      listing.monthlyRate ??
      listing.pricePerMonth ??
      listing.rate,
    75
  );

  const sqft = parseNumber(
    listing.sqft ??
      listing.squareFeet ??
      listing.sizeSqft ??
      listing.squareFootage ??
      listing.size,
    100
  );

  const listingType =
    listing.listingType ??
    listing.hostType ??
    (listing.isCommercial ? "Commercial" : "Private host");

  const instantBook = Boolean(
    listing.instantBook ??
      listing.instantBooking ??
      (listing.bookingType === "instant") ??
      false
  );

  const waitlist = Boolean(
    listing.waitlist ??
      listing.hasWaitlist ??
      (listing.availability === "waitlist") ??
      false
  );

  return {
    ...listing,
    id: String(listing.id ?? `listing-${index + 1}`),
    title: listing.title ?? listing.name ?? "Storage space",
    location: listing.location ?? listing.address ?? "Cincinnati, OH",
    distance: listing.distance ?? "Nearby",
    price,
    sqft,
    storageType: listing.storageType ?? listing.type ?? "Storage space",
    listingType,
    access: listing.access ?? "Flexible access",
    rating: Number(listing.rating ?? 4.8),
    reviews: Number(listing.reviews ?? listing.reviewCount ?? 0),
    instantBook,
    waitlist,
    host: listing.host ?? listing.hostName ?? "Storet Host",
    description:
      listing.description ??
      "Flexible local storage space for short-term or long-term needs.",
    tags: Array.isArray(listing.tags) ? listing.tags : [],
    amenities: Array.isArray(listing.amenities)
      ? listing.amenities
      : ["Flexible rental", "Local storage", "Host managed"],
    createdAt: listing.createdAt ?? new Date().toISOString(),
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
