import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import Dialog from "./ui/Dialog";
import ListingPhotoOrderEditor from "./ListingPhotoOrderEditor";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { getOrderedListingPhotos, moveListingPhoto } from "../utils/listingPhotoUtils";

export default function ListingPhotoOrderDialog({ listing, onClose }) {
  const storetApp = useOptionalStoretApp();
  const [photos, setPhotos] = useState(() => getOrderedListingPhotos(listing));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const originalPhotos = getOrderedListingPhotos(listing);
  const hasChanges = photos.some((url, index) => url !== originalPhotos[index]);

  async function handleSave() {
    if (isSaving) return;
    const saveOrder = storetApp?.actions?.reorderListingImages;
    if (!saveOrder) {
      setError("Photo ordering is not available. Please restart Storet after applying the patch.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const result = await saveOrder(listing.id, photos);
      if (!result?.ok) setError(result?.error || "Could not save photo order. Please try again.");
      else onClose();
    } catch {
      setError("Could not save photo order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }} maxWidth="sm">
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" component="h2">Order listing photos</Typography>
          <Typography color="text.secondary">{listing.title}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <ListingPhotoOrderEditor imageUrls={photos} disabled={isSaving}
            onMove={(from, to) => setPhotos((current) => moveListingPhoto(current, from, to))} />
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
            <Button variant="contained" disabled={isSaving || !hasChanges} onClick={handleSave}>{isSaving ? "Saving..." : "Save photo order"}</Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
