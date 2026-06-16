import React, { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  //CardActions,
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
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { getListingCatalog } from "../data/listingCatalog";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
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
  onLogout,
}) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();

  const storedUser = getStoredCurrentUser() || {
    fullName: "Demo User",
    email: "demo@storet.com",
    role: "Renter",
    isAuthenticated: true,
  };

  const activeUser = currentUser || storetApp?.currentUser || storedUser;

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

  function handleLogoutClick() {
    const logoutAction = onLogout || storetApp?.actions?.logout;

    if (logoutAction) {
      logoutAction();
    }

    navigate(APP_ROUTES.home);
  }

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
                <Chip
                  icon={<PersonRoundedIcon />}
                  label={`${activeUser?.role || "Renter"} account`}
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1, fontWeight: 700 }}
                />

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
              <Button
                component={RouterLink}
                to={APP_ROUTES.notifications}
                variant="outlined"
                startIcon={<NotificationsRoundedIcon />}
                sx={{ bgcolor: "background.paper" }}
              >
                Activity
              </Button>

              <Button
                component={RouterLink}
                to={APP_ROUTES.createListing}
                variant="contained"
                startIcon={<AddHomeWorkRoundedIcon />}
              >
                List space
              </Button>

              <Button
                component={RouterLink}
                to={APP_ROUTES.hostDashboard}
                variant="outlined"
                startIcon={<HomeWorkRoundedIcon />}
              >
                Host dashboard
              </Button>

              <Button
                variant="text"
                color="inherit"
                startIcon={<LogoutRoundedIcon />}
                onClick={handleLogoutClick}
              >
                Log out
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          {storetApp?.listingsError && (
            <Alert severity="warning">{storetApp.listingsError}</Alert>
          )}

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
              icon={<HomeWorkRoundedIcon />}
              label="Your listings"
              value={hostListings.length}
              color="secondary"
            />

            <StatCard
              icon={<MailRoundedIcon />}
              label="Messages sent"
              value={renterHostMessages.length}
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

          <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
            <Box sx={{ flex: 1.4 }}>
              <Stack spacing={3}>
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
                            Local booking requests created from listing details.
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
                          New listing
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
                          Your current Storet profile setup.
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
                        label="Role"
                        value={activeUser?.role || "Renter"}
                      />

                      <ProfileInfoRow
                        icon={<Inventory2RoundedIcon />}
                        label="Saved listings"
                        value={`${savedListings.length} saved`}
                      />

                      <ProfileInfoRow
                        icon={<EventAvailableRoundedIcon />}
                        label="Reservation requests"
                        value={`${renterBookingRequests.length} local`}
                      />

                      <ProfileInfoRow
                        icon={<MailRoundedIcon />}
                        label="Host messages"
                        value={`${renterHostMessages.length} sent`}
                      />

                      <ProfileInfoRow
                        icon={<BoltRoundedIcon />}
                        label="Mock payments"
                        value={`${completedPaymentCount} completed`}
                      />

                      <ProfileInfoRow
                        icon={<HomeWorkRoundedIcon />}
                        label="Hosted listings"
                        value={`${hostListings.length} active`}
                      />

                      <Alert severity="info">
                        Profile details are still local-demo data for now. Later,
                        this can connect to real account settings.
                      </Alert>
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Typography variant="h5">Quick actions</Typography>

                      <Button
                        component={RouterLink}
                        to={APP_ROUTES.explore}
                        variant="outlined"
                        fullWidth
                        startIcon={<WarehouseRoundedIcon />}
                      >
                        Browse storage
                      </Button>

                      <Button
                        component={RouterLink}
                        to={APP_ROUTES.createListing}
                        variant="outlined"
                        fullWidth
                        startIcon={<AddHomeWorkRoundedIcon />}
                      >
                        Create listing
                      </Button>

                      <Button
                        component={RouterLink}
                        to={APP_ROUTES.notifications}
                        variant="outlined"
                        fullWidth
                        startIcon={<NotificationsRoundedIcon />}
                      >
                        View activity
                      </Button>

                      <Button
                        component={RouterLink}
                        to={APP_ROUTES.hostDashboard}
                        variant="outlined"
                        fullWidth
                        startIcon={<HomeWorkRoundedIcon />}
                      >
                        Host dashboard
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
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
                label={listing.rating.toFixed(1)}
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