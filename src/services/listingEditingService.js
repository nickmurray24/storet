import { createServiceError, formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { mapAppListingToDatabaseListing, mapDatabaseListingToAppListing } from "./backendMappers";
import { normalizeListing } from "../utils/listingUtils";
import { LISTING_EDIT_LOCK_STATUSES, LISTING_EDIT_LOCK_MESSAGE,
  validateListingEditForm, listingEditFormToChanges } from "../utils/listingEditingUtils";
import { listingImageService } from "./listingImageService";
import { getOrderedListingPhotos } from "../utils/listingPhotoUtils";

const EDITABLE_DATABASE_FIELDS = new Set([
  "title", "location", "address_line1", "address_line2", "city", "state", "postal_code", "country",
  "formatted_address", "display_location", "address_verified", "address_place_id", "address_accuracy",
  "latitude", "longitude", "daily_rate", "monthly_rate", "yearly_rate", "sqft", "storage_type",
  "listing_type", "access", "booking_mode", "description", "tags", "amenities", "images", "updated_at",
]);

async function loadOwnedListing(supabase, listingId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return formatServiceResponse(null, createServiceError("Please sign in to edit your listing."));
  const { data: row, error } = await supabase.from("listings").select("*")
    .eq("id", listingId).eq("host_id", user.id).maybeSingle();
  if (error) return formatServiceResponse(null, error);
  if (!row) return formatServiceResponse(null, createServiceError("This listing was not found or does not belong to your account."));
  const { data: bookings, error: bookingError } = await supabase.from("booking_requests")
    .select("id, status").eq("listing_id", listingId).in("status", LISTING_EDIT_LOCK_STATUSES).limit(1);
  if (bookingError) return formatServiceResponse(null, bookingError);
  return formatServiceResponse({ listing: normalizeListing(mapDatabaseListingToAppListing(row)),
    // Keep the database timestamp intact, including microseconds, for conflict checks.
    version: row.updated_at, userId: user.id, isLocked: Boolean(bookings?.length) });
}

export const listingEditingService = {
  async getListingForEdit(listingId) {
    const { supabase, error } = requireSupabase();
    if (error) return formatServiceResponse(null, error);
    return loadOwnedListing(supabase, listingId);
  },

  async saveListingEdit(listingId, { form, photos, expectedVersion } = {}) {
    const { supabase, error } = requireSupabase();
    if (error) return formatServiceResponse(null, error);
    const snapshot = await loadOwnedListing(supabase, listingId);
    if (snapshot.error) return snapshot;
    if (snapshot.data.isLocked) return formatServiceResponse(null,
      createServiceError(LISTING_EDIT_LOCK_MESSAGE, { editLocked: true }));
    if (!expectedVersion || snapshot.data.version !== expectedVersion) return formatServiceResponse(null,
      createServiceError("This listing changed while you were editing. Reload it before saving.", { staleEdit: true }));
    const validationError = validateListingEditForm(form, snapshot.data.listing);
    if (validationError) return formatServiceResponse(null, createServiceError(validationError));
    if (!Array.isArray(photos) || photos.length > 5) return formatServiceResponse(null, createServiceError("Choose up to five listing photos."));
    const originalUrls = getOrderedListingPhotos(snapshot.data.listing);
    if (photos.some((photo) => !photo || (!photo.file && !originalUrls.includes(photo.url)))) {
      return formatServiceResponse(null, createServiceError("The listing photos have changed. Reload this page."));
    }
    let uploadedPhotos = [];
    let saved = false;
    try {
      const newFiles = photos.filter((photo) => photo.file).map((photo) => photo.file);
      if (newFiles.length) {
        const upload = await listingImageService.uploadListingImages(newFiles, { listingId });
        uploadedPhotos = upload.data || [];
        if (upload.error) return formatServiceResponse(null, upload.error);
        if (uploadedPhotos.length !== newFiles.length) return formatServiceResponse(null, createServiceError("Some photos could not be uploaded. Please try again."));
      }
      let newPhotoIndex = 0;
      const images = photos.map((photo) => photo.file ? uploadedPhotos[newPhotoIndex++].url : photo.url);
      const mapped = mapAppListingToDatabaseListing({ ...listingEditFormToChanges(form), images });
      const payload = Object.fromEntries(Object.entries(mapped).filter(([key]) => EDITABLE_DATABASE_FIELDS.has(key)));
      const listing = snapshot.data.listing;
      // Keep drafts, pauses, occupied listings and completion decisions hidden.
      if (listing.status === "active" && ["available", "waitlist"].includes(listing.availabilityStatus)) {
        payload.availability_status = form.bookingMode === "waitlist" ? "waitlist" : "available";
      }
      const { data: row, error: updateError } = await supabase.from("listings").update(payload)
        .eq("id", listingId).eq("host_id", snapshot.data.userId)
        .eq("updated_at", expectedVersion).select("*").maybeSingle();
      if (updateError) {
        const isLocked = updateError.message?.includes("LISTING_EDIT_LOCKED");
        return formatServiceResponse(null, isLocked ? createServiceError(LISTING_EDIT_LOCK_MESSAGE, { editLocked: true }) : updateError);
      }
      if (!row) return formatServiceResponse(null, createServiceError("This listing changed while you were editing. Reload it before saving.", { staleEdit: true }));
      saved = true;
      return formatServiceResponse(normalizeListing(mapDatabaseListingToAppListing(row)));
    } finally {
      // Only remove newly uploaded files when saving failed. Existing photos stay intact.
      if (!saved && uploadedPhotos.length) {
        try { await supabase.storage.from("listing-images").remove(uploadedPhotos.map((photo) => photo.path)); }
        catch { /* A cleanup failure must not hide the original save error. */ }
      }
    }
  },
};
