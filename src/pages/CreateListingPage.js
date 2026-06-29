import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
import { DEFAULT_USER_PROFILE } from "../models/storetModels";
import { APP_MODES, AVAILABILITY_STATUSES, LISTING_STATUSES } from "../constants/appEnums";
import { createListingRecord, parseNumber } from "../utils/listingUtils";
import VerifiedAddressField from "../components/VerifiedAddressField";
import AlertDialog from "../components/ui/AlertDialog";
import { getListingImageValidationMessage } from "../services/listingImageService";
import { formatPricingSummary, normalizePricing, hasAnyPricing } from "../utils/pricingUtils";
import { userCanUseRenterMode } from "../utils/roleUtils";
import { EMPTY_VERIFIED_ADDRESS, hasVerifiedCoordinates } from "../utils/addressUtils";
import { getHostPayoutStatus } from "../utils/payoutUtils";

const storageTypes = [
  "Garage",
  "Basement",
  "Spare room",
  "Storage unit",
  "Shed",
  "Warehouse",
  "Other",
];

const accessOptions = [
  "By appointment",
  "Weekly access",
  "Daily access",
  "Limited access",
  "Flexible access",
];

const amenityOptions = [
  "Indoor space",
  "Climate friendly",
  "Private access",
  "Residential space",
  "Commercial partner",
  "Good for boxes",
  "Good for furniture",
  "Student friendly",
  "Short-term friendly",
  "Long-term friendly",
];

const MAX_LISTING_IMAGES = 5;
const DEFAULT_SELECTED_AMENITIES = [
  "Indoor space",
  "Private access",
  "Good for boxes",
];

function CreateListingPage({ currentUser, onAddListing }) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = useMemo(
    () => ({
      ...DEFAULT_USER_PROFILE,
      fullName: "Demo Host",
      role: "Host",
    }),
    []
  );

  const activeUser = currentUser || storetApp?.currentUser || storedUser;
  const activeMode = storetApp?.activeMode || activeUser?.activeMode || APP_MODES.HOST;
  const isHostMode = activeMode === APP_MODES.HOST;
  const canReturnToRenterExperience = userCanUseRenterMode(activeUser);
  const hostPayoutStatus = getHostPayoutStatus(activeUser);
  const hostPayoutsReady = hostPayoutStatus.isReady;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    ...EMPTY_VERIFIED_ADDRESS,
    storageType: "Garage",
    listingType: "Private host",
    dailyRate: "",
    monthlyRate: "",
    yearlyRate: "",
    sqft: "",
    access: "By appointment",
    bookingType: "instant",
    description: "",
    customTags: "",
  });

  const [selectedAmenities, setSelectedAmenities] = useState(DEFAULT_SELECTED_AMENITIES);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutSetupIsStarting, setPayoutSetupIsStarting] = useState(false);
  const [listingWasCreated, setListingWasCreated] = useState(false);
  const leaveConfirmedRef = useRef(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [payoutInfoDialogOpen, setPayoutInfoDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const previewListing = useMemo(() => {
    const pricing = normalizePricing({
      daily: formData.dailyRate,
      monthly: formData.monthlyRate,
      yearly: formData.yearlyRate,
    });
    const sqft = parseNumber(formData.sqft, 100);

    return {
      title: formData.title.trim() || "Your storage space",
      location: formData.displayLocation || formData.location.trim() || "Cincinnati, OH",
      storageType: formData.storageType,
      listingType: formData.listingType,
      pricing,
      price: pricing.monthly || pricing.daily || pricing.yearly || 85,
      priceDisplay: formatPricingSummary(pricing),
      sqft,
      access: formData.access,
      instantBook: formData.bookingType === "instant",
      waitlist: formData.bookingType === "waitlist",
      description:
        formData.description.trim() ||
        "A flexible local storage option for renters looking for extra space.",
    };
  }, [formData]);

  const hasStartedListingDraft = useMemo(() => {
    const editableTextFields = [
      formData.title,
      formData.location,
      formData.addressLine1,
      formData.addressLine2,
      formData.city,
      formData.state,
      formData.postalCode,
      formData.formattedAddress,
      formData.displayLocation,
      formData.dailyRate,
      formData.monthlyRate,
      formData.yearlyRate,
      formData.sqft,
      formData.description,
      formData.customTags,
    ];

    const hasTextInput = editableTextFields.some((value) =>
      String(value || "").trim()
    );

    const hasChangedDefaults =
      formData.storageType !== "Garage" ||
      formData.listingType !== "Private host" ||
      formData.access !== "By appointment" ||
      formData.bookingType !== "instant";

    const hasChangedAmenities =
      selectedAmenities.length !== DEFAULT_SELECTED_AMENITIES.length ||
      selectedAmenities.some(
        (amenity) => !DEFAULT_SELECTED_AMENITIES.includes(amenity)
      );

    return Boolean(
      hasTextInput ||
        hasChangedDefaults ||
        hasChangedAmenities ||
        selectedImageFiles.length > 0 ||
        hasVerifiedCoordinates(formData)
    );
  }, [formData, selectedAmenities, selectedImageFiles.length]);

  const shouldWarnBeforeLeave =
    hasStartedListingDraft && !listingWasCreated && !isSubmitting;

  useEffect(() => {
    if (!shouldWarnBeforeLeave) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarnBeforeLeave]);

  useEffect(() => {
    if (!shouldWarnBeforeLeave || leaveConfirmedRef.current) {
      return undefined;
    }

    function handleDocumentClick(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target.closest?.("a[href]");

      if (!anchor) {
        return;
      }

      const target = anchor.getAttribute("target");
      const href = anchor.getAttribute("href");

      if (
        anchor.hasAttribute("download") ||
        (target && target !== "_self") ||
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const nextUrl = new URL(href, window.location.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation({ to: nextPath });
      setLeaveDialogOpen(true);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [shouldWarnBeforeLeave]);

  useEffect(() => {
    const payoutReturnState = new URLSearchParams(location.search).get("payout");

    if (payoutReturnState !== "return" && payoutReturnState !== "refresh") {
      return undefined;
    }

    let isMounted = true;
    const refreshHostPayoutStatus = storetApp?.actions?.refreshHostPayoutStatus;

    async function refreshAfterStripeReturn() {
      if (!refreshHostPayoutStatus) {
        return;
      }

      setError("");
      setPayoutSetupIsStarting(true);

      const result = await refreshHostPayoutStatus();

      if (isMounted && result?.error) {
        setError(result.error);
      }

      if (isMounted) {
        setPayoutSetupIsStarting(false);
        navigate(APP_ROUTES.createListing, { replace: true });
      }
    }

    refreshAfterStripeReturn();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate, storetApp?.actions]);

  useEffect(() => {
    const previewUrls = selectedImageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(previewUrls);

    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImageFiles]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleAddressInputChange(fieldName, value, options = {}) {
    setFormData((currentData) => ({
      ...currentData,
      [fieldName]: value,
      ...(options.keepVerified
        ? {}
        : {
            location: "",
            city: "",
            state: "",
            postalCode: "",
            formattedAddress: "",
            displayLocation: "",
            latitude: null,
            longitude: null,
            addressVerified: false,
            addressPlaceId: "",
            addressAccuracy: "",
          }),
    }));
  }

  function handleAddressSelected(nextAddress) {
    setFormData((currentData) => ({
      ...currentData,
      ...nextAddress,
      addressLine2: currentData.addressLine2 || nextAddress.addressLine2 || "",
      location: nextAddress.displayLocation || nextAddress.formattedAddress || "",
    }));
  }

  function handleBookingTypeChange(event, nextValue) {
    if (nextValue) {
      setFormData((currentData) => ({
        ...currentData,
        bookingType: nextValue,
      }));
    }
  }

  function handleAmenityToggle(amenity) {
    setSelectedAmenities((currentAmenities) => {
      if (currentAmenities.includes(amenity)) {
        return currentAmenities.filter((item) => item !== amenity);
      }

      return [...currentAmenities, amenity];
    });
  }

  function handleImageFilesChange(event) {
    const files = Array.from(event.target.files || []).slice(0, MAX_LISTING_IMAGES);
    const validationMessage = getListingImageValidationMessage(files);

    if (validationMessage) {
      setError(validationMessage);
      event.target.value = "";
      return;
    }

    setSelectedImageFiles(files);
    event.target.value = "";
  }

  function handleRemoveImage(indexToRemove) {
    setSelectedImageFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    );
  }

  function requestNavigation(to, options = {}) {
    if (shouldWarnBeforeLeave && !leaveConfirmedRef.current) {
      setPendingNavigation({
        to,
        beforeNavigate: options.beforeNavigate,
      });
      setLeaveDialogOpen(true);
      return;
    }

    options.beforeNavigate?.();
    navigate(to);
  }

  function handleBackToExplore() {
    requestNavigation(APP_ROUTES.explore, {
      beforeNavigate: () => storetApp?.actions?.switchActiveMode?.(APP_MODES.RENTER),
    });
  }

  function handleBackToHostDashboard() {
    requestNavigation(APP_ROUTES.hostDashboard, {
      beforeNavigate: () => storetApp?.actions?.switchActiveMode?.(APP_MODES.HOST),
    });
  }

  function handleOpenPayoutSetupInfo() {
    setError("");
    setPayoutInfoDialogOpen(true);
  }

  async function handleStartPayoutOnboarding() {
    const startPayoutOnboarding = storetApp?.actions?.startPayoutOnboarding;

    if (!startPayoutOnboarding) {
      setError("Stripe payout setup is not available yet.");
      return;
    }

    setError("");
    setPayoutSetupIsStarting(true);
    leaveConfirmedRef.current = true;

    const result = await startPayoutOnboarding({
      returnPath: `${APP_ROUTES.createListing}?payout=return`,
      refreshPath: `${APP_ROUTES.createListing}?payout=refresh`,
    });

    if (result?.error) {
      leaveConfirmedRef.current = false;
      setError(result.error);
      setPayoutSetupIsStarting(false);
    }
  }

  function handleCancel() {
    if (isHostMode) {
      handleBackToHostDashboard();
      return;
    }

    if (canReturnToRenterExperience) {
      handleBackToExplore();
      return;
    }

    requestNavigation(APP_ROUTES.profile);
  }

  function buildTags() {
    const customTags = formData.customTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const automaticTags = [
      formData.storageType,
      formData.listingType,
      formData.bookingType === "instant"
        ? "Instant book"
        : formData.bookingType === "waitlist"
        ? "Waitlist"
        : "Request-based",
    ];

    return Array.from(new Set([...automaticTags, ...customTags]));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const title = formData.title.trim();
    const location = (formData.displayLocation || formData.location || "").trim();
    const description = formData.description.trim();
    const pricing = normalizePricing({
      daily: formData.dailyRate,
      monthly: formData.monthlyRate,
      yearly: formData.yearlyRate,
    });
    const sqft = parseNumber(formData.sqft, null);

    if (!title) {
      setError("Please enter a listing title.");
      return;
    }

    if (!location || !hasVerifiedCoordinates(formData)) {
      setError("Please choose a verified address from the Mapbox suggestions so Storet can map the listing.");
      return;
    }

    if (!hasAnyPricing(pricing)) {
      setError("Please enter at least one valid daily, monthly, or yearly rate.");
      return;
    }

    if (!sqft) {
      setError("Please enter a valid square footage.");
      return;
    }

    if (!description) {
      setError("Please add a short description for the space.");
      return;
    }

    const newListing = createListingRecord({
      currentUser: activeUser,
      listingData: {
        title,
        location,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim(),
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        formattedAddress: formData.formattedAddress,
        displayLocation: formData.displayLocation || location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        addressVerified: formData.addressVerified,
        addressPlaceId: formData.addressPlaceId,
        addressAccuracy: formData.addressAccuracy,
        distance: "New listing",
        pricing,
        price: pricing.monthly || pricing.daily || pricing.yearly,
        sqft,
        storageType: formData.storageType,
        listingType: formData.listingType,
        access: formData.access,
        rating: 4.8,
        reviews: 0,
        bookingMode: formData.bookingType,
        instantBook: formData.bookingType === "instant",
        waitlist: formData.bookingType === "waitlist",
        status: hostPayoutsReady ? LISTING_STATUSES.ACTIVE : LISTING_STATUSES.DRAFT,
        availabilityStatus: hostPayoutsReady
          ? AVAILABILITY_STATUSES.AVAILABLE
          : AVAILABILITY_STATUSES.UNAVAILABLE,
        description,
        images: [],
        tags: buildTags(),
        amenities:
          selectedAmenities.length > 0
            ? selectedAmenities
            : ["Flexible rental", "Local storage", "Host managed"],
      },
    });

    const addListingAction = onAddListing || storetApp?.actions?.addListing;

    if (!addListingAction) {
      setError("We could not save your listing. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await Promise.resolve(addListingAction(newListing));

      if (result?.ok === false) {
        setError(result.error || "We could not save your listing. Please try again.");
        return;
      }

      let savedListing = result?.listing || result?.data || newListing;

      if (selectedImageFiles.length > 0) {
        const attachImagesAction = storetApp?.actions?.attachListingImages;

        if (attachImagesAction) {
          const imageResult = await attachImagesAction(savedListing.id, selectedImageFiles);

          if (imageResult?.ok === false) {
            setError(
              imageResult.error ||
                "Your listing was created, but we could not upload the photos yet."
            );
            return;
          }

          savedListing = imageResult?.listing || savedListing;
        }
      }

      leaveConfirmedRef.current = true;
      setListingWasCreated(true);
      setSuccessMessage(
        hostPayoutsReady
          ? selectedImageFiles.length > 0
            ? "Listing and photos created successfully!"
            : "Listing created successfully!"
          : selectedImageFiles.length > 0
          ? "Listing and photos saved as a draft. Set up payouts before activating it."
          : "Listing saved as a draft. Set up payouts before activating it."
      );

      setTimeout(() => {
        navigate(buildListingPath(savedListing.id));
      }, 650);
    } catch (saveError) {
      setError(saveError?.message || "We could not save your listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLeaveDialogOpenChange(open) {
    setLeaveDialogOpen(open);

    if (!open) {
      setPendingNavigation(null);
    }
  }

  function handleConfirmLeavePage() {
    const navigation = pendingNavigation;

    leaveConfirmedRef.current = true;
    setLeaveDialogOpen(false);
    setPendingNavigation(null);

    navigation?.beforeNavigate?.();

    if (navigation?.to) {
      navigate(navigation.to);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            {(isHostMode || canReturnToRenterExperience) && (
              <Button
                onClick={isHostMode ? handleBackToHostDashboard : handleBackToExplore}
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ alignSelf: "flex-start" }}
              >
                {isHostMode ? "Back to Host Dashboard" : "Back to Explore"}
              </Button>
            )}

            {!hostPayoutsReady && (
              <Alert
                severity="warning"
                icon={<PaymentsRoundedIcon />}
                sx={{
                  borderRadius: 4,
                  alignItems: "flex-start",
                  '& .MuiAlert-icon': { mt: 0.35 },
                }}
                action={
                  <Button
                    color="inherit"
                    variant="contained"
                    size="small"
                    onClick={handleOpenPayoutSetupInfo}
                    disabled={payoutSetupIsStarting || isSubmitting}
                    startIcon={
                      payoutSetupIsStarting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <OpenInNewRoundedIcon />
                      )
                    }
                    sx={{ whiteSpace: "nowrap", fontWeight: 900 }}
                  >
                    Verify identity & set up payouts
                  </Button>
                }
              >
                <Typography fontWeight={950} sx={{ mb: 0.35 }}>
                  Identity verification and payout setup are required before this listing can go live.
                </Typography>
                <Typography variant="body2">
                  You can finish this listing now, but Storet will save it as a draft.
                  Renters will not see or book it until Stripe verifies your identity and payout method.
                  Most hosts should choose Individual in Stripe unless they are listing through a registered business.
                </Typography>
              </Alert>
            )}

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1.5}>
                <Chip
                  icon={<AddHomeWorkRoundedIcon />}
                  label="Host setup"
                  color="primary"
                  variant="outlined"
                  sx={{ width: "fit-content", fontWeight: 700 }}
                />

                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: "2.25rem", md: "3.35rem" },
                      lineHeight: 1,
                    }}
                  >
                    List your storage space
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1, maxWidth: 680, fontSize: "1.05rem" }}
                  >
                    Add the basic details renters need to understand your space,
                    pricing, access, and booking style.
                  </Typography>
                </Box>
              </Stack>

              <Card sx={{ minWidth: { xs: "100%", md: 260 } }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.dark" }}>
                      <HomeWorkRoundedIcon />
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800}>
                        {activeUser?.fullName || "Demo Host"}
                      </Typography>
                      <Typography color="text.secondary">Listing as host</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Stack spacing={1}>
                      <Typography variant="h5">Listing basics</Typography>
                      <Typography color="text.secondary">
                        Start with a clear title, location, and storage type.
                      </Typography>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}
                    {successMessage && (
                      <Alert severity="success">{successMessage}</Alert>
                    )}

                    <TextField
                      label="Listing title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Example: Oakley Garage Space"
                      fullWidth
                    />

                    <Stack spacing={1}>
                      <Typography variant="h6">Verified address</Typography>
                      <Typography color="text.secondary">
                        Storet uses this verified address to place the listing on the map. Renters will see the city/neighborhood-level location publicly.
                      </Typography>
                    </Stack>

                    <VerifiedAddressField
                      address={formData}
                      onAddressInputChange={handleAddressInputChange}
                      onAddressSelected={handleAddressSelected}
                      disabled={isSubmitting}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Storage type</InputLabel>
                        <Select
                          name="storageType"
                          value={formData.storageType}
                          label="Storage type"
                          onChange={handleInputChange}
                        >
                          {storageTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Listing type</InputLabel>
                        <Select
                          name="listingType"
                          value={formData.listingType}
                          label="Listing type"
                          onChange={handleInputChange}
                        >
                          <MenuItem value="Private host">Private host</MenuItem>
                          <MenuItem value="Commercial">Commercial</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Pricing and size</Typography>
                      <Typography color="text.secondary">
                        Add any rates you want to offer. Empty rates stay hidden from renters.
                      </Typography>
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="Daily rate"
                        name="dailyRate"
                        value={formData.dailyRate}
                        onChange={handleInputChange}
                        placeholder="12"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">/day</InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Monthly rate"
                        name="monthlyRate"
                        value={formData.monthlyRate}
                        onChange={handleInputChange}
                        placeholder="85"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">/mo</InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Yearly rate"
                        name="yearlyRate"
                        value={formData.yearlyRate}
                        onChange={handleInputChange}
                        placeholder="900"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">/yr</InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Square footage"
                        name="sqft"
                        value={formData.sqft}
                        onChange={handleInputChange}
                        placeholder="120"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <StraightenRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>

                    <FormControl fullWidth>
                      <InputLabel>Access style</InputLabel>
                      <Select
                        name="access"
                        value={formData.access}
                        label="Access style"
                        onChange={handleInputChange}
                      >
                        {accessOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Booking style</Typography>
                      <Typography color="text.secondary">
                        Choose how renters should reserve or request the space.
                      </Typography>
                    </Stack>

                    <ToggleButtonGroup
                      value={formData.bookingType}
                      exclusive
                      onChange={handleBookingTypeChange}
                      color="primary"
                      fullWidth
                      sx={{
                        "& .MuiToggleButton-root": {
                          py: 1.25,
                          fontWeight: 700,
                          textTransform: "none",
                        },
                      }}
                    >
                      <ToggleButton value="instant">Instant book</ToggleButton>
                      <ToggleButton value="request">Request</ToggleButton>
                      <ToggleButton value="waitlist">Waitlist</ToggleButton>
                    </ToggleButtonGroup>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Listing photos</Typography>
                      <Typography color="text.secondary">
                        Upload up to {MAX_LISTING_IMAGES} photos. These will be stored in Supabase Storage after the listing is created.
                      </Typography>
                    </Stack>

                    <Box>
                      <input
                        id="listing-image-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        hidden
                        onChange={handleImageFilesChange}
                      />

                      <Button
                        component="label"
                        htmlFor="listing-image-upload"
                        variant="outlined"
                        startIcon={<PhotoCameraRoundedIcon />}
                        disabled={isSubmitting}
                      >
                        Choose photos
                      </Button>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        JPG, PNG, WebP, or GIF. Maximum 5 MB per photo.
                      </Typography>
                    </Box>

                    {imagePreviewUrls.length > 0 && (
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            sm: "repeat(3, minmax(0, 1fr))",
                          },
                          gap: 1.5,
                        }}
                      >
                        {imagePreviewUrls.map((url, index) => (
                          <Box
                            key={url}
                            sx={{
                              position: "relative",
                              borderRadius: 3,
                              overflow: "hidden",
                              border: "1px solid",
                              borderColor: "divider",
                              minHeight: 128,
                              bgcolor: "background.default",
                            }}
                          >
                            <Box
                              component="img"
                              src={url}
                              alt={`Listing preview ${index + 1}`}
                              sx={{
                                width: "100%",
                                height: 128,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />

                            <IconButton
                              size="small"
                              aria-label="Remove photo"
                              onClick={() => handleRemoveImage(index)}
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                bgcolor: "rgba(255,255,255,0.9)",
                                "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                              }}
                            >
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Description and amenities</Typography>
                      <Typography color="text.secondary">
                        Help renters understand what the space is best for.
                      </Typography>
                    </Stack>

                    <TextField
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe the space, what fits well, and any access details."
                      fullWidth
                      multiline
                      minRows={4}
                    />

                    <TextField
                      label="Custom tags"
                      name="customTags"
                      value={formData.customTags}
                      onChange={handleInputChange}
                      placeholder="Example: Indoor, Student friendly, Flexible"
                      helperText="Separate tags with commas."
                      fullWidth
                    />

                    <Box>
                      <Typography fontWeight={800} sx={{ mb: 1 }}>
                        Amenities
                      </Typography>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                          },
                          gap: 1,
                        }}
                      >
                        {amenityOptions.map((amenity) => (
                          <FormControlLabel
                            key={amenity}
                            control={
                              <Checkbox
                                checked={selectedAmenities.includes(amenity)}
                                onChange={() => handleAmenityToggle(amenity)}
                              />
                            }
                            label={amenity}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Divider />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      justifyContent="flex-end"
                    >
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                      >
                        {canReturnToRenterExperience ? "Cancel" : "View profile"}
                      </Button>

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={<AddHomeWorkRoundedIcon />}
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? "Saving..."
                          : hostPayoutsReady
                          ? "Create listing"
                          : "Save draft listing"}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: { xs: "100%", lg: 360 } }}>
            <Card
              sx={{
                position: { lg: "sticky" },
                top: { lg: 96 },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Listing preview</Typography>
                    <Typography color="text.secondary">
                      This is how your space will start appearing in Storet.
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: 4,
                      minHeight: 180,
                      background: imagePreviewUrls[0]
                        ? `linear-gradient(135deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.22)), url(${imagePreviewUrls[0]})`
                        : previewListing.listingType === "Commercial"
                        ? "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(37, 99, 235, 0.74))"
                        : "linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78))",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "white",
                      p: 2.5,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Chip
                      label={previewListing.listingType}
                      sx={{
                        width: "fit-content",
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: "text.primary",
                        fontWeight: 700,
                      }}
                    />

                    <Box>
                      <Typography variant="h5">{previewListing.title}</Typography>
                      <Typography sx={{ opacity: 0.9 }}>
                        Hosted by {activeUser?.fullName || "Storet Host"}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1.5}>
                    <PreviewRow
                      icon={<PlaceRoundedIcon />}
                      label="Location"
                      value={previewListing.location}
                    />
                    <PreviewRow
                      icon={<WarehouseRoundedIcon />}
                      label="Type"
                      value={previewListing.storageType}
                    />
                    <PreviewRow
                      icon={<ImageRoundedIcon />}
                      label="Photos"
                      value={
                        imagePreviewUrls.length > 0
                          ? `${imagePreviewUrls.length} selected`
                          : "No photos selected"
                      }
                    />
                    <PreviewRow
                      icon={<PaymentsRoundedIcon />}
                      label="Available rates"
                      value={previewListing.priceDisplay}
                    />
                    <PreviewRow
                      icon={<StraightenRoundedIcon />}
                      label="Size"
                      value={`${previewListing.sqft} sq ft`}
                    />
                    <PreviewRow
                      icon={<EventAvailableRoundedIcon />}
                      label="Booking"
                      value={
                        previewListing.instantBook
                          ? "Instant book"
                          : previewListing.waitlist
                          ? "Waitlist"
                          : "Request-based"
                      }
                    />
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {previewListing.description}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {buildTags().map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Stack>

                  <Alert severity="info">
                    Created listings are saved to Supabase and will appear on Explore,
                    Listing Details, and your Host Dashboard.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>

      <AlertDialog
        open={payoutInfoDialogOpen}
        onOpenChange={setPayoutInfoDialogOpen}
        title="Before you continue to Stripe"
        description="Stripe needs to verify hosts before Storet can send rental payouts. Most hosts should select Individual unless they are listing through a registered business."
        cancelText="Not now"
        actionText="Continue to Stripe"
        onAction={handleStartPayoutOnboarding}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Stripe may ask for your date of birth, SSN details, and bank account or debit card information for identity verification, tax/compliance checks, and payouts.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Storet does not collect, see, or store your SSN or bank account details. Those details are handled directly by Stripe Express.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            For professional details, we prefill the activity as renting out storage space through Storet. In local testing, Stripe may still ask for a website because it requires a real public website URL and will not accept localhost.
          </Typography>
        </Stack>
      </AlertDialog>

      <AlertDialog
        open={leaveDialogOpen}
        onOpenChange={handleLeaveDialogOpenChange}
        title="Leave listing setup?"
        description="Your listing has not been created yet. If you leave now, the details and photos you entered may be lost."
        cancelText="Keep editing"
        actionText="Leave page"
        actionColor="warning"
        onAction={handleConfirmLeavePage}
      />
    </Box>
  );
}

function PreviewRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: "primary.light",
          color: "primary.dark",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography fontWeight={800} noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default CreateListingPage;