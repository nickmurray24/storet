import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Rating,
  Stack,
  Typography,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import ContactHostForm from "../components/ContactHostForm";
import Dialog from "../components/ui/Dialog";
import ReviewForm from "../components/ReviewForm";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { BOOKING_STATUSES } from "../utils/bookingUtils";
import { APP_MODES, LISTING_STATUSES, PRICING_PERIODS } from "../constants/appEnums";
import {
  canCheckoutBookingRequest,
  getBookingRequestCheckoutPath,
  getLatestBookingRequestForListing,
  hasOpenBookingRequest,
} from "../utils/bookingSelectors";
import { getPageListings } from "../data/listingCatalog";
import { APP_ROUTES } from "../routes/appRoutes";
import { normalizeSavedIds } from "../utils/listingUtils";
import { getAvailablePricingOptions, getPricingOptionByPeriod } from "../utils/pricingUtils";
import { getEligibleReviewRequest, getReviewSummary } from "../utils/reviewUtils";
import {
  getStoredCurrentUser,
  readSavedListingIds,
  readUserListings,
  writeSavedListingIds,
} from "../utils/storage";

function ListingDetailsPage({
  listings,
  currentUser,
  savedListingIds,
  bookingRequests,
  onToggleSave,
  onSaveToggle,
  onSubmitBookingRequest,
  onSubmitHostMessage,
}) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const params = useParams();
  const routeListingId = String(params.id || params.listingId || "");

  const storedUser = getStoredCurrentUser();
  const guestUser = {
    fullName: "Guest",
    role: "Renter",
    isAuthenticated: false,
  };

  const activeUser =
    currentUser ||
    storetApp?.currentUser ||
    (storedUser?.isAuthenticated ? storedUser : guestUser);
  const isAuthenticated = Boolean(activeUser?.isAuthenticated);
  const activeMode = storetApp?.activeMode || activeUser?.activeMode || APP_MODES.RENTER;
  const isHostMode = activeMode === APP_MODES.HOST;
  const listingBackRoute = isHostMode ? APP_ROUTES.hostDashboard : APP_ROUTES.explore;
  const listingBackLabel = isHostMode ? "Back to Host Dashboard" : "Back to Explore";
  const userListings = useMemo(() => {
    if (Array.isArray(storetApp?.userListings)) {
      return storetApp.userListings;
    }

    return readUserListings();
  }, [storetApp?.userListings]);

  const contextListings = Array.isArray(storetApp?.listings)
    ? storetApp.listings
    : undefined;

  const allListings = useMemo(() => {
    return getPageListings(listings ?? contextListings, userListings);
  }, [contextListings, listings, userListings]);

  const listing = useMemo(() => {
    return allListings.find((item) => String(item.id) === routeListingId);
  }, [allListings, routeListingId]);

  const hasExternalSavedIds =
    savedListingIds !== undefined || storetApp?.savedListingIds !== undefined;
  const savedIdsFromProps = normalizeSavedIds(
    savedListingIds ?? storetApp?.savedListingIds
  );

  const [localSavedIds, setLocalSavedIds] = useState(() =>
    readSavedListingIds()
  );

  const activeSavedIds = hasExternalSavedIds
    ? savedIdsFromProps
    : localSavedIds;

  const isSaved = listing
    ? activeSavedIds.includes(String(listing.id))
    : false;

  const [bookingStatus, setBookingStatus] = useState("");
  const [submittedBookingRequest, setSubmittedBookingRequest] = useState(null);
  const [selectedRatePeriod, setSelectedRatePeriod] = useState("");
  const [bookingIsSubmitting, setBookingIsSubmitting] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(null);

  const activeBookingRequests = useMemo(
    () => bookingRequests ?? storetApp?.bookingRequests ?? [],
    [bookingRequests, storetApp?.bookingRequests]
  );

  const latestListingRequest = useMemo(() => {
    if (!listing) {
      return null;
    }

    return getLatestBookingRequestForListing(
      activeBookingRequests,
      listing.id,
      activeUser
    );
  }, [activeBookingRequests, activeUser, listing]);

  const pricingOptions = useMemo(() => {
    return listing ? getAvailablePricingOptions(listing.pricing) : [];
  }, [listing]);

  const defaultRatePeriod =
    pricingOptions.find((option) => option.period === PRICING_PERIODS.MONTHLY)?.period ||
    pricingOptions[0]?.period ||
    "";

  const selectedPricingOption = getPricingOptionByPeriod(
    listing?.pricing,
    selectedRatePeriod || defaultRatePeriod
  );

  const listingReviews = useMemo(() => {
    return storetApp?.reviewsByListingId?.[routeListingId] || [];
  }, [routeListingId, storetApp?.reviewsByListingId]);

  const eligibleReviewRequest = useMemo(() => {
    return getEligibleReviewRequest({
      listingId: routeListingId,
      bookingRequests: activeBookingRequests,
      reviews: listingReviews,
      currentUser: activeUser,
    });
  }, [activeBookingRequests, activeUser, listingReviews, routeListingId]);

  useEffect(() => {
    if (!routeListingId || !storetApp?.actions?.loadListingReviews) {
      return;
    }

    storetApp.actions.loadListingReviews(routeListingId);
    // The context action object is recreated as state changes, so listing id is the only trigger we want here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeListingId]);

  function handleSaveClick() {
    if (!listing) return;

    if (!isAuthenticated) {
      navigate(APP_ROUTES.auth, {
        state: {
          from: `/listing/${routeListingId}`,
          reason: "save-listing",
        },
      });
      return;
    }

    const toggleSaveAction =
      onToggleSave || onSaveToggle || storetApp?.actions?.toggleSave;

    if (toggleSaveAction) {
      toggleSaveAction(listing.id);
      return;
    }

    setLocalSavedIds((currentIds) => {
      const normalizedId = String(listing.id);
      const nextIds = currentIds.includes(normalizedId)
        ? currentIds.filter((id) => id !== normalizedId)
        : [...currentIds, normalizedId];

      writeSavedListingIds(nextIds);
      return nextIds;
    });
  }

  function handleSubmitHostMessage(messageData) {
    if (!listing) {
      return {
        ok: false,
        error: "We could not find that listing.",
      };
    }

    if (!isAuthenticated) {
      return {
        ok: false,
        error: "Please sign in before messaging a host.",
      };
    }

    const submitHostMessageAction =
      onSubmitHostMessage || storetApp?.actions?.submitHostMessage;

    if (submitHostMessageAction) {
      return submitHostMessageAction(listing, messageData);
    }

    return { ok: true };
  }

  async function handleSubmitReview(_, reviewData) {
    if (!listing || !eligibleReviewRequest) {
      return {
        ok: false,
        error: "A completed booking is required before leaving a review.",
      };
    }

    const submitReviewAction = storetApp?.actions?.submitReview;

    if (!submitReviewAction) {
      return {
        ok: false,
        error: "Reviews are not available yet.",
      };
    }

    return submitReviewAction(listing, eligibleReviewRequest, reviewData);
  }

  async function handleBookingAction() {
    if (!listing || bookingIsSubmitting) return;

    const activeBookingRequest = submittedBookingRequest || latestListingRequest;

    if (canCheckoutBookingRequest(activeBookingRequest)) {
      navigate(getBookingRequestCheckoutPath(activeBookingRequest));
      return;
    }

    if (hasOpenBookingRequest(activeBookingRequest)) {
      setBookingStatus(activeBookingRequest.status);
      return;
    }

    if (!isAuthenticated) {
      navigate(APP_ROUTES.auth, { state: { from: `/listing/${routeListingId}` } });
      return;
    }

    if (!selectedPricingOption) {
      setBookingStatus("error");
      return;
    }

    const submitBookingRequestAction =
      onSubmitBookingRequest || storetApp?.actions?.submitBookingRequest;

    if (submitBookingRequestAction) {
      setBookingIsSubmitting(true);

      const result = await submitBookingRequestAction(listing, {
        fullName: activeUser.fullName || "Demo User",
        email: activeUser.email || "",
        ratePeriod: selectedPricingOption?.period,
        rateLabel: selectedPricingOption?.label,
        rateDisplay: selectedPricingOption?.display,
        duration: selectedPricingOption?.durationLabel || "Month-to-month",
        notes: "Quick reservation request from the listing details page.",
      });

      setBookingIsSubmitting(false);

      if (result?.ok === false) {
        setBookingStatus("error");
        return;
      }

      setSubmittedBookingRequest(result?.request || null);
      setBookingStatus(result?.request?.status || BOOKING_STATUSES.PENDING);
      return;
    }

    if (listing.waitlist && !listing.instantBook) {
      setBookingStatus(BOOKING_STATUSES.WAITLISTED);
      return;
    }

    setBookingStatus(BOOKING_STATUSES.APPROVED);
  }

  if (!listing && storetApp?.listingsAreLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <LinearProgress />
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Card>
            <CardContent sx={{ p: 5, textAlign: "center" }}>
              <Stack spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                  <WarehouseRoundedIcon />
                </Avatar>

                <Typography variant="h4">Loading listing...</Typography>

                <Typography color="text.secondary">
                  We are pulling the latest listing details from Storet.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  if (!listing) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Container maxWidth="md" sx={{ py: 8 }}>
          {storetApp?.listingsError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {storetApp.listingsError}
            </Alert>
          )}

          <Card>
            <CardContent sx={{ p: 5, textAlign: "center" }}>
              <Stack spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                  <WarehouseRoundedIcon />
                </Avatar>

                <Typography variant="h4">Listing not found</Typography>

                <Typography color="text.secondary">
                  This storage space may have been removed or is no longer
                  available.
                </Typography>

                <Button
                  variant="contained"
                  component={RouterLink}
                  to={listingBackRoute}
                  startIcon={<ArrowBackRoundedIcon />}
                >
                  {listingBackLabel}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const listingIsActive = listing.status === LISTING_STATUSES.ACTIVE;
  const listingIsDraft = listing.status === LISTING_STATUSES.DRAFT;
  const primaryActionLabel =
    listingIsDraft
      ? "Draft listing"
      : !listingIsActive
      ? "Unavailable"
      : listing.waitlist && !listing.instantBook
      ? "Join waitlist"
      : listing.instantBook
      ? "Reserve instantly"
      : "Request reservation";

  const activeBookingRequest = submittedBookingRequest || latestListingRequest;
  const canContinueToCheckout = canCheckoutBookingRequest(activeBookingRequest);
  const hasExistingOpenRequest = hasOpenBookingRequest(activeBookingRequest);
  const shouldDisableReservation =
    (!listingIsActive && !canContinueToCheckout) ||
    (hasExistingOpenRequest && !canContinueToCheckout);
  const inactiveActionLabel = listingIsDraft ? "Draft listing" : "Unavailable";
  const existingRequestActionLabel = activeBookingRequest?.status
    ? `${activeBookingRequest.status} request`
    : inactiveActionLabel;
  const activeActionLabel = !isAuthenticated
    ? "Sign in to reserve"
    : canContinueToCheckout
    ? "Continue to checkout"
    : hasExistingOpenRequest && !canContinueToCheckout
    ? existingRequestActionLabel
    : shouldDisableReservation
    ? inactiveActionLabel
    : primaryActionLabel;
  const listingImages = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
  const galleryImages = Array.from(new Set([listing.imageUrl, ...listingImages].filter(Boolean)));
  const heroImageUrl = galleryImages[0] || "";
  const fallbackHeroGradient =
    listing.listingType === "Commercial"
      ? "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(37, 99, 235, 0.74))"
      : "linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78))";
  const reviewSummary = getReviewSummary(listingReviews, listing);
  const displayedRating = Number.isFinite(reviewSummary.averageRating)
    ? reviewSummary.averageRating
    : 0;
  const displayedReviewCount = Number.isFinite(reviewSummary.reviewCount)
    ? reviewSummary.reviewCount
    : 0;
  const hasCompletedBookingForReview = activeBookingRequests.some(
    (request) =>
      String(request.listingId) === String(listing.id) &&
      String(request.renterId || request.requesterId || "") === String(activeUser?.id || "") &&
      request.status === BOOKING_STATUSES.COMPLETED
  );

  const selectedGalleryImage = galleryIndex !== null ? galleryImages[galleryIndex] : "";
  const hasMultipleGalleryImages = galleryImages.length > 1;

  function openImageGallery(index) {
    if (!galleryImages[index]) return;
    setGalleryIndex(index);
  }

  function closeImageGallery() {
    setGalleryIndex(null);
  }

  function showPreviousGalleryImage() {
    setGalleryIndex((currentIndex) => {
      if (currentIndex === null || galleryImages.length === 0) return currentIndex;
      return (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    });
  }

  function showNextGalleryImage() {
    setGalleryIndex((currentIndex) => {
      if (currentIndex === null || galleryImages.length === 0) return currentIndex;
      return (currentIndex + 1) % galleryImages.length;
    });
  }

  function handleListingBackClick() {
    navigate(listingBackRoute);
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
            <Button
              onClick={handleListingBackClick}
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              {listingBackLabel}
            </Button>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", md: "flex-end" }}
              justifyContent="space-between"
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<WarehouseRoundedIcon />}
                    label={listing.storageType}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />

                  <Chip
                    icon={
                      listing.instantBook ? (
                        <BoltRoundedIcon />
                      ) : (
                        <EventAvailableRoundedIcon />
                      )
                    }
                    label={listing.instantBook ? "Instant booking" : "Request-based"}
                    color={listing.instantBook ? "success" : "default"}
                    variant={listing.instantBook ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />

                  {listing.waitlist && (
                    <Chip
                      label="Waitlist available"
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>

                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: "2.25rem", md: "3.5rem" },
                    lineHeight: 1,
                  }}
                >
                  {listing.title}
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1, sm: 2 }}
                  color="text.secondary"
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <PlaceRoundedIcon fontSize="small" />
                    <Typography>{listing.location}</Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <StarRoundedIcon fontSize="small" sx={{ color: "warning.main" }} />
                    <Typography>
                      {displayedRating.toFixed(1)} · {displayedReviewCount} reviews
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Button
                variant={isSaved ? "contained" : "outlined"}
                startIcon={
                  isSaved ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />
                }
                onClick={handleSaveClick}
                sx={{ bgcolor: isSaved ? undefined : "background.paper" }}
              >
                {!isAuthenticated ? "Sign in to save" : isSaved ? "Saved" : "Save listing"}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
              <Card sx={{ overflow: "hidden" }}>
                <CardActionArea
                  component="div"
                  disabled={!heroImageUrl}
                  onClick={() => openImageGallery(0)}
                  sx={{
                    display: "block",
                    cursor: heroImageUrl ? "zoom-in" : "default",
                    "&.Mui-disabled": { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{
                      minHeight: { xs: 260, md: 390 },
                      background: heroImageUrl
                        ? `linear-gradient(135deg, rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.18)), url(${heroImageUrl})`
                        : fallbackHeroGradient,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "white",
                      p: { xs: 3, md: 4 },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                  <Stack direction="row" justifyContent="space-between">
                    <Chip
                      label={listing.listingType}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: "text.primary",
                        fontWeight: 700,
                      }}
                    />

                    <Chip
                      label={listing.distance}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: "text.primary",
                        fontWeight: 700,
                      }}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="h4" sx={{ mb: 1 }}>
                      {listing.sqft} sq ft of flexible storage
                    </Typography>
                    <Typography sx={{ opacity: 0.9, maxWidth: 620 }}>
                      Hosted by {listing.host} · {listing.access}
                    </Typography>
                    {heroImageUrl && (
                      <Typography
                        variant="body2"
                        sx={{
                          alignSelf: "flex-start",
                          mt: 2,
                          px: 1.25,
                          py: 0.65,
                          borderRadius: 999,
                          bgcolor: "rgba(15, 23, 42, 0.58)",
                          fontWeight: 800,
                        }}
                      >
                        Click image to view gallery
                      </Typography>
                    )}
                  </Box>
                  </Box>
                </CardActionArea>
              </Card>

              {galleryImages.length > 1 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, minmax(0, 1fr))",
                      sm: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  {galleryImages.slice(1, 5).map((imageUrl, index) => (
                    <Card key={imageUrl} sx={{ overflow: "hidden" }}>
                      <CardActionArea
                        component="div"
                        onClick={() => openImageGallery(index + 1)}
                        sx={{ cursor: "zoom-in" }}
                      >
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={`${listing.title} photo ${index + 2}`}
                          sx={{
                            width: "100%",
                            height: { xs: 120, sm: 140 },
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        About this space
                      </Typography>
                      <Typography color="text.secondary" lineHeight={1.8}>
                        {listing.description}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Space details
                      </Typography>

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
                        <DetailItem
                          icon={<StraightenRoundedIcon />}
                          label="Size"
                          value={`${listing.sqft} sq ft`}
                        />
                        <DetailItem
                          icon={<WarehouseRoundedIcon />}
                          label="Storage type"
                          value={listing.storageType}
                        />
                        <DetailItem
                          icon={<AccessTimeRoundedIcon />}
                          label="Access"
                          value={listing.access}
                        />
                        <DetailItem
                          icon={<PaymentsRoundedIcon />}
                          label="Primary rate"
                          value={listing.priceDisplay}
                        />
                      </Box>

                      {pricingOptions.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                          {pricingOptions.map((option) => (
                            <Chip
                              key={option.period}
                              label={option.chipLabel}
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Good for
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {listing.tags.length > 0 ? (
                          listing.tags.map((tag) => <Chip key={tag} label={tag} />)
                        ) : (
                          <>
                            <Chip label="Boxes" />
                            <Chip label="Dorm items" />
                            <Chip label="Seasonal storage" />
                          </>
                        )}
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Amenities
                      </Typography>

                      <Stack spacing={1.25}>
                        {listing.amenities.map((amenity) => (
                          <Stack
                            key={amenity}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <CheckCircleRoundedIcon color="success" fontSize="small" />
                            <Typography>{amenity}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={2}>
                    <Typography variant="h5">Host information</Typography>

                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: "secondary.main",
                          fontWeight: 800,
                          fontSize: "1.4rem",
                        }}
                      >
                        {listing.host.charAt(0).toUpperCase()}
                      </Avatar>

                      <Box>
                        <Typography variant="h6">{listing.host}</Typography>
                        <Typography color="text.secondary">
                          {listing.listingType} · Storet host
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography color="text.secondary">Host rating</Typography>
                        <Typography fontWeight={800}>
                          {displayedRating.toFixed(1)} / 5
                        </Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min((displayedRating / 5) * 100, 100)}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <ContactHostForm
                    hostName={listing.host}
                    listingTitle={listing.title}
                    currentUser={activeUser}
                    onSubmitMessage={handleSubmitHostMessage}
                    onRequireAuth={() =>
                      navigate(APP_ROUTES.auth, {
                        state: {
                          from: `/listing/${routeListingId}`,
                          reason: "message-host",
                        },
                      })
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={3}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Box>
                        <Typography variant="h5">Reviews</Typography>
                        <Typography color="text.secondary">
                          Verified renter feedback for this storage space.
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Rating value={displayedRating} precision={0.1} readOnly />
                        <Typography fontWeight={800}>
                          {displayedRating.toFixed(1)} · {displayedReviewCount}
                        </Typography>
                      </Stack>
                    </Stack>

                    {storetApp?.reviewsError && (
                      <Alert severity="error">{storetApp.reviewsError}</Alert>
                    )}

                    {eligibleReviewRequest ? (
                      <ReviewForm
                        eligibleRequest={eligibleReviewRequest}
                        onSubmitReview={handleSubmitReview}
                      />
                    ) : activeUser?.isAuthenticated && hasCompletedBookingForReview ? (
                      <Alert severity="success" variant="outlined">
                        You have already reviewed this completed booking. Thanks for helping future renters.
                      </Alert>
                    ) : activeUser?.isAuthenticated ? (
                      <Alert severity="info" variant="outlined">
                        Complete a booking for this listing before leaving a verified review.
                      </Alert>
                    ) : (
                      <Alert severity="info" variant="outlined">
                        Sign in and complete a booking to leave a verified review.
                      </Alert>
                    )}

                    <Divider />

                    {storetApp?.reviewsAreLoading ? (
                      <LinearProgress />
                    ) : listingReviews.length > 0 ? (
                      <Stack spacing={2}>
                        {listingReviews.map((review) => (
                          <Card key={review.id} variant="outlined" sx={{ boxShadow: "none" }}>
                            <CardContent sx={{ p: 2.5 }}>
                              <Stack spacing={1.25}>
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                  justifyContent="space-between"
                                  alignItems={{ xs: "flex-start", sm: "center" }}
                                >
                                  <Stack direction="row" spacing={1.25} alignItems="center">
                                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                                      {(review.reviewerName || "S").charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                      <Typography fontWeight={800}>
                                        {review.reviewerName || "Storet renter"}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {formatReviewDate(review.createdAt)}
                                      </Typography>
                                    </Box>
                                  </Stack>

                                  <Rating value={Number(review.rating || 0)} readOnly size="small" />
                                </Stack>

                                <Typography color="text.secondary" lineHeight={1.7}>
                                  {review.comment}
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Alert severity="info" variant="outlined">
                        No reviews yet. Completed renters will be able to leave verified feedback here.
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
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
                  <Box>
                    <Typography variant="h4">
                      {selectedPricingOption?.display || listing.priceDisplay}
                    </Typography>
                    <Typography color="text.secondary">
                      {listing.sqft} sq ft · {listing.access}
                    </Typography>
                  </Box>

                  {pricingOptions.length > 0 && (
                    <Stack spacing={1}>
                      <Typography fontWeight={800}>Choose a rate</Typography>
                      <Stack spacing={1}>
                        {pricingOptions.map((option) => (
                          <Button
                            key={option.period}
                            type="button"
                            variant={
                              (selectedPricingOption?.period || defaultRatePeriod) === option.period
                                ? "contained"
                                : "outlined"
                            }
                            onClick={() => setSelectedRatePeriod(option.period)}
                            sx={{ justifyContent: "space-between" }}
                          >
                            <span>{option.label}</span>
                            <span>{option.display}</span>
                          </Button>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  <Divider />

                  {!listingIsActive && (
                    <Alert severity={listingIsDraft ? "warning" : "info"}>
                      {listingIsDraft
                        ? "This listing is saved as a draft and is hidden from renters until payout setup is complete."
                        : "This listing is not currently available for new reservations."}
                    </Alert>
                  )}

                  {bookingStatus === BOOKING_STATUSES.APPROVED && (
                    <Alert severity="success">
                      Booking request approved. You can continue to checkout now
                      or open it later from your profile.
                    </Alert>
                  )}

                  {bookingStatus === BOOKING_STATUSES.PENDING && (
                    <Alert severity="info">
                      Reservation request sent. The host can approve, waitlist,
                      or decline it in a later dashboard phase.
                    </Alert>
                  )}

                  {bookingStatus === BOOKING_STATUSES.WAITLISTED && (
                    <Alert severity="warning">
                      You joined the waitlist for this space.
                    </Alert>
                  )}

                  {bookingStatus === "error" && (
                    <Alert severity="error">
                      {storetApp?.activityError ||
                        "We could not create that booking request. Please try again."}
                    </Alert>
                  )}

                  {activeBookingRequest && !bookingStatus && (
                    <Alert severity="info">
                      Latest local request for this listing: {activeBookingRequest.status}.
                    </Alert>
                  )}

                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ShieldRoundedIcon color="primary" />
                      <Typography>Review listing details before reserving.</Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Inventory2RoundedIcon color="primary" />
                      <Typography>Best fit: flexible household storage.</Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonRoundedIcon color="primary" />
                      <Typography>Hosted by {listing.host}.</Typography>
                    </Stack>
                  </Stack>

                  <Button
                    size="large"
                    variant="contained"
                    startIcon={
                      listing.instantBook ? (
                        <BoltRoundedIcon />
                      ) : (
                        <EventAvailableRoundedIcon />
                      )
                    }
                    onClick={handleBookingAction}
                    disabled={shouldDisableReservation || bookingIsSubmitting}
                  >
                    {bookingIsSubmitting ? "Submitting..." : activeActionLabel}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={
                      isSaved ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />
                    }
                    onClick={handleSaveClick}
                  >
                    {!isAuthenticated ? "Sign in to save" : isSaved ? "Saved" : "Save for later"}
                  </Button>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {isAuthenticated
                      ? `You are browsing as ${activeUser.fullName || "Storet user"}.`
                      : "Sign in to save, message hosts, or reserve this space."}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>

      <Dialog
        open={galleryIndex !== null}
        onOpenChange={(open) => {
          if (!open) closeImageGallery();
        }}
        maxWidth="lg"
        paperSx={{ bgcolor: "#020617" }}
      >
        <Box sx={{ position: "relative", bgcolor: "#020617", color: "white" }}>
          <IconButton
            aria-label="Close image gallery"
            onClick={closeImageGallery}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
              bgcolor: "rgba(15,23,42,0.68)",
              color: "white",
              "&:hover": { bgcolor: "rgba(15,23,42,0.86)" },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>

          {hasMultipleGalleryImages && (
            <IconButton
              aria-label="Previous image"
              onClick={showPreviousGalleryImage}
              sx={{
                position: "absolute",
                top: "50%",
                left: 12,
                transform: "translateY(-50%)",
                zIndex: 2,
                bgcolor: "rgba(15,23,42,0.68)",
                color: "white",
                "&:hover": { bgcolor: "rgba(15,23,42,0.86)" },
              }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>
          )}

          {selectedGalleryImage && (
            <Box
              component="img"
              src={selectedGalleryImage}
              alt={`${listing.title} enlarged photo`}
              sx={{
                width: "100%",
                maxHeight: { xs: "72vh", md: "78vh" },
                objectFit: "contain",
                display: "block",
                bgcolor: "#020617",
              }}
            />
          )}

          {hasMultipleGalleryImages && (
            <IconButton
              aria-label="Next image"
              onClick={showNextGalleryImage}
              sx={{
                position: "absolute",
                top: "50%",
                right: 12,
                transform: "translateY(-50%)",
                zIndex: 2,
                bgcolor: "rgba(15,23,42,0.68)",
                color: "white",
                "&:hover": { bgcolor: "rgba(15,23,42,0.86)" },
              }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>
          )}

          <Box sx={{ px: 2.5, py: 1.5, bgcolor: "rgba(15,23,42,0.96)" }}>
            <Typography variant="body2" fontWeight={800}>
              {galleryIndex !== null ? galleryIndex + 1 : 1} of {galleryImages.length}
            </Typography>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

function formatReviewDate(value) {
  if (!value) {
    return "Recently";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch (error) {
    return "Recently";
  }
}

function DetailItem({ icon, label, value }) {
  return (
    <Card variant="outlined" sx={{ boxShadow: "none" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
            {icon}
          </Avatar>

          <Box>
            <Typography color="text.secondary" variant="body2">
              {label}
            </Typography>
            <Typography fontWeight={800}>{value}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ListingDetailsPage;