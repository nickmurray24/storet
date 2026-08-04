import React, { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { getPageListings } from "../data/listingCatalog";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import ExploreMapView from "../components/ExploreMapView";
import { LISTING_STATUSES, normalizeSavedIds } from "../utils/listingUtils";
import { AVAILABILITY_STATUSES } from "../constants/appEnums";
import { getMonthlyEquivalentAmount } from "../utils/pricingUtils";
import {
  readSavedListingIds,
  readUserListings,
  writeSavedListingIds,
} from "../utils/storage";

const MIN_MONTHLY_EQUIVALENT_PRICE = 40;
const MAX_MONTHLY_EQUIVALENT_PRICE = 5000;

function getPriceInputError(value, label) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return `${label} must be a number.`;
  }

  if (parsedValue < MIN_MONTHLY_EQUIVALENT_PRICE) {
    return `${label} must be at least $${MIN_MONTHLY_EQUIVALENT_PRICE.toLocaleString()}/mo.`;
  }

  if (parsedValue > MAX_MONTHLY_EQUIVALENT_PRICE) {
    return `${label} must be no more than $${MAX_MONTHLY_EQUIVALENT_PRICE.toLocaleString()}/mo.`;
  }

  return "";
}

function isExploreVisibleListing(listing = {}) {
  return (
    listing.status === LISTING_STATUSES.ACTIVE &&
    listing.availabilityStatus !== AVAILABILITY_STATUSES.UNAVAILABLE &&
    !listing.postBookingActionRequired
  );
}

function ExplorePage({
  listings,
  savedListingIds,
  onToggleSave,
  onSaveToggle,
}) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = Boolean(storetApp?.currentUser?.isAuthenticated);

  const activeMode = storetApp?.activeMode || "Renter";
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
  const exploreListings = useMemo(
    () => allListings.filter(isExploreVisibleListing),
    [allListings]
  );

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

  const savedIdSet = useMemo(
    () => new Set(activeSavedIds.map(String)),
    [activeSavedIds]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [storageType, setStorageType] = useState("All");
  const [listingType, setListingType] = useState("All");
  const [bookingType, setBookingType] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const storageTypes = useMemo(() => {
    const uniqueTypes = new Set(
      exploreListings.map((listing) => listing.storageType)
    );
    return ["All", ...Array.from(uniqueTypes)];
  }, [exploreListings]);

  const minPriceError = getPriceInputError(minPriceInput, "Minimum price");
  const maxPriceError = getPriceInputError(maxPriceInput, "Maximum price");
  const parsedMinPrice = minPriceInput.trim() ? Number(minPriceInput) : null;
  const parsedMaxPrice = maxPriceInput.trim() ? Number(maxPriceInput) : null;
  const hasPriceRangeOrderError =
    !minPriceError &&
    !maxPriceError &&
    parsedMinPrice !== null &&
    parsedMaxPrice !== null &&
    parsedMinPrice > parsedMaxPrice;
  const effectiveMinPrice =
    !minPriceError && !hasPriceRangeOrderError && parsedMinPrice !== null
      ? parsedMinPrice
      : MIN_MONTHLY_EQUIVALENT_PRICE;
  const effectiveMaxPrice =
    !maxPriceError && !hasPriceRangeOrderError && parsedMaxPrice !== null
      ? parsedMaxPrice
      : MAX_MONTHLY_EQUIVALENT_PRICE;

  const filteredListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = exploreListings.filter((listing) => {
      const searchableText = [
        listing.title,
        listing.location,
        listing.storageType,
        listing.listingType,
        listing.description,
        listing.host,
        ...listing.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesStorageType =
        storageType === "All" || listing.storageType === storageType;
      const matchesListingType =
        listingType === "All" || listing.listingType === listingType;
      const matchesBookingType =
        bookingType === "All" ||
        (bookingType === "Instant" && listing.instantBook) ||
        (bookingType === "Waitlist" && listing.waitlist);
      const monthlyEquivalentPrice = getMonthlyEquivalentAmount(listing.pricing);
      const matchesPrice =
        monthlyEquivalentPrice > 0 &&
        monthlyEquivalentPrice >= effectiveMinPrice &&
        monthlyEquivalentPrice <= effectiveMaxPrice;

      return (
        matchesSearch &&
        matchesStorageType &&
        matchesListingType &&
        matchesBookingType &&
        matchesPrice
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "priceLow") {
        return getMonthlyEquivalentAmount(a.pricing) - getMonthlyEquivalentAmount(b.pricing);
      }
      if (sortBy === "priceHigh") {
        return getMonthlyEquivalentAmount(b.pricing) - getMonthlyEquivalentAmount(a.pricing);
      }
      if (sortBy === "sqftHigh") return b.sqft - a.sqft;
      if (sortBy === "ratingHigh") return b.rating - a.rating;

      return Number(b.instantBook) - Number(a.instantBook) || b.rating - a.rating;
    });
  }, [
    bookingType,
    exploreListings,
    listingType,
    effectiveMaxPrice,
    effectiveMinPrice,
    searchQuery,
    sortBy,
    storageType,
  ]);

  const stats = useMemo(() => {
    const instantCount = exploreListings.filter((listing) => listing.instantBook).length;
    const privateCount = exploreListings.filter(
      (listing) => listing.listingType === "Private host"
    ).length;

    return {
      total: exploreListings.length,
      instant: instantCount,
      private: privateCount,
    };
  }, [exploreListings]);

  function handleBookingTypeChange(event, nextValue) {
    if (nextValue) {
      setBookingType(nextValue);
    }
  }

  function handleViewModeChange(event, nextValue) {
    if (nextValue) {
      setViewMode(nextValue);
    }
  }

  function handleSaveClick(event, listingId) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate(APP_ROUTES.auth, {
        state: {
          from: location.pathname,
          reason: "save-listing",
        },
      });
      return;
    }

    const toggleSaveAction =
      onToggleSave || onSaveToggle || storetApp?.actions?.toggleSave;

    if (toggleSaveAction) {
      toggleSaveAction(listingId);
      return;
    }

    setLocalSavedIds((currentIds) => {
      const normalizedId = String(listingId);
      const nextIds = currentIds.includes(normalizedId)
        ? currentIds.filter((id) => id !== normalizedId)
        : [...currentIds, normalizedId];

      writeSavedListingIds(nextIds);
      return nextIds;
    });
  }

  const priceRangeHelperText = hasPriceRangeOrderError
    ? "Minimum price must be less than maximum price."
    : "Leave blank to include the full price range.";

  const filterControls = (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <TextField
        label="Search by city, space, or keyword"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon />
            </InputAdornment>
          ),
        }}
      />

      <FormControl fullWidth>
        <InputLabel>Storage type</InputLabel>
        <Select
          value={storageType}
          label="Storage type"
          onChange={(event) => setStorageType(event.target.value)}
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
          value={listingType}
          label="Listing type"
          onChange={(event) => setListingType(event.target.value)}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Private host">Private host</MenuItem>
          <MenuItem value="Commercial">Commercial</MenuItem>
        </Select>
      </FormControl>

      <Stack spacing={1}>
        <Typography fontWeight={700}>Booking type</Typography>
        <ToggleButtonGroup
          value={bookingType}
          exclusive
          onChange={handleBookingTypeChange}
          color="primary"
          fullWidth
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="All">All</ToggleButton>
          <ToggleButton value="Instant">Instant</ToggleButton>
          <ToggleButton value="Waitlist">Waitlist</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack spacing={1.15}>
        <Box>
          <Typography fontWeight={700} lineHeight={1.2}>
            Monthly-equivalent price
          </Typography>
          <Typography
            variant="caption"
            color={hasPriceRangeOrderError ? "error" : "text.secondary"}
          >
            {priceRangeHelperText}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField
            label="Minimum"
            placeholder={String(MIN_MONTHLY_EQUIVALENT_PRICE)}
            value={minPriceInput}
            onChange={(event) => setMinPriceInput(event.target.value)}
            type="number"
            fullWidth
            error={Boolean(minPriceError || hasPriceRangeOrderError)}
            helperText={minPriceError || (hasPriceRangeOrderError ? "Must be less than max." : " ")}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">/mo</InputAdornment>,
            }}
            inputProps={{
              min: MIN_MONTHLY_EQUIVALENT_PRICE,
              max: MAX_MONTHLY_EQUIVALENT_PRICE,
              step: 25,
            }}
          />

          <TextField
            label="Maximum"
            placeholder={String(MAX_MONTHLY_EQUIVALENT_PRICE)}
            value={maxPriceInput}
            onChange={(event) => setMaxPriceInput(event.target.value)}
            type="number"
            fullWidth
            error={Boolean(maxPriceError || hasPriceRangeOrderError)}
            helperText={maxPriceError || (hasPriceRangeOrderError ? "Must be greater than min." : " ")}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">/mo</InputAdornment>,
            }}
            inputProps={{
              min: MIN_MONTHLY_EQUIVALENT_PRICE,
              max: MAX_MONTHLY_EQUIVALENT_PRICE,
              step: 25,
            }}
          />
        </Stack>
      </Stack>

      <FormControl fullWidth>
        <InputLabel>Sort by</InputLabel>
        <Select
          value={sortBy}
          label="Sort by"
          onChange={(event) => setSortBy(event.target.value)}
        >
          <MenuItem value="recommended">Recommended</MenuItem>
          <MenuItem value="priceLow">Price: low to high</MenuItem>
          <MenuItem value="priceHigh">Price: high to low</MenuItem>
          <MenuItem value="sqftHigh">Most space</MenuItem>
          <MenuItem value="ratingHigh">Highest rated</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        onClick={() => {
          setSearchQuery("");
          setStorageType("All");
          setListingType("All");
          setBookingType("All");
          setSortBy("recommended");
          setMinPriceInput("");
          setMaxPriceInput("");
        }}
      >
        Reset filters
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {storetApp?.listingsAreLoading && <LinearProgress />}

      {storetApp?.listingsError && (
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Alert severity="warning">{storetApp.listingsError}</Alert>
        </Container>
      )}

      {viewMode !== "map" && (
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={1.5}>
              <Chip
                icon={<WarehouseRoundedIcon />}
                label={`${activeMode} mode`}
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
                  Explore storage spaces
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 680, fontSize: "1.05rem" }}
                >
                  Search flexible storage options from local hosts and commercial
                  partners.
                </Typography>
              </Box>
            </Stack>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              color="primary"
              sx={{
                bgcolor: "background.paper",
                borderRadius: 999,
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
                "& .MuiToggleButton-root": {
                  px: 2.25,
                  py: 1,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 800,
                },
              }}
            >
              <ToggleButton value="list">
                <ViewListRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                List view
              </ToggleButton>
              <ToggleButton value="map">
                <MapRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Map view
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mt: 4 }}
          >
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                    <Inventory2RoundedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{stats.total}</Typography>
                    <Typography color="text.secondary">Available spaces</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.dark" }}>
                    <BoltRoundedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{stats.instant}</Typography>
                    <Typography color="text.secondary">Instant booking</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "background.default", color: "text.primary" }}>
                    <PersonRoundedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{stats.private}</Typography>
                    <Typography color="text.secondary">Private hosts</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
      )}

      <Container
        maxWidth={viewMode === "map" ? false : "lg"}
        disableGutters={viewMode === "map"}
        sx={{ py: viewMode === "map" ? { xs: 0, md: 0 } : { xs: 3, md: 4 } }}
      >
        {viewMode === "map" ? (
          <ExploreMapView
            listings={filteredListings}
            filterPanel={filterControls}
            savedIdSet={savedIdSet}
            onSaveClick={handleSaveClick}
            isAuthenticated={isAuthenticated}
            viewToggle={
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                color="primary"
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 999,
                  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.16)",
                  "& .MuiToggleButton-root": {
                    px: 1.75,
                    py: 0.75,
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 900,
                    borderColor: "divider",
                  },
                }}
              >
                <ToggleButton value="list">
                  <ViewListRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  List
                </ToggleButton>
                <ToggleButton value="map">
                  <MapRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Map
                </ToggleButton>
              </ToggleButtonGroup>
            }
          />
        ) : (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Card
            sx={{
              width: { xs: "100%", lg: 320 },
              alignSelf: "flex-start",
              position: { lg: "sticky" },
              top: { lg: 96 },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TuneRoundedIcon color="primary" />
                  <Typography variant="h6">Search filters</Typography>
                </Stack>

                {filterControls}
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ flex: 1 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h5">
                  {filteredListings.length} matching spaces
                </Typography>
                <Typography color="text.secondary">
                  Compare space, access, booking style, and available rates.
                </Typography>
              </Box>
            </Stack>

            {filteredListings.length === 0 ? (
              <Card>
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Stack spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                      <SearchRoundedIcon />
                    </Avatar>
                    <Typography variant="h5">No spaces found</Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                      Try adjusting your filters or increasing the monthly-equivalent price
                      range.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 2.5,
                }}
              >
                {filteredListings.map((listing) => {
                  const isSaved = savedIdSet.has(String(listing.id));
                  const listingPath = buildListingPath(listing.id);
                  const listingImageUrl =
                    listing.coverImageUrl ||
                    listing.imageUrl ||
                    (Array.isArray(listing.images) ? listing.images[0] : "");

                  return (
                    <Card key={listing.id} sx={{ overflow: "hidden" }}>
                      <CardActionArea component={RouterLink} to={listingPath}>
                        <Box
                          sx={{
                            height: 190,
                            position: "relative",
                            overflow: "hidden",
                            background:
                              listing.listingType === "Commercial"
                                ? "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(37, 99, 235, 0.72))"
                                : "linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(20, 184, 166, 0.76))",
                            color: "white",
                          }}
                        >
                          {listingImageUrl && (
                            <Box
                              component="img"
                              src={listingImageUrl}
                              alt={listing.title}
                              loading="lazy"
                              sx={{
                                width: "100%",
                                height: "100%",
                                display: "block",
                                objectFit: "cover",
                              }}
                            />
                          )}

                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(180deg, rgba(15, 23, 42, 0.12) 0%, rgba(15, 23, 42, 0.42) 48%, rgba(15, 23, 42, 0.76) 100%)",
                            }}
                          />

                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            sx={{
                              position: "absolute",
                              top: 16,
                              left: 16,
                              right: 16,
                            }}
                          >
                            <Chip
                              icon={
                                listing.listingType === "Commercial" ? (
                                  <BusinessRoundedIcon />
                                ) : (
                                  <PersonRoundedIcon />
                                )
                              }
                              label={listing.listingType}
                              size="small"
                              sx={{
                                bgcolor: "rgba(255,255,255,0.92)",
                                color: "text.primary",
                                fontWeight: 700,
                              }}
                            />

                            {listing.instantBook && (
                              <Chip
                                icon={<BoltRoundedIcon />}
                                label="Instant"
                                size="small"
                                sx={{
                                  bgcolor: "rgba(255,255,255,0.92)",
                                  color: "text.primary",
                                  fontWeight: 700,
                                }}
                              />
                            )}
                          </Stack>

                          <Box
                            sx={{
                              position: "absolute",
                              left: 20,
                              right: 20,
                              bottom: 18,
                            }}
                          >
                            <Typography variant="h5" sx={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                              {listing.title}
                            </Typography>
                            <Typography sx={{ opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                              Hosted by {listing.host}
                            </Typography>
                          </Box>
                        </Box>

                        <CardContent sx={{ p: 2.5 }}>
                          <Stack spacing={2}>
                            <Stack spacing={0.75}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <PlaceRoundedIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Typography color="text.secondary">
                                  {listing.location} · {listing.distance}
                                </Typography>
                              </Stack>

                              <Typography color="text.secondary" lineHeight={1.6}>
                                {listing.description}
                              </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                icon={<WarehouseRoundedIcon />}
                                label={listing.storageType}
                                size="small"
                              />
                              <Chip
                                icon={<StraightenRoundedIcon />}
                                label={`${listing.sqft} sq ft`}
                                size="small"
                              />
                              {listing.waitlist && (
                                <Chip
                                  label="Waitlist"
                                  color="warning"
                                  variant="outlined"
                                  size="small"
                                />
                              )}
                            </Stack>

                            <Divider />

                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <Box>
                                <Typography variant="h5">
                                  {listing.startingPriceDisplay}
                                </Typography>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                                  {listing.pricingOptions.map((option) => (
                                    <Chip
                                      key={option.period}
                                      label={option.display}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                                  {listing.access}
                                </Typography>
                              </Box>

                              <Stack alignItems="flex-end" spacing={0.25}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <StarRoundedIcon
                                    fontSize="small"
                                    sx={{ color: "warning.main" }}
                                  />
                                  <Typography fontWeight={800}>
                                    {listing.rating.toFixed(1)}
                                  </Typography>
                                </Stack>
                                <Typography color="text.secondary" variant="body2">
                                  {listing.reviews} reviews
                                </Typography>
                              </Stack>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </CardActionArea>

                      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                        <Button
                          variant={isSaved ? "contained" : "outlined"}
                          startIcon={
                            isSaved ? (
                              <FavoriteRoundedIcon />
                            ) : (
                              <FavoriteBorderRoundedIcon />
                            )
                          }
                          onClick={(event) => handleSaveClick(event, listing.id)}
                        >
                          {!isAuthenticated ? "Sign in to save" : isSaved ? "Saved" : "Save"}
                        </Button>

                        <Button
                          component={RouterLink}
                          to={listingPath}
                          endIcon={<ArrowForwardRoundedIcon />}
                          sx={{ ml: "auto" }}
                        >
                          View details
                        </Button>
                      </CardActions>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Stack>

        )}
      </Container>
    </Box>
  );
}

export default ExplorePage;