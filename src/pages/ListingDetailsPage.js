import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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

import {
  CURRENT_USER_KEY,
  SAVED_LISTINGS_KEY,
  USER_LISTINGS_KEY,
} from "../constants/storageKeys";
import { normalizeListing, normalizeSavedIds } from "../utils/listingUtils";
import { safeReadJson, safeWriteJson } from "../utils/storage";

const fallbackListings = [
  {
    id: "1",
    title: "Oakley Garage Space",
    location: "Oakley, Cincinnati, OH",
    distance: "6 miles away",
    price: 85,
    sqft: 120,
    storageType: "Garage",
    listingType: "Private host",
    access: "By appointment",
    rating: 4.9,
    reviews: 18,
    instantBook: true,
    waitlist: false,
    host: "Maya",
    description:
      "Clean indoor garage space for boxes, bikes, dorm items, seasonal storage, and small furniture.",
    tags: ["Indoor", "Private", "Instant book"],
    amenities: ["Indoor space", "Private access", "Flexible monthly rental"],
  },
  {
    id: "2",
    title: "Clifton Basement Corner",
    location: "Clifton, Cincinnati, OH",
    distance: "2 miles away",
    price: 55,
    sqft: 75,
    storageType: "Basement",
    listingType: "Private host",
    access: "Weekly access",
    rating: 4.7,
    reviews: 11,
    instantBook: false,
    waitlist: true,
    host: "Evan",
    description:
      "Affordable basement storage close to campus and apartment-heavy neighborhoods.",
    tags: ["Budget", "Student friendly", "Waitlist"],
    amenities: ["Student friendly", "Budget pricing", "Short-term friendly"],
  },
  {
    id: "3",
    title: "Downtown Storage Locker",
    location: "Downtown Cincinnati, OH",
    distance: "4 miles away",
    price: 110,
    sqft: 100,
    storageType: "Storage unit",
    listingType: "Commercial",
    access: "Daily access",
    rating: 4.8,
    reviews: 32,
    instantBook: true,
    waitlist: false,
    host: "Storet Partner",
    description:
      "Traditional storage-style locker with flexible monthly availability.",
    tags: ["Commercial", "Daily access", "Secure"],
    amenities: ["Daily access", "Secure facility", "Commercial partner"],
  },
  {
    id: "4",
    title: "Mason Spare Room Storage",
    location: "Mason, OH",
    distance: "18 miles away",
    price: 70,
    sqft: 90,
    storageType: "Spare room",
    listingType: "Private host",
    access: "By appointment",
    rating: 4.6,
    reviews: 9,
    instantBook: false,
    waitlist: false,
    host: "Jordan",
    description:
      "Climate-friendly spare room space for bins, seasonal items, and dorm storage.",
    tags: ["Climate friendly", "Residential", "Flexible"],
    amenities: ["Residential space", "Flexible access", "Good for bins"],
  },
];

function ListingDetailsPage({
  listings,
  savedListingIds,
  onToggleSave,
  onSaveToggle,
}) {
  const navigate = useNavigate();
  const params = useParams();
  const routeListingId = String(params.id || params.listingId || "");

  const storedUser = safeReadJson(CURRENT_USER_KEY, {
    fullName: "Demo User",
    role: "Renter",
  });

  const userListings = useMemo(() => {
    const storedListings = safeReadJson(USER_LISTINGS_KEY, []);
    return Array.isArray(storedListings) ? storedListings : [];
  }, []);

  const allListings = useMemo(() => {
    const sourceListings =
      Array.isArray(listings) && listings.length > 0
        ? listings
        : [...fallbackListings, ...userListings];

    const normalizedListings = sourceListings.map(normalizeListing);
    const seenIds = new Set();

    return normalizedListings.filter((listing) => {
      if (seenIds.has(listing.id)) return false;
      seenIds.add(listing.id);
      return true;
    });
  }, [listings, userListings]);

  const listing = useMemo(() => {
    return allListings.find((item) => String(item.id) === routeListingId);
  }, [allListings, routeListingId]);

  const savedIdsFromProps = normalizeSavedIds(savedListingIds);

  const [localSavedIds, setLocalSavedIds] = useState(() =>
    normalizeSavedIds(safeReadJson(SAVED_LISTINGS_KEY, []))
  );

  const activeSavedIds =
    savedIdsFromProps.length > 0 ? savedIdsFromProps : localSavedIds;

  const isSaved = listing
    ? activeSavedIds.includes(String(listing.id))
    : false;

  const [bookingStatus, setBookingStatus] = useState("");

  function handleSaveClick() {
    if (!listing) return;

    if (onToggleSave) {
      onToggleSave(listing.id);
      return;
    }

    if (onSaveToggle) {
      onSaveToggle(listing.id);
      return;
    }

    setLocalSavedIds((currentIds) => {
      const normalizedId = String(listing.id);
      const nextIds = currentIds.includes(normalizedId)
        ? currentIds.filter((id) => id !== normalizedId)
        : [...currentIds, normalizedId];

      safeWriteJson(SAVED_LISTINGS_KEY, nextIds);
      return nextIds;
    });
  }

  function handleBookingAction() {
    if (!listing) return;

    if (listing.waitlist && !listing.instantBook) {
      setBookingStatus("waitlist");
      return;
    }

    setBookingStatus("reserved");
  }

  if (!listing) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Container maxWidth="md" sx={{ py: 8 }}>
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
                  to="/explore"
                  startIcon={<ArrowBackRoundedIcon />}
                >
                  Back to Explore
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const primaryActionLabel =
    listing.waitlist && !listing.instantBook
      ? "Join waitlist"
      : listing.instantBook
      ? "Reserve instantly"
      : "Request reservation";

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
              onClick={() => navigate("/explore")}
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              Back to Explore
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
                      {listing.rating.toFixed(1)} · {listing.reviews} reviews
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
                {isSaved ? "Saved" : "Save listing"}
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
                <Box
                  sx={{
                    minHeight: { xs: 260, md: 390 },
                    background:
                      listing.listingType === "Commercial"
                        ? "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(37, 99, 235, 0.74))"
                        : "linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78))",
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
                  </Box>
                </Box>
              </Card>

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
                          label="Monthly price"
                          value={`$${listing.price}/mo`}
                        />
                      </Box>
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
                          {listing.rating.toFixed(1)} / 5
                        </Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min((listing.rating / 5) * 100, 100)}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Stack>
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
                      ${listing.price}
                      <Typography
                        component="span"
                        color="text.secondary"
                        fontSize="1rem"
                      >
                        /mo
                      </Typography>
                    </Typography>
                    <Typography color="text.secondary">
                      {listing.sqft} sq ft · {listing.access}
                    </Typography>
                  </Box>

                  <Divider />

                  {bookingStatus === "reserved" && (
                    <Alert severity="success">
                      Reservation started. This can later connect to your full
                      booking flow.
                    </Alert>
                  )}

                  {bookingStatus === "waitlist" && (
                    <Alert severity="warning">
                      You joined the waitlist for this space.
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
                  >
                    {primaryActionLabel}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={
                      isSaved ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />
                    }
                    onClick={handleSaveClick}
                  >
                    {isSaved ? "Saved" : "Save for later"}
                  </Button>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    You are browsing as {storedUser.fullName || "Demo User"}.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
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