import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  Slider,
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
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { getPageListings } from "../data/listingCatalog";
import { buildListingPath } from "../routes/appRoutes";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { normalizeSavedIds } from "../utils/listingUtils";
import { getMonthlyEquivalentAmount } from "../utils/pricingUtils";
import {
  readSavedListingIds,
  readUserListings,
  writeSavedListingIds,
} from "../utils/storage";

function ExplorePage({
  listings,
  savedListingIds,
  onToggleSave,
  onSaveToggle,
}) {
  const storetApp = useOptionalStoretApp();

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
  const [maxPrice, setMaxPrice] = useState(180);

  const storageTypes = useMemo(() => {
    const uniqueTypes = new Set(allListings.map((listing) => listing.storageType));
    return ["All", ...Array.from(uniqueTypes)];
  }, [allListings]);

  const filteredListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = allListings.filter((listing) => {
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
      const matchesPrice = monthlyEquivalentPrice > 0 && monthlyEquivalentPrice <= maxPrice;

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
    allListings,
    bookingType,
    listingType,
    maxPrice,
    searchQuery,
    sortBy,
    storageType,
  ]);

  const stats = useMemo(() => {
    const instantCount = allListings.filter((listing) => listing.instantBook).length;
    const privateCount = allListings.filter(
      (listing) => listing.listingType === "Private host"
    ).length;

    return {
      total: allListings.length,
      instant: instantCount,
      private: privateCount,
    };
  }, [allListings]);

  function handleBookingTypeChange(event, nextValue) {
    if (nextValue) {
      setBookingType(nextValue);
    }
  }

  function handleSaveClick(event, listingId) {
    event.preventDefault();
    event.stopPropagation();

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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {storetApp?.listingsAreLoading && <LinearProgress />}

      {storetApp?.listingsError && (
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Alert severity="warning">{storetApp.listingsError}</Alert>
        </Container>
      )}

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

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
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

                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={700}>Max monthly-equivalent price</Typography>
                    <Chip label={`$${maxPrice}`} size="small" />
                  </Stack>

                  <Slider
                    value={maxPrice}
                    min={40}
                    max={220}
                    step={5}
                    onChange={(event, value) => setMaxPrice(value)}
                    valueLabelDisplay="auto"
                  />
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
                    setMaxPrice(180);
                  }}
                >
                  Reset filters
                </Button>
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
                          {isSaved ? "Saved" : "Save"}
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
      </Container>
    </Box>
  );
}

export default ExplorePage;