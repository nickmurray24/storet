import { BOOKING_STATUSES } from "../constants/appEnums";
import { hasVerifiedCoordinates } from "./addressUtils";

export const LISTING_EDIT_LOCK_STATUSES = [
  BOOKING_STATUSES.APPROVED, BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE,
];
export const LISTING_EDIT_LOCK_MESSAGE = "This listing cannot be edited while a booking is Approved, Confirmed, or Active.";
export const LISTING_EDIT_ADDRESS_FIELDS = [
  "addressLine1", "addressLine2", "city", "state", "postalCode", "country", "formattedAddress",
  "displayLocation", "latitude", "longitude", "addressVerified", "addressPlaceId", "addressAccuracy",
];

export function getListingEditLock(listing, bookings = []) {
  const booking = (Array.isArray(bookings) ? bookings : []).find((item) =>
    String(item.listingId || item.listing_id) === String(listing?.id) &&
    LISTING_EDIT_LOCK_STATUSES.includes(item.status));
  return { isLocked: Boolean(booking), booking, message: booking ? LISTING_EDIT_LOCK_MESSAGE : "" };
}

export function buildEditListingPath(listingId) {
  return `/host/listings/${encodeURIComponent(listingId)}/edit`;
}

export function createListingEditForm(listing) {
  const form = {
    title: listing.title || "", location: listing.location || "",
    storageType: listing.storageType || "Other", listingType: listing.listingType || "Private host",
    access: listing.access || "By appointment", bookingMode: listing.bookingMode || "request",
    dailyRate: listing.pricing?.daily ?? "", monthlyRate: listing.pricing?.monthly ?? "",
    yearlyRate: listing.pricing?.yearly ?? "", sqft: listing.sqft ?? "", description: listing.description || "",
    customTags: (listing.tags || []).join(", "), amenities: [...(listing.amenities || [])],
  };
  for (const key of LISTING_EDIT_ADDRESS_FIELDS) form[key] = listing[key] ?? (key === "country" ? "US" : "");
  return form;
}

export function validateListingEditForm(form, originalListing) {
  if (!form?.title?.trim()) return "Please enter a listing title.";
  if (!form?.description?.trim()) return "Please add a description for the space.";
  if (!Number.isInteger(Number(form.sqft)) || Number(form.sqft) <= 0) return "Square footage must be a positive whole number.";
  const rates = [form.dailyRate, form.monthlyRate, form.yearlyRate];
  if (rates.some((rate) => rate !== "" && rate !== null && rate !== undefined &&
      (!Number.isFinite(Number(rate)) || Number(rate) <= 0))) return "Rates must be positive numbers, or left blank.";
  if (!rates.some((rate) => Number(rate) > 0)) return "Please enter at least one daily, monthly, or yearly rate.";
  const originalForm = createListingEditForm(originalListing);
  const addressChanged = LISTING_EDIT_ADDRESS_FIELDS.some((key) => form[key] !== originalForm[key]);
  if (addressChanged && !hasVerifiedCoordinates(form)) return "Choose a verified address from the address suggestions.";
  if (!form.storageType?.trim() || !form.access?.trim()) return "Please choose the space type and access option.";
  if (!["Private host", "Commercial"].includes(form.listingType)) return "Please choose a valid listing type.";
  if (!["request", "instant", "waitlist"].includes(form.bookingMode)) return "Please choose a valid booking type.";
  return "";
}

export function listingEditFormToChanges(form) {
  const changes = {
    title: form.title.trim(), location: form.displayLocation || form.location,
    storageType: form.storageType, listingType: form.listingType, access: form.access,
    bookingMode: form.bookingMode, sqft: Number(form.sqft), description: form.description.trim(),
    pricing: { daily: form.dailyRate === "" ? null : Number(form.dailyRate),
      monthly: form.monthlyRate === "" ? null : Number(form.monthlyRate),
      yearly: form.yearlyRate === "" ? null : Number(form.yearlyRate) },
    tags: Array.from(new Set(form.customTags.split(",").map((tag) => tag.trim()).filter(Boolean))),
    amenities: [...form.amenities],
  };
  for (const key of LISTING_EDIT_ADDRESS_FIELDS) changes[key] = form[key];
  return changes;
}
