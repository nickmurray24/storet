import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
  Stack,
  Typography,
} from "@mui/material";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { getListingCatalog } from "../data/listingCatalog";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
import { APP_MODES, USER_ROLES } from "../constants/appEnums";
import { BOOKING_STATUSES } from "../utils/bookingUtils";
import {
  getBookingRequestPrimaryAction,
  getRenterBookingRequests,
} from "../utils/bookingSelectors";
import { normalizeListingList, normalizeSavedIds } from "../utils/listingUtils";
import { getRenterHostMessages } from "../utils/messageSelectors";
import { getStoredCurrentUser, readUserListings } from "../utils/storage";

function getInitials(name) {
  if (!name) return "S";

  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfilePage({
  currentUser,
  listings,
  savedListingIds,
  bookingRequests,
  paymentRecords,
  hostMessages,
  onToggleSave,
  onUpdateBookingLifecycle,
}) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const [hostUpgradeIsSubmitting, setHostUpgradeIsSubmitting] = useState(false);
  const [renterUpgradeIsSubmitting, setRenterUpgradeIsSubmitting] = useState(false);

  const storedUser = getStoredCurrentUser() || {
    fullName: "Demo User",
    email: "demo@storet.com",
    role: USER_ROLES.RENTER,
    isAuthenticated: true,
  };

  const activeUser = currentUser || storetApp?.currentUser || storedUser;
  const activeMode = storetApp?.activeMode || activeUser?.role || APP_MODES.RENTER;
  const isHostMode = activeMode === APP_MODES.HOST;
  const isRenterMode = activeMode === APP_MODES.RENTER;
  const canUseHostMode = Boolean(storetApp?.canUseHostMode);
  const canUseRenterMode = Boolean(storetApp?.canUseRenterMode ?? true);
  const isRenterOnly = activeUser?.role === USER_ROLES.RENTER;

  const storedUserListings = useMemo(() => readUserListings(), []);

  const hostListings = useMemo(() => {
    const sourceListings =
      Array.isArray(listings)
        ? listings
        : Array.isArray(storetApp?.userListings)
        ? storetApp.userListings
        : storedUserListings;

    return normalizeListingList(sourceListings);
  }, [listings, storedUserListings, storetApp?.userListings]);

  const allListings = useMemo(() => {
    if (Array.isArray(storetApp?.listings) && storetApp.listings.length > 0) {
      return normalizeListingList(storetApp.listings);
    }

    return getListingCatalog(hostListings);
  }, [hostListings, storetApp?.listings]);

  const savedIds = normalizeSavedIds(
    savedListingIds ?? storetApp?.savedListingIds
  );

  const savedListings = useMemo(() => {
    const savedIdSet = new Set(savedIds.map(String));

    return allListings.filter((listing) => savedIdSet.has(String(listing.id)));
  }, [allListings, savedIds]);

  const instantHostListings = hostListings.filter(
    (listing) => listing.instantBook
  ).length;

  const waitlistHostListings = hostListings.filter(
    (listing) => listing.waitlist
  ).length;

  const activeHostListings = hostListings.filter(
    (listing) => listing.status !== "paused" && listing.status !== "archived"
  ).length;
  const hasHostedListings = hostListings.length > 0;
  const hostEntryPath = hasHostedListings ? APP_ROUTES.hostDashboard : APP_ROUTES.createListing;

  const renterBookingRequests = useMemo(() => {
    return getRenterBookingRequests(
      bookingRequests ?? storetApp?.bookingRequests ?? [],
      activeUser
    );
  }, [activeUser, bookingRequests, storetApp?.bookingRequests]);

  const renterHostMessages = useMemo(() => {
    return getRenterHostMessages(
      hostMessages ?? storetApp?.hostMessages ?? [],
      activeUser
    );
  }, [activeUser, hostMessages, storetApp?.hostMessages]);

  const completedPaymentCount = (paymentRecords ?? storetApp?.paymentRecords ?? []).length;

  function handleUnsave(listingId) {
    const toggleSaveAction = onToggleSave || storetApp?.actions?.toggleSave;

    if (toggleSaveAction) {
      toggleSaveAction(listingId);
    }
  }

  function handleCancelBookingRequest(requestId) {
    const updateBookingLifecycleAction =
      onUpdateBookingLifecycle || storetApp?.actions?.updateBookingLifecycle;

    if (updateBookingLifecycleAction) {
      updateBookingLifecycleAction(requestId, BOOKING_STATUSES.CANCELLED);
    }
  }

  function handleSwitchToRenter() {
    const result = storetApp?.actions?.switchActiveMode?.(APP_MODES.RENTER);

    if (result?.ok) {
      navigate(APP_ROUTES.explore);
    }
  }

  async function handleSwitchToHost() {
    if (!hasHostedListings) {
      setHostUpgradeIsSubmitting(true);
      const result = await storetApp?.actions?.becomeHost?.();
      setHostUpgradeIsSubmitting(false);

      if (result?.ok) {
        navigate(APP_ROUTES.createListing);
      }

      return;
    }

    const result = storetApp?.actions?.switchActiveMode?.(APP_MODES.HOST);

    if (result?.ok) {
      navigate(hostEntryPath);
    }
  }

  async function handleBecomeHost() {
    setHostUpgradeIsSubmitting(true);
    const result = await storetApp?.actions?.becomeHost?.();
    setHostUpgradeIsSubmitting(false);

    if (result?.ok) {
      navigate(APP_ROUTES.createListing);
    }
  }

  async function handleBecomeRenter() {
    setRenterUpgradeIsSubmitting(true);
    const result = await storetApp?.actions?.becomeRenter?.();
    setRenterUpgradeIsSubmitting(false);

    if (result?.ok) {
      navigate(APP_ROUTES.explore);
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
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar
                sx={{
                  width: { xs: 72, md: 88 },
                  height: { xs: 72, md: 88 },
                  bgcolor: "primary.main",
                  fontSize: { xs: "1.7rem", md: "2rem" },
                  fontWeight: 900,
                }}
              >
                {getInitials(activeUser?.fullName)}
              </Avatar>

              <Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  <Chip
                    icon={isHostMode ? <HomeWorkRoundedIcon /> : <PersonRoundedIcon />}
                    label={`${activeMode} mode`}
                    color="primary"
                    variant={isHostMode ? "filled" : "outlined"}
                    sx={{ fontWeight: 800 }}
                  />

                  <Chip
                    label={`${activeUser?.role || USER_ROLES.RENTER} account`}
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: "2.1rem", md: "3rem" },
                    lineHeight: 1,
                  }}
                >
                  {activeUser?.fullName || "Demo User"}
                </Typography>

                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {activeUser?.email || "demo@storet.com"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              {isHostMode && (
                <Button
                  component={RouterLink}
                  to={APP_ROUTES.createListing}
                  variant="contained"
                  startIcon={<AddHomeWorkRoundedIcon />}
                >
                  {hasHostedListings ? "List space" : "Create first listing"}
                </Button>
              )}

              {isRenterMode && canUseHostMode && (
                <Button
                  variant="outlined"
                  startIcon={<SwapHorizRoundedIcon />}
                  onClick={handleSwitchToHost}
                  disabled={!hasHostedListings && hostUpgradeIsSubmitting}
                >
                  {!hasHostedListings && hostUpgradeIsSubmitting ? "Opening setup..." : hasHostedListings ? "Switch to Host" : "Create first listing"}
                </Button>
              )}

              {isRenterMode && !canUseHostMode && (
                <Button
                  variant="contained"
                  startIcon={<HomeWorkRoundedIcon />}
                  onClick={handleBecomeHost}
                  disabled={hostUpgradeIsSubmitting}
                >
                  {hostUpgradeIsSubmitting ? "Updating..." : "Become a host"}
                </Button>
              )}

              {isHostMode && canUseRenterMode && (
                <Button
                  variant="outlined"
                  startIcon={<PersonRoundedIcon />}
                  onClick={handleSwitchToRenter}
                >
                  Switch to Renter
                </Button>
              )}

              {isHostMode && !canUseRenterMode && (
                <Button
                  variant="outlined"
                  startIcon={<PersonRoundedIcon />}
                  onClick={handleBecomeRenter}
                  disabled={renterUpgradeIsSubmitting}
                >
                  {renterUpgradeIsSubmitting ? "Updating..." : "Create renter account"}
                </Button>
              )}

            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          {storetApp?.listingsError && (
            <Alert severity="warning">{storetApp.listingsError}</Alert>
          )}

          {storetApp?.authError && (
            <Alert severity="warning">{storetApp.authError}</Alert>
          )}

          {isRenterMode && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <StatCard
                icon={<FavoriteRoundedIcon />}
                label="Saved spaces"
                value={savedListings.length}
                color="primary"
              />

              <StatCard
                icon={<EventAvailableRoundedIcon />}
                label="Reservations"
                value={renterBookingRequests.length}
                color="info"
              />

              <StatCard
                icon={<MailRoundedIcon />}
                label="Messages sent"
                value={renterHostMessages.length}
                color="primary"
              />

              <StatCard
                icon={<Inventory2RoundedIcon />}
                label="Payments"
                value={completedPaymentCount}
                color="success"
              />
            </Box>
          )}

          {isHostMode && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <StatCard
                icon={<HomeWorkRoundedIcon />}
                label="Hosted listings"
                value={hostListings.length}
                color="secondary"
              />

              <StatCard
                icon={<WarehouseRoundedIcon />}
                label="Active listings"
                value={activeHostListings}
                color="primary"
              />

              <StatCard
                icon={<BoltRoundedIcon />}
                label="Instant book"
                value={instantHostListings}
                color="success"
              />

              <StatCard
                icon={<EventAvailableRoundedIcon />}
                label="Waitlist listings"
                value={waitlistHostListings}
                color="warning"
              />
            </Box>
          )}

          <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
            <Box sx={{ flex: 1.4 }}>
              <Stack spacing={3}>
                {isRenterMode && (
                  <>
                    <Card>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={2.5}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                          >
                            <Box>
                              <Typography variant="h5">Saved spaces</Typography>
                              <Typography color="text.secondary">
                                Listings you have saved while browsing Storet.
                              </Typography>
                            </Box>

                            <Button
                              component={RouterLink}
                              to={APP_ROUTES.explore}
                              endIcon={<ArrowForwardRoundedIcon />}
                            >
                              Explore more
                            </Button>
                          </Stack>

                          <Divider />

                          {savedListings.length === 0 ? (
                            <EmptyState
                              icon={<FavoriteRoundedIcon />}
                              title="No saved spaces yet"
                              description="Save listings from Explore so you can compare them later."
                              actionLabel="Browse listings"
                              actionTo={APP_ROUTES.explore}
                            />
                          ) : (
                            <Stack spacing={2}>
                              {savedListings.map((listing) => (
                                <ListingRow
                                  key={listing.id}
                                  listing={listing}
                                  action={
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleUnsave(listing.id)}
                                    >
                                      Unsave
                                    </Button>
                                  }
                                />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={2.5}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                          >
                            <Box>
                              <Typography variant="h5">Reservation activity</Typography>
                              <Typography color="text.secondary">
                                Booking requests you have created from listing details.
                              </Typography>
                            </Box>

                            <Button
                              component={RouterLink}
                              to={APP_ROUTES.notifications}
                              endIcon={<ArrowForwardRoundedIcon />}
                            >
                              View activity
                            </Button>
                          </Stack>

                          <Divider />

                          {renterBookingRequests.length === 0 ? (
                            <EmptyState
                              icon={<EventAvailableRoundedIcon />}
                              title="No reservation activity yet"
                              description="Reserve, request, or join the waitlist for a listing to see it here."
                              actionLabel="Browse listings"
                              actionTo={APP_ROUTES.explore}
                            />
                          ) : (
                            <Stack spacing={2}>
                              {renterBookingRequests.slice(0, 4).map((request) => (
                                <BookingRequestRow
                                  key={request.id}
                                  request={request}
                                  onCancel={handleCancelBookingRequest}
                                />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={2.5}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                          >
                            <Box>
                              <Typography variant="h5">Messages to hosts</Typography>
                              <Typography color="text.secondary">
                                Questions you have sent from listing detail pages.
                              </Typography>
                            </Box>

                            <Button
                              component={RouterLink}
                              to={APP_ROUTES.notifications}
                              endIcon={<ArrowForwardRoundedIcon />}
                            >
                              View activity
                            </Button>
                          </Stack>

                          <Divider />

                          {renterHostMessages.length === 0 ? (
                            <EmptyState
                              icon={<MailRoundedIcon />}
                              title="No host messages yet"
                              description="Send a question from any listing detail page to see it here."
                              actionLabel="Browse listings"
                              actionTo={APP_ROUTES.explore}
                            />
                          ) : (
                            <Stack spacing={2}>
                              {renterHostMessages.slice(0, 4).map((message) => (
                                <HostMessageRow key={message.id} message={message} />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    {!canUseHostMode && (
                      <Card
                        sx={{
                          background:
                            "linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(20, 184, 166, 0.10))",
                        }}
                      >
                        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                          <Stack spacing={2}>
                            <Avatar sx={{ bgcolor: "primary.main" }}>
                              <HomeWorkRoundedIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h5">Have extra space?</Typography>
                              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                                Turn a garage, basement, spare room, or unused area into a
                                Storet listing when you are ready to host.
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              startIcon={<HomeWorkRoundedIcon />}
                              onClick={handleBecomeHost}
                              disabled={hostUpgradeIsSubmitting}
                              sx={{ width: "fit-content" }}
                            >
                              {hostUpgradeIsSubmitting ? "Updating..." : "Become a host"}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {isHostMode && (
                  <Card>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Stack spacing={2.5}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          justifyContent="space-between"
                        >
                          <Box>
                            <Typography variant="h5">Your hosted spaces</Typography>
                            <Typography color="text.secondary">
                              Listings you have created for renters to find.
                            </Typography>
                          </Box>

                          <Button
                            component={RouterLink}
                            to={APP_ROUTES.createListing}
                            variant="contained"
                            startIcon={<AddHomeWorkRoundedIcon />}
                          >
                            {hasHostedListings ? "New listing" : "Create first listing"}
                          </Button>
                        </Stack>

                        <Divider />

                        {hostListings.length === 0 ? (
                          <EmptyState
                            icon={<WarehouseRoundedIcon />}
                            title="No hosted spaces yet"
                            description="Create your first listing to start offering storage through Storet."
                            actionLabel="Create listing"
                            actionTo={APP_ROUTES.createListing}
                          />
                        ) : (
                          <Stack spacing={2}>
                            {hostListings.map((listing) => (
                              <ListingRow
                                key={listing.id}
                                listing={listing}
                                action={
                                  <Button
                                    size="small"
                                    component={RouterLink}
                                    to={buildListingPath(listing.id)}
                                    endIcon={<ArrowForwardRoundedIcon />}
                                  >
                                    View
                                  </Button>
                                }
                              />
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Box>

            <Box sx={{ width: { xs: "100%", lg: 360 } }}>
              <Stack spacing={3}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="h5">Account overview</Typography>
                        <Typography color="text.secondary">
                          Your current Storet setup and selected mode.
                        </Typography>
                      </Box>

                      <Divider />

                      <ProfileInfoRow
                        icon={<PersonRoundedIcon />}
                        label="Name"
                        value={activeUser?.fullName || "Demo User"}
                      />

                      <ProfileInfoRow
                        icon={<ShieldRoundedIcon />}
                        label="Account role"
                        value={activeUser?.role || USER_ROLES.RENTER}
                      />

                      <ProfileInfoRow
                        icon={isHostMode ? <HomeWorkRoundedIcon /> : <PersonRoundedIcon />}
                        label="Current mode"
                        value={activeMode}
                      />

                      {isRenterMode && (
                        <>
                          <ProfileInfoRow
                            icon={<Inventory2RoundedIcon />}
                            label="Saved listings"
                            value={`${savedListings.length} saved`}
                          />

                          <ProfileInfoRow
                            icon={<EventAvailableRoundedIcon />}
                            label="Reservation requests"
                            value={`${renterBookingRequests.length} total`}
                          />

                          <ProfileInfoRow
                            icon={<MailRoundedIcon />}
                            label="Host messages"
                            value={`${renterHostMessages.length} sent`}
                          />
                        </>
                      )}

                      {isHostMode && (
                        <>
                          <ProfileInfoRow
                            icon={<HomeWorkRoundedIcon />}
                            label="Hosted listings"
                            value={`${hostListings.length} total`}
                          />

                          <ProfileInfoRow
                            icon={<BoltRoundedIcon />}
                            label="Instant book listings"
                            value={`${instantHostListings} listings`}
                          />
                        </>
                      )}

                      {canUseRenterMode ? (
                        <Alert severity="info">
                          Use the profile chip in the navbar to switch between renter
                          and host mode when your account supports both.
                        </Alert>
                      ) : (
                        <Alert
                          severity="info"
                          action={
                            <Button
                              color="inherit"
                              size="small"
                              onClick={handleBecomeRenter}
                              disabled={renterUpgradeIsSubmitting}
                            >
                              {renterUpgradeIsSubmitting ? "Updating..." : "Add renter access"}
                            </Button>
                          }
                        >
                          Add renter access to browse, save, and book storage spaces.
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {isRenterOnly && (
                  <Alert severity="info">
                    Host tools stay hidden until you become a host, keeping renter
                    browsing and booking separate from listing management.
                  </Alert>
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.dark`,
            }}
          >
            {icon}
          </Avatar>

          <Box>
            <Typography variant="h5">{value}</Typography>
            <Typography color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ListingRow({ listing, action }) {
  return (
    <Card variant="outlined" sx={{ boxShadow: "none" }}>
      <CardActionArea component={RouterLink} to={buildListingPath(listing.id)}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  bgcolor:
                    listing.listingType === "Commercial"
                      ? "primary.main"
                      : "secondary.main",
                }}
              >
                <WarehouseRoundedIcon />
              </Avatar>

              <Box>
                <Typography fontWeight={900}>{listing.title}</Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 0.5 }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <PlaceRoundedIcon fontSize="inherit" />
                    {listing.location}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <StraightenRoundedIcon fontSize="inherit" />
                    {listing.sqft} sq ft
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              onClick={(event) => event.preventDefault()}
            >
              <Chip label={listing.startingPriceDisplay || listing.priceDisplay} size="small" />

              <Chip
                icon={<StarRoundedIcon />}
                label={Number(listing.rating || listing.averageRating || 0).toFixed(1)}
                size="small"
                variant="outlined"
              />

              {action}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function BookingRequestRow({ request, onCancel }) {
  const primaryAction = getBookingRequestPrimaryAction(request);
  const canCancel = [
    BOOKING_STATUSES.PENDING,
    BOOKING_STATUSES.APPROVED,
    BOOKING_STATUSES.WAITLISTED,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.ACTIVE,
  ].includes(request.status);

  return (
    <Card variant="outlined" sx={{ boxShadow: "none" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography fontWeight={900}>{request.listingTitle}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {request.rateDisplay} · {request.duration} · {request.moveInDate} to {request.moveOutDate}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip label={request.status} size="small" variant="outlined" />

            <Button
              size="small"
              component={RouterLink}
              to={primaryAction.to}
              endIcon={<ArrowForwardRoundedIcon />}
            >
              {primaryAction.label}
            </Button>

            {canCancel && (
              <Button
                size="small"
                color="error"
                onClick={() => onCancel?.(request.id)}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HostMessageRow({ message }) {
  return (
    <Card variant="outlined" sx={{ boxShadow: "none" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography fontWeight={900}>{message.listingTitle}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              To {message.hostName} · {message.message}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={message.status} size="small" variant="outlined" />
            <Button
              size="small"
              component={RouterLink}
              to={buildListingPath(message.listingId)}
              endIcon={<ArrowForwardRoundedIcon />}
            >
              Open listing
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProfileInfoRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        sx={{
          width: 38,
          height: 38,
          bgcolor: "primary.light",
          color: "primary.dark",
        }}
      >
        {icon}
      </Avatar>

      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography fontWeight={800}>{value}</Typography>
      </Box>
    </Stack>
  );
}

function EmptyState({ icon, title, description, actionLabel, actionTo }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 4,
        p: 4,
        textAlign: "center",
        bgcolor: "background.default",
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
          {icon}
        </Avatar>

        <Typography variant="h6">{title}</Typography>

        <Typography color="text.secondary" sx={{ maxWidth: 440 }}>
          {description}
        </Typography>

        <Button
          component={RouterLink}
          to={actionTo}
          variant="contained"
          endIcon={<ArrowForwardRoundedIcon />}
        >
          {actionLabel}
        </Button>
      </Stack>
    </Box>
  );
}

export default ProfilePage;
