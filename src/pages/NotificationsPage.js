import React, { useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";

import { NOTIFICATION_STATUSES } from "../constants/appEnums";
import { APP_ROUTES } from "../routes/appRoutes";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import {
  NOTIFICATION_TYPES,
  normalizeNotificationList,
} from "../utils/notificationUtils";

function formatNotificationTime(value) {
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

function getNotificationIcon(type) {
  if (type === NOTIFICATION_TYPES.BOOKING) return <EventAvailableRoundedIcon />;
  if (type === NOTIFICATION_TYPES.WAITLIST) return <ScheduleRoundedIcon />;
  if (type === NOTIFICATION_TYPES.MESSAGE) return <MailRoundedIcon />;
  if (type === NOTIFICATION_TYPES.PAYMENT) return <PaymentsRoundedIcon />;
  if (type === NOTIFICATION_TYPES.REVIEW) return <RateReviewRoundedIcon />;
  if (type === NOTIFICATION_TYPES.LISTING) return <HomeWorkRoundedIcon />;
  if (type === NOTIFICATION_TYPES.SAVED) return <FavoriteRoundedIcon />;
  return <NotificationsRoundedIcon />;
}

function getNotificationColor(type) {
  if (type === NOTIFICATION_TYPES.BOOKING) return "success";
  if (type === NOTIFICATION_TYPES.WAITLIST) return "warning";
  if (type === NOTIFICATION_TYPES.MESSAGE) return "info";
  if (type === NOTIFICATION_TYPES.PAYMENT) return "success";
  if (type === NOTIFICATION_TYPES.REVIEW) return "secondary";
  if (type === NOTIFICATION_TYPES.LISTING) return "primary";
  if (type === NOTIFICATION_TYPES.SAVED) return "primary";
  return "primary";
}

function NotificationsPage() {
  const storetApp = useOptionalStoretApp();
  const [filterType, setFilterType] = useState("all");
  const recentNotificationsRef = useRef(null);

  const activeUser = storetApp?.currentUser;
  const notifications = useMemo(
    () => normalizeNotificationList(storetApp?.notifications || []),
    [storetApp?.notifications]
  );
  const notificationsAreLoading = Boolean(storetApp?.notificationsAreLoading);
  const notificationsError = storetApp?.notificationsError || "";
  const unreadCount = storetApp?.unreadNotificationsCount || 0;

  const filteredNotifications = useMemo(() => {
    if (filterType === "all") {
      return notifications;
    }

    if (filterType === "unread") {
      return notifications.filter(
        (notification) => notification.status !== NOTIFICATION_STATUSES.READ
      );
    }

    return notifications.filter((notification) => notification.type === filterType);
  }, [filterType, notifications]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: unreadCount,
      bookings: notifications.filter(
        (notification) =>
          notification.type === NOTIFICATION_TYPES.BOOKING ||
          notification.type === NOTIFICATION_TYPES.WAITLIST
      ).length,
      messages: notifications.filter(
        (notification) => notification.type === NOTIFICATION_TYPES.MESSAGE
      ).length,
      payments: notifications.filter(
        (notification) => notification.type === NOTIFICATION_TYPES.PAYMENT
      ).length,
      reviews: notifications.filter(
        (notification) => notification.type === NOTIFICATION_TYPES.REVIEW
      ).length,
    };
  }, [notifications, unreadCount]);

  function handleFilterChange(event, nextValue) {
    if (nextValue) {
      setFilterType(nextValue);
    }
  }

  function handleSummaryCardClick(nextFilterType) {
    setFilterType(nextFilterType);
    recentNotificationsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleRefresh() {
    await storetApp?.actions?.refreshCurrentUserNotificationData?.();
  }

  async function handleMarkAllRead() {
    await storetApp?.actions?.markAllNotificationsRead?.();
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
                label="Backend notifications"
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
                  sx={{ mt: 1, maxWidth: 720, fontSize: "1.05rem" }}
                >
                  Storet now saves notifications in Supabase for booking updates,
                  host messages, payments, listing activity, and reviews.
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                onClick={handleRefresh}
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                sx={{ bgcolor: "background.paper" }}
              >
                Refresh
              </Button>

              <Button
                onClick={handleMarkAllRead}
                variant="contained"
                disabled={unreadCount === 0}
                startIcon={<CheckCircleRoundedIcon />}
              >
                Mark all read
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
              onClick={() => handleSummaryCardClick("all")}
            />
            <StatCard
              icon={<Badge color="error" badgeContent={stats.unread}><NotificationsRoundedIcon /></Badge>}
              label="Unread"
              value={stats.unread}
              color="error"
              onClick={() => handleSummaryCardClick("unread")}
            />
            <StatCard
              icon={<EventAvailableRoundedIcon />}
              label="Booking updates"
              value={stats.bookings}
              color="success"
              onClick={() => handleSummaryCardClick("booking")}
            />
            <StatCard
              icon={<MailRoundedIcon />}
              label="Messages"
              value={stats.messages}
              color="info"
              onClick={() => handleSummaryCardClick("message")}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box
            ref={recentNotificationsRef}
            sx={{ flex: 1, scrollMarginTop: { xs: "88px", md: "96px" } }}
          >
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
                      <Typography variant="h5">Recent notifications</Typography>
                      <Typography color="text.secondary">
                        Showing {filteredNotifications.length} update
                        {filteredNotifications.length === 1 ? "" : "s"}.
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
                      <ToggleButton value="unread">Unread</ToggleButton>
                      <ToggleButton value="booking">Bookings</ToggleButton>
                      <ToggleButton value="message">Messages</ToggleButton>
                      <ToggleButton value="payment">Payments</ToggleButton>
                      <ToggleButton value="review">Reviews</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  <Divider />

                  {notificationsError && <Alert severity="warning">{notificationsError}</Alert>}

                  {notificationsAreLoading ? (
                    <Stack spacing={2} alignItems="center" sx={{ py: 5 }}>
                      <CircularProgress />
                      <Typography color="text.secondary">Loading notifications…</Typography>
                    </Stack>
                  ) : filteredNotifications.length === 0 ? (
                    <EmptyNotificationState />
                  ) : (
                    <Stack spacing={0}>
                      {filteredNotifications.map((notification, index) => (
                        <NotificationTimelineItem
                          key={notification.id}
                          notification={notification}
                          isLast={index === filteredNotifications.length - 1}
                          onMarkRead={storetApp?.actions?.markNotificationRead}
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
                          {activeUser?.fullName || "Storet User"}
                        </Typography>
                        <Typography color="text.secondary">
                          {activeUser?.role || "Renter"} notifications
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider />

                    <Alert severity="info">
                      New notifications are generated by Supabase when booking,
                      message, payment, and review records change.
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h5">Notification types</Typography>

                    <InfoRow
                      icon={<EventAvailableRoundedIcon />}
                      title="Bookings"
                      description="New requests, approvals, confirmations, cancellations, and completed stays."
                    />

                    <InfoRow
                      icon={<MailRoundedIcon />}
                      title="Host messages"
                      description="Questions renters send to hosts about storage spaces."
                    />

                    <InfoRow
                      icon={<PaymentsRoundedIcon />}
                      title="Payments"
                      description="Stripe payment confirmations and receipt updates."
                    />

                    <InfoRow
                      icon={<RateReviewRoundedIcon />}
                      title="Reviews"
                      description="Verified reviews left after completed bookings."
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

function NotificationTimelineItem({ notification, isLast, onMarkRead }) {
  const color = getNotificationColor(notification.type);
  const isUnread = notification.status !== NOTIFICATION_STATUSES.READ;

  async function handleMarkRead() {
    await onMarkRead?.(notification.id);
  }

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
          {getNotificationIcon(notification.type)}
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
        <Card
          variant="outlined"
          sx={{
            boxShadow: "none",
            bgcolor: isUnread ? "action.hover" : "background.paper",
            borderColor: isUnread ? "primary.light" : "divider",
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography fontWeight={900}>{notification.title}</Typography>

                  <Chip
                    label={isUnread ? "Unread" : "Read"}
                    size="small"
                    color={isUnread ? "primary" : "default"}
                    variant={isUnread ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />

                  <Chip
                    label={notification.type}
                    size="small"
                    color={color}
                    variant="outlined"
                    sx={{ fontWeight: 700, textTransform: "capitalize" }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {formatNotificationTime(notification.createdAt || notification.time)}
                </Typography>
              </Stack>

              <Typography color="text.secondary" lineHeight={1.7}>
                {notification.description}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                {notification.actionTo && notification.actionLabel && (
                  <Button
                    component={RouterLink}
                    to={notification.actionTo}
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                  >
                    {notification.actionLabel}
                  </Button>
                )}

                {isUnread && (
                  <Button
                    onClick={handleMarkRead}
                    color="inherit"
                    startIcon={<CheckCircleRoundedIcon />}
                    sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                  >
                    Mark read
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        onClick={onClick}
        aria-label={`Show ${label.toLowerCase()} notifications`}
        sx={{ height: "100%" }}
      >
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
      </CardActionArea>
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

function EmptyNotificationState() {
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

        <Typography variant="h6">No notifications yet</Typography>

        <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
          Booking requests, host messages, Stripe payments, and reviews will show up
          here after the next backend events happen.
        </Typography>

        <Button
          component={RouterLink}
          to={APP_ROUTES.explore}
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
