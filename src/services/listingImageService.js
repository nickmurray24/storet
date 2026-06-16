import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";

export const LISTING_IMAGES_BUCKET = "listing-images";

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function sanitizeFilename(filename = "listing-photo") {
  const cleanedName = String(filename)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanedName || "listing-photo";
}

function validateImageFiles(files = []) {
  const safeFiles = Array.from(files || []).slice(0, MAX_IMAGE_COUNT);

  if (safeFiles.length === 0) {
    return {
      files: [],
      error: null,
    };
  }

  const invalidFile = safeFiles.find((file) => {
    const mimeType = file?.type || "";
    return !ALLOWED_IMAGE_TYPES.includes(mimeType);
  });

  if (invalidFile) {
    return {
      files: [],
      error: `"${invalidFile.name}" is not a supported image type. Please use JPG, PNG, WebP, or GIF.`,
    };
  }

  const oversizedFile = safeFiles.find((file) => file?.size > MAX_IMAGE_SIZE_BYTES);

  if (oversizedFile) {
    return {
      files: [],
      error: `"${oversizedFile.name}" is too large. Please keep each image under 5 MB.`,
    };
  }

  return {
    files: safeFiles,
    error: null,
  };
}

export function getListingImageValidationMessage(files = []) {
  const { error } = validateImageFiles(files);
  return error;
}

export const listingImageService = {
  async uploadListingImages(files = [], { listingId } = {}) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    if (!listingId) {
      return formatServiceResponse([], {
        message: "We need a saved listing before uploading photos.",
      });
    }

    const validation = validateImageFiles(files);

    if (validation.error) {
      return formatServiceResponse([], {
        message: validation.error,
      });
    }

    if (validation.files.length === 0) {
      return formatServiceResponse([]);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse([], userError || {
        message: "Please sign in before uploading listing photos.",
      });
    }

    const uploadedImages = [];

    for (const [index, file] of validation.files.entries()) {
      const safeFilename = sanitizeFilename(file.name);
      const imagePath = `${user.id}/${listingId}/${Date.now()}-${index}-${safeFilename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        return formatServiceResponse(uploadedImages, uploadError);
      }

      const { data: publicUrlData } = supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .getPublicUrl(uploadData.path);

      uploadedImages.push({
        path: uploadData.path,
        url: publicUrlData?.publicUrl || "",
      });
    }

    return formatServiceResponse(uploadedImages);
  },
};
