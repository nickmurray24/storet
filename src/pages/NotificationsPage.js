import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { ACTIVITY_FEED_KEY } from "../constants/storageKeys";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { buildBookingActivity } from "../utils/bookingUtils";
import { buildHostMessageActivity } from "../utils/hostMessageUtils";
import { normalizeListingList, normalizeSavedIds } from "../utils/listingUtils";
import {
  getStoredCurrentUser,
  readSavedListingIds,
  readUserListings,
  safeReadJson,
} from "../utils/storage";

function formatActivityTime(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

function getActivityIcon(type) {
  if (type === "booking") return <EventAvailableRoundedIcon />;
  if (type === "saved") return <FavoriteRoundedIcon />;
  if (type === "listing") return <HomeWorkRoundedIcon />;
  if (type === "waitlist") return <ScheduleRoundedIcon />;
  if (type === "message") return <MailRoundedIcon />;
  if (type === "system") return <CheckCircleRoundedIcon />;
  return <NotificationsRoundedIcon />;
}

function getActivityColor(type) {
  if (type === "booking") return "success";
  if (type === "saved") return "primary";
  if (type === "listing") return "secondary";
  if (type === "waitlist") return "warning";
  if (type === "message") return "info";
  if (type === "system") return "primary";
  return "primary";
}

function buildFallbackActivities(activeUser, hostListings, savedIds) {
  const now = new Date();

  const baseActivities = [
    {
      id: "fallback-system-1",
      type: "system",
      title: "Welcome to your Storet activity feed",
      description:
        "Booking updates, saved spaces, listing activity, and waitlist changes will appear here.",
      time: new Date(now.getTime() - 1000 * 60 * 12).toISOString(),
      status: "New",
      actionLabel: "Explore spaces",
      actionTo: "/explore",
    },
    {
      id: "fallback-booking-1",
      type: "booking",
      title: "Reservation flow is ready for testing",
      description:
        "Instant booking and request-based listings can now show renter activity in this feed.",
      time: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
      status: "Demo",
      actionLabel: "Browse listings",
      actionTo: "/explore",
    },
    {
      id: "fallback-waitlist-1",
      type: "waitlist",
      title: "Waitlist updates will be tracked here",
      description:
        "When a renter joins a waitlist, this page can later show host and renter updates.",
      time: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
      status: "Planned",
      actionLabel: "View listings",
      actionTo: "/explore",
    },
  ];

  const listingActivities = hostListings.slice(0, 3).map((listing) => ({
    id: `listing-${listing.id}`,
    type: "listing",
    title: `${listing.title} is active`,
    description: `${listing.location} · ${listing.sqft} sq ft · $${listing.price}/mo`,
    time: listing.createdAt,
    status: listing.instantBook
      ? "Instant book"
      : listing.waitlist
      ? "Waitlist"
      : "Request",
    actionLabel: "View listing",
    actionTo: `/listing/${listing.id}`,
  }));

  const savedActivity =
    savedIds.length > 0
      ? [
          {
            id: "saved-summary",
            type: "saved",
            title: `${savedIds.length} saved ${
              savedIds.length === 1 ? "space" : "spaces"
            }`,
            description:
              "Your saved spaces are ready to compare from your profile page.",
            time: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
            status: "Saved",
            actionLabel: "View profile",
            actionTo: "/profile",
          },
        ]
      : [];

  return [...listingActivities, ...savedActivity, ...baseActivities].map(
    (activity) => ({
      ...activity,
      userName: activeUser?.fullName || "Demo User",
    })
  );
}

function NotificationsPage({ currentUser, bookingRequests, hostMessages }) {
  const storetApp = useOptionalStoretApp();
  const [filterType, setFilterType] = useState("all");

  const storedUser = getStoredCurrentUser() || {
    fullName: "Demo User",
    email: "demo@storet.com",
    role: "Renter",
    isAuthenticated: true,
  };

  const activeUser = currentUser || storetApp?.currentUser || storedUser;

  const hostListings = useMemo(() => {
    if (Array.isArray(storetApp?.userListings)) {
      return normalizeListingList(storetApp.userListings);
    }

    return normalizeListingList(readUserListings());
  }, [storetApp?.userListings]);

  const savedIds = useMemo(() => {
    return normalizeSavedIds(
      storetApp?.savedListingIds ?? readSavedListingIds()
    );
  }, [storetApp?.savedListingIds]);

  const activities = useMemo(() => {
    const storedActivities = safeReadJson(ACTIVITY_FEED_KEY, []);
    const safeStoredActivities = Array.isArray(storedActivities)
      ? storedActivities
      : [];

    const generatedActivities = buildFallbackActivities(
      activeUser,
      hostListings,
      savedIds
    );

    const hostListingIds = new Set(hostListings.map((listing) => String(listing.id)));
    const activeEmail = activeUser?.email?.toLowerCase?.() || "";

    const activeHostMessages = hostMessages ?? storetApp?.hostMessages ?? [];

    const relevantHostMessages = (Array.isArray(activeHostMessages) ? activeHostMessages : []).filter((message) => {
      const sentByActiveUser = activeEmail && message.senderEmail?.toLowerCase?.() === activeEmail;
      const sentToActiveHostListing = hostListingIds.has(String(message.listingId));

      return sentByActiveUser || sentToActiveHostListing;
    });

    const activeBookingRequests = bookingRequests ?? storetApp?.bookingRequests ?? [];
    const bookingActivities = activeBookingRequests.map(buildBookingActivity);
    const messageActivities = relevantHostMessages.map(buildHostMessageActivity);

    const combinedActivities = [
      ...safeStoredActivities,
      ...messageActivities,
      ...bookingActivities,
      ...generatedActivities,
    ];

    const seenIds = new Set();

    return combinedActivities
      .filter((activity) => {
        if (!activity?.id || seenIds.has(activity.id)) {
          return false;
        }

        seenIds.add(activity.id);
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.time || 0).getTime();
        const bTime = new Date(b.time || 0).getTime();

        return bTime - aTime;
      });
  }, [activeUser, bookingRequests, hostListings, hostMessages, savedIds, storetApp?.bookingRequests, storetApp?.hostMessages]);

  const filteredActivities = useMemo(() => {
    if (filterType === "all") {
      return activities;
    }

    return activities.filter((activity) => activity.type === filterType);
  }, [activities, filterType]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      bookings: activities.filter((activity) => activity.type === "booking")
        .length,
      listings: activities.filter((activity) => activity.type === "listing")
        .length,
      waitlist: activities.filter((activity) => activity.type === "waitlist")
        .length,
      messages: activities.filter((activity) => activity.type === "message")
        .length,
    };
  }, [activities]);

  function handleFilterChange(event, nextValue) {
    if (nextValue) {
      setFilterType(nextValue);
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
            <Stack spacing={1.5}>
              <Chip
                icon={<NotificationsRoundedIcon />}
                label="Activity center"
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
                  Notifications
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 680, fontSize: "1.05rem" }}
                >
                  Track reservation updates, saved spaces, listing activity, and
                  waitlist changes in one clean feed.
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                component={RouterLink}
                to="/explore"
                variant="outlined"
                startIcon={<WarehouseRoundedIcon />}
                sx={{ bgcolor: "background.paper" }}
              >
                Explore
              </Button>

              <Button
                component={RouterLink}
                to="/create-listing"
                variant="contained"
                startIcon={<AddHomeWorkRoundedIcon />}
              >
                List space
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
              mt: 4,
            }}
          >
            <StatCard
              icon={<NotificationsRoundedIcon />}
              label="Total updates"
              value={stats.total}
              color="primary"
            />
            <StatCard
              icon={<EventAvailableRoundedIcon />}
              label="Booking updates"
              value={stats.bookings}
              color="success"
            />
            <StatCard
              icon={<HomeWorkRoundedIcon />}
              label="Listing updates"
              value={stats.listings}
              color="secondary"
            />
            <StatCard
              icon={<ScheduleRoundedIcon />}
              label="Waitlist updates"
              value={stats.waitlist}
              color="warning"
            />
            <StatCard
              icon={<MailRoundedIcon />}
              label="Message updates"
              value={stats.messages}
              color="info"
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="h5">Recent activity</Typography>
                      <Typography color="text.secondary">
                        Showing {filteredActivities.length} update
                        {filteredActivities.length === 1 ? "" : "s"}.
                      </Typography>
                    </Box>

                    <ToggleButtonGroup
                      value={filterType}
                      exclusive
                      onChange={handleFilterChange}
                      color="primary"
                      sx={{
                        flexWrap: "wrap",
                        "& .MuiToggleButton-root": {
                          textTransform: "none",
                          fontWeight: 700,
                        },
                      }}
                    >
                      <ToggleButton value="all">All</ToggleButton>
                      <ToggleButton value="booking">Bookings</ToggleButton>
                      <ToggleButton value="listing">Listings</ToggleButton>
                      <ToggleButton value="saved">Saved</ToggleButton>
                      <ToggleButton value="waitlist">Waitlist</ToggleButton>
                      <ToggleButton value="message">Messages</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  <Divider />

                  {filteredActivities.length === 0 ? (
                    <EmptyActivityState />
                  ) : (
                    <Stack spacing={0}>
                      {filteredActivities.map((activity, index) => (
                        <ActivityTimelineItem
                          key={activity.id}
                          activity={activity}
                          isLast={index === filteredActivities.length - 1}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: { xs: "100%", lg: 360 } }}>
            <Stack spacing={3}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main", fontWeight: 900 }}>
                        {activeUser?.fullName?.charAt(0)?.toUpperCase() || "S"}
                      </Avatar>

                      <Box>
                        <Typography fontWeight={900}>
                          {activeUser?.fullName || "Demo User"}
                        </Typography>
                        <Typography color="text.secondary">
                          {activeUser?.role || "Renter"} activity
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider />

                    <Alert severity="info">
                      This activity center now includes local booking, waitlist,
                      saved-space, listing, and host message updates.
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h5">Quick links</Typography>

                    <Button
                      component={RouterLink}
                      to="/profile"
                      variant="outlined"
                      fullWidth
                      startIcon={<PersonRoundedIcon />}
                    >
                      View profile
                    </Button>

                    <Button
                      component={RouterLink}
                      to="/explore"
                      variant="outlined"
                      fullWidth
                      startIcon={<Inventory2RoundedIcon />}
                    >
                      Browse spaces
                    </Button>

                    <Button
                      component={RouterLink}
                      to="/create-listing"
                      variant="outlined"
                      fullWidth
                      startIcon={<AddHomeWorkRoundedIcon />}
                    >
                      Create listing
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h5">What appears here?</Typography>

                    <InfoRow
                      icon={<BoltRoundedIcon />}
                      title="Instant bookings"
                      description="Reservation confirmations and booking changes."
                    />

                    <InfoRow
                      icon={<ScheduleRoundedIcon />}
                      title="Waitlists"
                      description="Updates when renters join or leave a waitlist."
                    />

                    <InfoRow
                      icon={<FavoriteRoundedIcon />}
                      title="Saved spaces"
                      description="Saved listing and comparison activity."
                    />

                    <InfoRow
                      icon={<MailRoundedIcon />}
                      title="Host messages"
                      description="Questions sent to hosts and inbox updates."
                    />

                    <InfoRow
                      icon={<HomeWorkRoundedIcon />}
                      title="Host activity"
                      description="New listings and host-side storage updates."
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function ActivityTimelineItem({ activity, isLast }) {
  const color = getActivityColor(activity.type);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar
          sx={{
            bgcolor: `${color}.light`,
            color: `${color}.dark`,
            width: 42,
            height: 42,
          }}
        >
          {getActivityIcon(activity.type)}
        </Avatar>

        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: "divider",
              my: 1,
            }}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, pb: isLast ? 0 : 3 }}>
        <Card variant="outlined" sx={{ boxShadow: "none" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={900}>{activity.title}</Typography>

                  {activity.status && (
                    <Chip
                      label={activity.status}
                      size="small"
                      color={color}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {formatActivityTime(activity.time)}
                </Typography>
              </Stack>

              <Typography color="text.secondary" lineHeight={1.7}>
                {activity.description}
              </Typography>

              {activity.actionTo && activity.actionLabel && (
                <Button
                  component={RouterLink}
                  to={activity.actionTo}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {activity.actionLabel}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
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

function InfoRow({ icon, title, description }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
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
        <Typography fontWeight={900}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

function EmptyActivityState() {
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
          <NotificationsRoundedIcon />
        </Avatar>

        <Typography variant="h6">No activity for this filter</Typography>

        <Typography color="text.secondary" sx={{ maxWidth: 440 }}>
          Try switching back to all activity, or continue using Storet to create
          more booking, listing, and saved-space updates.
        </Typography>

        <Button
          component={RouterLink}
          to="/explore"
          variant="contained"
          endIcon={<ArrowForwardRoundedIcon />}
        >
          Explore spaces
        </Button>
      </Stack>
    </Box>
  );
}

export default NotificationsPage;