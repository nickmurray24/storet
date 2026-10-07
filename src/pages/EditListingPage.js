import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Container,
  FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { useStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES } from "../routes/appRoutes";
import VerifiedAddressField from "../components/VerifiedAddressField";
import ListingPhotoOrderEditor from "../components/ListingPhotoOrderEditor";
import AlertDialog from "../components/ui/AlertDialog";
import { listingEditingService } from "../services/listingEditingService";
import { getListingImageValidationMessage } from "../services/listingImageService";
import { getOrderedListingPhotos, moveListingPhoto } from "../utils/listingPhotoUtils";
import { EMPTY_VERIFIED_ADDRESS } from "../utils/addressUtils";
import { createListingEditForm, getListingEditLock, LISTING_EDIT_LOCK_MESSAGE,
  validateListingEditForm } from "../utils/listingEditingUtils";

const STORAGE_TYPES = ["Garage", "Basement", "Spare room", "Storage unit", "Shed", "Warehouse", "Other"];
const ACCESS_OPTIONS = ["By appointment", "Weekly access", "Daily access", "Limited access", "Flexible access"];
const AMENITIES = ["Indoor space", "Climate friendly", "Private access", "Residential space", "Commercial partner",
  "Good for boxes", "Good for furniture", "Student friendly", "Short-term friendly", "Long-term friendly"];

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const app = useStoretApp();
  const [listing, setListing] = useState(null);
  const [version, setVersion] = useState("");
  const [form, setForm] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [remoteLocked, setRemoteLocked] = useState(false);
  const [error, setError] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const initialForm = useRef("");
  const initialPhotos = useRef("");
  const objectUrls = useRef(new Set());
  const leaveConfirmed = useRef(false);
  const localLock = getListingEditLock(listing, app.hostBookingRequests);
  const locked = remoteLocked || localLock.isLocked;
  const disabled = locked || isSaving || Boolean(app.activityIsLoading) || needsReload;
  const dirty = Boolean(form && (JSON.stringify(form) !== initialForm.current ||
    JSON.stringify(photos.map((photo) => photo.url)) !== initialPhotos.current));

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError("");
    setListing(null);
    setForm(null);
    setPhotos([]);
    setVersion("");
    async function load() {
      try {
        const response = await listingEditingService.getListingForEdit(id);
        if (!mounted) return;
        if (response.error) {
          setError(response.error.message || "Could not load this listing.");
          setListing(null);
          return;
        }
        const nextListing = response.data.listing;
        const nextForm = createListingEditForm(nextListing);
        const urls = getOrderedListingPhotos(nextListing);
        setListing(nextListing);
        setVersion(response.data.version);
        setForm(nextForm);
        setPhotos(urls.map((url) => ({ url, file: null })));
        setRemoteLocked(response.data.isLocked);
        setNeedsReload(false);
        initialForm.current = JSON.stringify(nextForm);
        initialPhotos.current = JSON.stringify(urls);
      } catch {
        if (mounted) setError("Could not load this listing. Please try again.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, app.currentUser?.id]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    function warnBeforeUnload(event) {
      if (leaveConfirmed.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function handleLink(event) {
      if (leaveConfirmed.current || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin || next.href === window.location.href) return;
      event.preventDefault();
      if (!isSaving) setPendingNavigation({ to: `${next.pathname}${next.search}${next.hash}` });
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", handleLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", handleLink, true);
    };
  }, [dirty, isSaving]);

  function leave(action) {
    if (isSaving) return;
    if (dirty && !leaveConfirmed.current) setPendingNavigation(action);
    else performNavigation(action);
  }
  function performNavigation(action) {
    if (!action) return;
    leaveConfirmed.current = true;
    if (action.reload) window.location.reload();
    else navigate(action.to);
  }
  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }
  function selectPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (photos.length + files.length > 5) {
      setError("A listing can have up to five photos. Remove a photo before adding more.");
      return;
    }
    const message = getListingImageValidationMessage(files);
    if (message) { setError(message); return; }
    const added = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { url, file };
    });
    setPhotos((current) => [...current, ...added]);
    setError("");
  }
  function removePhoto(index) {
    const photo = photos[index];
    if (photo.file) {
      URL.revokeObjectURL(photo.url);
      objectUrls.current.delete(photo.url);
    }
    setPhotos((current) => current.filter((_, position) => position !== index));
  }
  async function save(event) {
    event.preventDefault();
    if (disabled || !dirty) return;
    const validation = validateListingEditForm(form, listing);
    if (validation) { setError(validation); return; }
    setError("");
    setIsSaving(true);
    try {
      const result = await app.actions.editListing(id, { form, photos, expectedVersion: version });
      if (!result?.ok) {
        setError(result?.error || "Could not save your changes. Please try again.");
        if (result?.editLocked) setRemoteLocked(true);
        if (result?.staleEdit) setNeedsReload(true);
        return;
      }
      leaveConfirmed.current = true;
      navigate(APP_ROUTES.hostDashboard, { state: { listingEdited: result.listing.id } });
    } catch {
      setError("Could not save your changes. Please try again.");
    } finally { setIsSaving(false); }
  }
  function textField(name, label, extra = {}) {
    return <TextField key={name} name={name} label={label} value={form[name]} onChange={updateField}
      disabled={disabled} fullWidth {...extra} />;
  }

  if (isLoading) return <Box sx={{ minHeight: "55vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (!listing || !form) return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error || "Listing not found."}</Alert>
      <Button variant="outlined" onClick={() => navigate(APP_ROUTES.hostDashboard)}>Back to Host Dashboard</Button>
    </Container>
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <AlertDialog open={Boolean(pendingNavigation)} onOpenChange={(open) => { if (!open) setPendingNavigation(null); }}
        title="Discard listing changes?" description="Your changes have not been saved."
        cancelText="Keep editing" actionText="Discard changes" onAction={() => performNavigation(pendingNavigation)} />
      <Stack spacing={3}>
        <Box>
          <Button startIcon={<ArrowBackRoundedIcon />} disabled={isSaving}
            onClick={() => leave({ to: APP_ROUTES.hostDashboard })}>Back to Host Dashboard</Button>
          <Chip label="Edit listing" color="primary" sx={{ display: "flex", width: "fit-content", mt: 2, mb: 1 }} />
          <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}>Update your space.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Keep your listing details and photos up to date.</Typography>
        </Box>
        {locked && <Alert severity="warning">{LISTING_EDIT_LOCK_MESSAGE} Editing becomes available after the booking is completed or cancelled.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {(locked || needsReload) && <Button variant="outlined" sx={{ alignSelf: "flex-start" }}
          onClick={() => leave({ reload: true })}>Reload listing</Button>}
        <Box component="form" onSubmit={save}>
          <Stack spacing={3}>
            <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2.5}>
              <Typography variant="h5">Space details</Typography>
              {textField("title", "Listing title", { required: true })}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                {textField("storageType", "Space type", { select: true, children: Array.from(new Set([...STORAGE_TYPES, form.storageType])).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>) })}
                {textField("listingType", "Listing type", { select: true, children: ["Private host", "Commercial"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>) })}
                {textField("sqft", "Square footage", { type: "number", required: true, inputProps: { min: 1, step: 1 } })}
                {textField("access", "Access", { select: true, children: Array.from(new Set([...ACCESS_OPTIONS, form.access])).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>) })}
              </Box>
              {textField("description", "Description", { multiline: true, minRows: 4, required: true })}
              {textField("customTags", "Tags", { helperText: "Separate tags with commas." })}
              <Typography fontWeight={800}>Amenities</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                {Array.from(new Set([...AMENITIES, ...form.amenities])).map((amenity) =>
                  <FormControlLabel key={amenity} label={amenity} control={<Checkbox disabled={disabled}
                    checked={form.amenities.includes(amenity)} onChange={() => setForm((current) => ({ ...current,
                      amenities: current.amenities.includes(amenity) ? current.amenities.filter((value) => value !== amenity) : [...current.amenities, amenity] }))} />} />)}
              </Box>
            </Stack></CardContent></Card>
            <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2.5}>
              <Typography variant="h5">Location</Typography>
              <VerifiedAddressField address={form} disabled={disabled}
                onAddressInputChange={(value) => setForm((current) => ({ ...current, ...EMPTY_VERIFIED_ADDRESS,
                  addressLine1: value, addressLine2: current.addressLine2, location: "" }))}
                onAddressSelected={(address) => setForm((current) => ({ ...current, ...address,
                  addressLine2: current.addressLine2 || "", location: address.displayLocation || address.formattedAddress }))} />
              {textField("addressLine2", "Unit, suite, or apartment (optional)")}
            </Stack></CardContent></Card>
            <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2.5}>
              <Typography variant="h5">Pricing and booking</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
                {textField("dailyRate", "Daily rate ($)", { type: "number", inputProps: { min: 0.01, step: 0.01 } })}
                {textField("monthlyRate", "Monthly rate ($)", { type: "number", inputProps: { min: 0.01, step: 0.01 } })}
                {textField("yearlyRate", "Yearly rate ($)", { type: "number", inputProps: { min: 0.01, step: 0.01 } })}
              </Box>
              {textField("bookingMode", "Booking type", { select: true, children: [
                ["request", "Request approval"], ["instant", "Instant book"], ["waitlist", "Waitlist"],
              ].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>) })}
            </Stack></CardContent></Card>
            <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}>
              <Typography variant="h5">Listing photos</Typography>
              <Typography color="text.secondary">Add, remove, or reorder up to five photos. The first photo is your cover.</Typography>
              <Button component="label" variant="outlined" startIcon={<PhotoCameraRoundedIcon />}
                disabled={disabled || photos.length >= 5} sx={{ alignSelf: "flex-start" }}>
                Add photos
                <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={disabled || photos.length >= 5} onChange={selectPhotos} />
              </Button>
              <ListingPhotoOrderEditor imageUrls={photos.map((photo) => photo.url)} labels={photos.map((photo) => photo.file?.name || "")}
                disabled={disabled} onRemove={removePhoto} onMove={(from, to) => setPhotos((current) => moveListingPhoto(current, from, to))} />
              {!photos.length && <Typography color="text.secondary">No photos selected.</Typography>}
            </Stack></CardContent></Card>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" disabled={isSaving} onClick={() => leave({ to: APP_ROUTES.hostDashboard })}>Cancel</Button>
              <Button type="submit" variant="contained" size="large" disabled={disabled || !dirty}
                startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
