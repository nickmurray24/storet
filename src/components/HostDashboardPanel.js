import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import PauseCircleRoundedIcon from "@mui/icons-material/PauseCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
import { BOOKING_STATUSES } from "../utils/bookingUtils";
import { getDefaultStatusBreakdown, getHostAnalyticsSummaryValue } from "../utils/hostAnalyticsUtils";
import {
  getBookingRequestPrimaryAction,
  getBookingTimestamp,
  sortBookingRequestsByNewest,
} from "../utils/bookingSelectors";

const APPROVED_OR_BETTER_STATUSES = [
  BOOKING_STATUSES.APPROVED,
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.ACTIVE,
  BOOKING_STATUSES.COMPLETED,
];

const BOOKED_STATUSES = [
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.ACTIVE,
  BOOKING_STATUSES.COMPLETED,
];

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "Recently";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPriceValue(price) {
  const numeric = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function formatMoneyExact(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function getStatusChipProps(status = "") {
  const statusMap = {
    [BOOKING_STATUSES.PENDING]: {
      color: "warning",
      icon: <PendingActionsRoundedIcon />,
    },
    [BOOKING_STATUSES.APPROVED]: {
      color: "success",
      icon: <CheckCircleRoundedIcon />,
    },
    [BOOKING_STATUSES.WAITLISTED]: {
      color: "info",
      icon: <HourglassTopRoundedIcon />,
    },
    [BOOKING_STATUSES.DECLINED]: {
      color: "error",
      icon: <CancelRoundedIcon />,
    },
    [BOOKING_STATUSES.CONFIRMED]: {
      color: "success",
      icon: <TaskAltRoundedIcon />,
    },
    [BOOKING_STATUSES.ACTIVE]: {
      color: "primary",
      icon: <PlayCircleRoundedIcon />,
    },
    [BOOKING_STATUSES.COMPLETED]: {
      color: "default",
      icon: <TaskAltRoundedIcon />,
    },
    [BOOKING_STATUSES.CANCELLED]: {
      color: "default",
      icon: <CancelRoundedIcon />,
    },
  };

  return statusMap[status] || { color: "default", icon: null };
}

function getListingRating(listing = {}) {
  return Number(listing.averageRating || listing.rating || 0);
}

function getListingReviewCount(listing = {}) {
  return Number(listing.reviewCount || listing.reviews || 0);
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      sx={{ mb: 2.5 }}
    >
      <Box>
        {eyebrow && (
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 900, letterSpacing: 1.2 }}
          >
            {eyebrow}
          </Typography>
        )}

        <Typography variant="h4" sx={{ fontSize: { xs: "1.45rem", md: "1.8rem" } }}>
          {title}
        </Typography>

        {description && (
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );
}

function StatCard({ icon, label, value, helper, tone = "primary" }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={(theme) => ({
              width: 42,
              height: 42,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              color: `${tone}.main`,
              bgcolor: alpha(theme.palette[tone]?.main || theme.palette.primary.main, 0.1),
              flexShrink: 0,
            })}
          >
            {icon}
          </Box>

          <Box>
            <Typography variant="h4" sx={{ lineHeight: 1, fontWeight: 900 }}>
              {value}
            </Typography>
            <Typography sx={{ mt: 0.5, fontWeight: 800 }}>{label}</Typography>
            {helper && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {helper}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 4,
        bgcolor: "background.default",
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: "center" }}>
        <Box
          sx={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            bgcolor: "background.paper",
            display: "grid",
            placeItems: "center",
            mx: "auto",
            mb: 1.5,
            color: "primary.main",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {icon}
        </Box>

        <Typography variant="h5">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, mb: action ? 2 : 0 }}>
          {description}
        </Typography>
        {action}
      </CardContent>
    </Card>
  );
}

function MetricPill({ label, value }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        px: 1.5,
        py: 1.15,
        bgcolor: "background.default",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 900 }}>{value}</Typography>
    </Box>
  );
}

function DetailRow({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>{value || "Not provided"}</Typography>
    </Box>
  );
}

function BookingActionButtons({ request, onUpdateBookingRequestStatus, onUpdateBookingLifecycle }) {
  const primaryAction = getBookingRequestPrimaryAction(request);

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
      {request.status === BOOKING_STATUSES.PENDING && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckCircleRoundedIcon />}
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.APPROVED)}
          >
            Approve
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<HourglassTopRoundedIcon />}
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.WAITLISTED)}
          >
            Waitlist
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelRoundedIcon />}
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.DECLINED)}
          >
            Decline
          </Button>
        </>
      )}

      {request.status === BOOKING_STATUSES.WAITLISTED && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckCircleRoundedIcon />}
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.APPROVED)}
          >
            Approve
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.PENDING)}
          >
            Move to pending
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.CANCELLED)}
          >
            Cancel
          </Button>
        </>
      )}

      {request.status === BOOKING_STATUSES.APPROVED && (
        <>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.PENDING)}
          >
            Move to pending
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => onUpdateBookingRequestStatus(request.id, BOOKING_STATUSES.WAITLISTED)}
          >
            Move to waitlist
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.CANCELLED)}
          >
            Cancel
          </Button>
        </>
      )}

      {request.status === BOOKING_STATUSES.CONFIRMED && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayCircleRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.ACTIVE)}
          >
            Mark active
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.CANCELLED)}
          >
            Cancel
          </Button>
        </>
      )}

      {request.status === BOOKING_STATUSES.ACTIVE && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<TaskAltRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.COMPLETED)}
          >
            Mark completed
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CancelRoundedIcon />}
            onClick={() => onUpdateBookingLifecycle(request.id, BOOKING_STATUSES.CANCELLED)}
          >
            Cancel
          </Button>
        </>
      )}

      <Button
        component={RouterLink}
        to={primaryAction.to}
        variant="text"
        size="small"
        endIcon={<ArrowForwardRoundedIcon />}
      >
        {primaryAction.label}
      </Button>
    </Stack>
  );
}

function BookingRequestCard({ request, onUpdateBookingRequestStatus, onUpdateBookingLifecycle }) {
  const chipProps = getStatusChipProps(request.status);

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              icon={chipProps.icon}
              label={request.status}
              color={chipProps.color}
              size="small"
              sx={{ fontWeight: 800 }}
            />
            <Chip
              icon={<ScheduleRoundedIcon />}
              label={formatDateTime(getBookingTimestamp(request))}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
            {request.rateDisplay || formatMoney(request.listingPrice)}
          </Typography>
        </Stack>

        <Typography variant="h5" sx={{ mb: 0.5 }}>
          {request.listingTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Request from {request.renterName || "Renter"}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 1.5,
            mb: request.notes || request.waitlistReason ? 2 : 0,
          }}
        >
          <DetailRow label="Renter email" value={request.renterEmail} />
          <DetailRow label="Move-in" value={request.moveInDate} />
          <DetailRow label="Move-out" value={request.moveOutDate} />
          <DetailRow label="Duration" value={request.duration} />
        </Box>

        {(request.waitlistReason || request.notes) && (
          <Stack spacing={1.25} sx={{ mb: 0.5 }}>
            {request.waitlistReason && (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 3 }}>
                <strong>Waitlist reason:</strong> {request.waitlistReason}
              </Alert>
            )}

            {request.notes && (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 3 }}>
                <strong>Renter notes:</strong> {request.notes}
              </Alert>
            )}
          </Stack>
        )}

        <BookingActionButtons
          request={request}
          onUpdateBookingRequestStatus={onUpdateBookingRequestStatus}
          onUpdateBookingLifecycle={onUpdateBookingLifecycle}
        />
      </CardContent>
    </Card>
  );
}

function AttentionItem({ listing }) {
  const chips = [
    listing.pending > 0 && { label: `${listing.pending} pending`, color: "warning" },
    listing.waitlisted > 0 && { label: `${listing.waitlisted} waitlisted`, color: "info" },
    listing.unreadMessages > 0 && { label: `${listing.unreadMessages} unread`, color: "error" },
    listing.status === "paused" && { label: "Paused", color: "default" },
  ].filter(Boolean);

  return (
    <Card
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">{listing.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {listing.location}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {chips.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                color={chip.color}
                size="small"
                sx={{ fontWeight: 800 }}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ListingPerformanceCard({ listing }) {
  const requestProgress = Math.min(100, listing.totalRequests * 20);
  const bookedProgress = listing.totalRequests > 0 ? (listing.confirmed / listing.totalRequests) * 100 : 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{listing.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {listing.location}
            </Typography>
          </Box>

          <Chip
            icon={<StarRoundedIcon />}
            label={
              getListingReviewCount(listing) > 0
                ? `${getListingRating(listing).toFixed(1)} (${getListingReviewCount(listing)})`
                : "No reviews"
            }
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </Stack>

        <Box sx={{ my: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
              Request activity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {listing.totalRequests} total
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={requestProgress}
            sx={{ height: 8, borderRadius: 999, mb: 1.5 }}
          />

          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
              Confirmed bookings
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {listing.confirmed}
            </Typography>
          </Stack>
          <LinearProgress
            color="success"
            variant="determinate"
            value={bookedProgress}
            sx={{ height: 8, borderRadius: 999 }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1,
          }}
        >
          <MetricPill label="Pending" value={listing.pending} />
          <MetricPill label="Waitlisted" value={listing.waitlisted} />
          <MetricPill label="Messages" value={listing.messageCount} />
          <MetricPill label="Booked est." value={formatMoney(listing.bookedEstimate)} />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            component={RouterLink}
            to={buildListingPath(listing.id)}
            variant="outlined"
            size="small"
            startIcon={<VisibilityRoundedIcon />}
          >
            View
          </Button>
          <Button
            component={RouterLink}
            to={APP_ROUTES.createListing}
            variant="text"
            size="small"
            endIcon={<ArrowForwardRoundedIcon />}
          >
            Create similar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MessageCard({ message, onUpdateHostMessageStatus }) {
  const isRead = message.status === "Read";

  return (
    <Card
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 1 }}
        >
          <Chip
            icon={<MailRoundedIcon />}
            label={message.status}
            color={isRead ? "default" : "primary"}
            size="small"
            sx={{ fontWeight: 800 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
            {formatDateTime(message.submittedAt)}
          </Typography>
        </Stack>

        <Typography variant="h6">{message.listingTitle}</Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          From {message.senderName || "Renter"} · {message.senderEmail || "No email"}
        </Typography>
        <Typography sx={{ mb: 2 }}>{message.message}</Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant={isRead ? "outlined" : "contained"}
            size="small"
            startIcon={<MailRoundedIcon />}
            onClick={() => onUpdateHostMessageStatus(message.id, isRead ? "Unread" : "Read")}
          >
            Mark {isRead ? "unread" : "read"}
          </Button>
          <Button
            component={RouterLink}
            to={buildListingPath(message.listingId)}
            variant="text"
            size="small"
            endIcon={<ArrowForwardRoundedIcon />}
          >
            Open listing
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}


function AnalyticsBarList({ title, description, icon, items, valueFormatter = (value) => value }) {
  const safeItems = Array.isArray(items) ? items : [];
  const maxValue = Math.max(...safeItems.map((item) => Number(item.value || 0)), 1);

  return (
    <Card
      elevation={0}
      sx={{ height: "100%", border: "1px solid", borderColor: "divider", borderRadius: 5 }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box
            sx={(theme) => ({
              width: 42,
              height: 42,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              flexShrink: 0,
            })}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          </Box>
        </Stack>

        {safeItems.length > 0 ? (
          <Stack spacing={1.5}>
            {safeItems.map((item) => {
              const value = Number(item.value || 0);
              const percent = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

              return (
                <Box key={item.key || item.label}>
                  <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {valueFormatter(value, item)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            Analytics will populate as Stripe payments and booking activity come in.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function HostListingCard({ listing, onDeleteListing, onToggleListingStatus }) {
  const isPaused = listing.status === "paused";

  function handleDelete() {
    const shouldDelete = window.confirm(
      `Delete "${listing.title}"? This will remove the listing and its related activity.`
    );

    if (shouldDelete) {
      onDeleteListing(listing.id);
    }
  }

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
          <Chip
            label={listing.listingType || listing.type || "Private host"}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800 }}
          />
          <Chip
            label={isPaused ? "Paused" : "Active"}
            color={isPaused ? "default" : "success"}
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </Stack>

        <Typography variant="h6">{listing.title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.25 }}>
          {listing.location}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1,
            my: 2,
          }}
        >
          <MetricPill label="Rates" value={listing.pricingSummary || listing.priceDisplay || "$0/month"} />
          <MetricPill
            label="Booking"
            value={listing.instantBook ? "Instant" : listing.waitlist ? "Waitlist" : "Approval"}
          />
          <MetricPill label="Waitlist" value={listing.waitlist ? "Enabled" : "Disabled"} />
          <MetricPill label="Status" value={isPaused ? "Paused" : "Live"} />
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            component={RouterLink}
            to={buildListingPath(listing.id)}
            variant="outlined"
            size="small"
            startIcon={<VisibilityRoundedIcon />}
          >
            View
          </Button>

          <Button
            component={RouterLink}
            to={APP_ROUTES.createListing}
            variant="text"
            size="small"
          >
            Create similar
          </Button>

          <Button
            variant="outlined"
            color={isPaused ? "success" : "warning"}
            size="small"
            startIcon={isPaused ? <PlayCircleRoundedIcon /> : <PauseCircleRoundedIcon />}
            onClick={() => onToggleListingStatus(listing.id)}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>

          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteRoundedIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HostDashboardPanel({
  myListings,
  bookingRequests,
  hostMessages,
  onDeleteListing,
  onToggleListingStatus,
  onUpdateBookingRequestStatus,
  onUpdateBookingLifecycle,
  onUpdateHostMessageStatus,
}) {
  const storetApp = useOptionalStoretApp();

  const safeMyListings = Array.isArray(myListings)
    ? myListings
    : storetApp?.userListings ?? [];
  const sortedBookingRequests = sortBookingRequestsByNewest(
    bookingRequests ?? storetApp?.hostBookingRequests ?? []
  );
  const safeHostMessages = Array.isArray(hostMessages)
    ? hostMessages
    : storetApp?.hostDashboardMessages ?? [];

  const backendAnalytics = storetApp?.hostAnalytics || null;
  const backendSummary = backendAnalytics?.summary || {};
  const backendListingAnalytics = Array.isArray(backendAnalytics?.listingAnalytics)
    ? backendAnalytics.listingAnalytics
    : [];
  const monthlyRevenueItems = Array.isArray(backendAnalytics?.monthlyRevenue)
    ? backendAnalytics.monthlyRevenue.map((item) => ({
        key: item.month || item.label,
        label: item.label || item.month,
        value: item.revenue || 0,
        paymentCount: item.paymentCount || 0,
      }))
    : [];
  const statusBreakdownItems = (
    Array.isArray(backendAnalytics?.statusBreakdown) && backendAnalytics.statusBreakdown.length > 0
      ? backendAnalytics.statusBreakdown
      : getDefaultStatusBreakdown()
  ).map((item) => ({
    key: item.status,
    label: item.status,
    value: item.count || 0,
  }));

  const deleteListingAction =
    onDeleteListing || storetApp?.actions?.deleteListing || (() => {});
  const toggleListingStatusAction =
    onToggleListingStatus || storetApp?.actions?.toggleListingStatus || (() => {});
  const updateBookingRequestStatusAction =
    onUpdateBookingRequestStatus ||
    storetApp?.actions?.updateBookingRequestStatus ||
    (() => {});
  const updateBookingLifecycleAction =
    onUpdateBookingLifecycle ||
    storetApp?.actions?.updateBookingLifecycle ||
    (() => {});
  const updateHostMessageStatusAction =
    onUpdateHostMessageStatus ||
    storetApp?.actions?.updateHostMessageStatus ||
    (() => {});

  const localActiveCount = safeMyListings.filter((listing) => listing.status !== "paused").length;
  const localPausedCount = safeMyListings.filter((listing) => listing.status === "paused").length;
  const localPendingRequestCount = sortedBookingRequests.filter(
    (request) => request.status === BOOKING_STATUSES.PENDING
  ).length;
  const localWaitlistedCount = sortedBookingRequests.filter(
    (request) => request.status === BOOKING_STATUSES.WAITLISTED
  ).length;
  const localUnreadMessageCount = safeHostMessages.filter((message) => message.status === "Unread").length;
  const localConfirmedCount = sortedBookingRequests.filter(
    (request) => request.status === BOOKING_STATUSES.CONFIRMED
  ).length;
  const localActiveBookingCount = sortedBookingRequests.filter(
    (request) => request.status === BOOKING_STATUSES.ACTIVE
  ).length;
  const localCompletedCount = sortedBookingRequests.filter(
    (request) => request.status === BOOKING_STATUSES.COMPLETED
  ).length;

  const activeCount = getHostAnalyticsSummaryValue(backendSummary, "activeListings", localActiveCount);
  const pausedCount = getHostAnalyticsSummaryValue(backendSummary, "pausedListings", localPausedCount);
  const pendingRequestCount = getHostAnalyticsSummaryValue(backendSummary, "pendingRequests", localPendingRequestCount);
  const waitlistedCount = getHostAnalyticsSummaryValue(backendSummary, "waitlistedRequests", localWaitlistedCount);
  const unreadMessageCount = getHostAnalyticsSummaryValue(backendSummary, "unreadMessages", localUnreadMessageCount);
  const confirmedCount = getHostAnalyticsSummaryValue(backendSummary, "confirmedBookings", localConfirmedCount);
  const activeBookingCount = getHostAnalyticsSummaryValue(backendSummary, "activeBookings", localActiveBookingCount);
  const completedCount = getHostAnalyticsSummaryValue(backendSummary, "completedBookings", localCompletedCount);

  const approvedLikeCount = sortedBookingRequests.filter((request) =>
    APPROVED_OR_BETTER_STATUSES.includes(request.status)
  ).length;

  const localConversionRate =
    sortedBookingRequests.length > 0
      ? (approvedLikeCount / sortedBookingRequests.length) * 100
      : 0;

  const localBookedVolumeEstimate = sortedBookingRequests.reduce((total, request) => {
    if (!BOOKED_STATUSES.includes(request.status)) {
      return total;
    }

    return total + getPriceValue(request.listingPrice);
  }, 0);

  const localAverageRating =
    safeMyListings.length > 0
      ? safeMyListings.reduce((sum, listing) => sum + getListingRating(listing), 0) /
        safeMyListings.length
      : 0;

  const conversionRate = getHostAnalyticsSummaryValue(backendSummary, "conversionRate", localConversionRate);
  const bookedVolumeEstimate = getHostAnalyticsSummaryValue(
    backendSummary,
    "grossRevenue",
    localBookedVolumeEstimate
  );
  const averageRating = getHostAnalyticsSummaryValue(backendSummary, "averageRating", localAverageRating);
  const savedListingsCount = getHostAnalyticsSummaryValue(backendSummary, "savedListings", 0);

  const listingAnalytics = safeMyListings
    .map((listing) => {
      const listingRequests = sortedBookingRequests.filter(
        (request) => String(request.listingId) === String(listing.id)
      );
      const listingMessages = safeHostMessages.filter(
        (message) => String(message.listingId) === String(listing.id)
      );

      const pending = listingRequests.filter(
        (request) => request.status === BOOKING_STATUSES.PENDING
      ).length;

      const waitlisted = listingRequests.filter(
        (request) => request.status === BOOKING_STATUSES.WAITLISTED
      ).length;

      const approved = listingRequests.filter((request) =>
        APPROVED_OR_BETTER_STATUSES.includes(request.status)
      ).length;

      const confirmed = listingRequests.filter((request) =>
        BOOKED_STATUSES.includes(request.status)
      ).length;

      const completed = listingRequests.filter(
        (request) => request.status === BOOKING_STATUSES.COMPLETED
      ).length;

      const unreadMessages = listingMessages.filter((message) => message.status === "Unread").length;
      const bookedEstimate = listingRequests.reduce((sum, request) => {
        if (!BOOKED_STATUSES.includes(request.status)) {
          return sum;
        }

        return sum + getPriceValue(request.listingPrice);
      }, 0);

      return {
        ...listing,
        totalRequests: listingRequests.length,
        pending,
        waitlisted,
        approved,
        confirmed,
        completed,
        unreadMessages,
        messageCount: listingMessages.length,
        bookedEstimate,
      };
    })
    .sort((a, b) => {
      if (b.confirmed !== a.confirmed) {
        return b.confirmed - a.confirmed;
      }

      if (b.totalRequests !== a.totalRequests) {
        return b.totalRequests - a.totalRequests;
      }

      return getListingRating(b) - getListingRating(a);
    });

  const displayedListingAnalytics = backendListingAnalytics.length > 0
    ? backendListingAnalytics.map((backendListing) => {
        const localListing = listingAnalytics.find(
          (listing) => String(listing.id) === String(backendListing.listingId || backendListing.id)
        );

        return {
          ...(localListing || {}),
          ...backendListing,
          id: backendListing.listingId || backendListing.id,
          bookedEstimate: backendListing.paidRevenue || localListing?.bookedEstimate || 0,
        };
      })
    : listingAnalytics;

  const attentionListings = displayedListingAnalytics.filter(
    (listing) =>
      listing.pending > 0 ||
      listing.waitlisted > 0 ||
      listing.unreadMessages > 0 ||
      listing.status === "paused"
  );

  const localActionNeededCount = pendingRequestCount + waitlistedCount + unreadMessageCount + pausedCount;
  const actionNeededCount = getHostAnalyticsSummaryValue(
    backendSummary,
    "actionNeededCount",
    localActionNeededCount
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 6 }}>
      <Box
        sx={(theme) => ({
          borderBottom: "1px solid",
          borderColor: "divider",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${theme.palette.background.paper} 55%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
        })}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Chip
                icon={<StorefrontRoundedIcon />}
                label="Host Dashboard"
                color="primary"
                sx={{ mb: 1.5, fontWeight: 900 }}
              />

              <Typography
                variant="h2"
                sx={{ fontSize: { xs: "2.25rem", md: "3.25rem" }, lineHeight: 1 }}
              >
                Manage your spaces with less guesswork.
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 720, fontSize: "1.05rem" }}>
                Review renter requests, monitor listing performance, and quickly see what needs your attention next.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <Button
                component={RouterLink}
                to={APP_ROUTES.createListing}
                variant="contained"
                size="large"
                startIcon={<AddHomeWorkRoundedIcon />}
              >
                Create listing
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 4 } }}>
        {storetApp?.hostAnalyticsError && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
            {storetApp.hostAnalyticsError}
          </Alert>
        )}

        {storetApp?.hostAnalyticsAreLoading && !backendAnalytics && (
          <Stack spacing={1.25} sx={{ mb: 3 }}>
            <Skeleton variant="rounded" height={72} />
            <Skeleton variant="rounded" height={72} />
          </Stack>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
            mb: 4,
          }}
        >
          <StatCard
            icon={<WarningAmberRoundedIcon />}
            label="Needs attention"
            value={actionNeededCount}
            helper="Pending, waitlisted, unread, or paused"
            tone={actionNeededCount > 0 ? "warning" : "success"}
          />
          <StatCard
            icon={<Inventory2RoundedIcon />}
            label="Hosted listings"
            value={getHostAnalyticsSummaryValue(backendSummary, "hostedListings", safeMyListings.length)}
            helper={`${activeCount} active · ${pausedCount} paused`}
          />
          <StatCard
            icon={<PendingActionsRoundedIcon />}
            label="Open requests"
            value={pendingRequestCount + waitlistedCount}
            helper={`${pendingRequestCount} pending · ${waitlistedCount} waitlisted`}
            tone="warning"
          />
          <StatCard
            icon={<TaskAltRoundedIcon />}
            label="Confirmed / active"
            value={confirmedCount + activeBookingCount}
            helper={`${completedCount} completed rentals`}
            tone="success"
          />
        </Box>

        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5, mb: 4 }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <SectionHeader
              eyebrow="Overview"
              title="Host performance snapshot"
              description="A simple summary of conversion, estimated booking volume, ratings, and inbox activity."
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 1.5,
              }}
            >
              <MetricPill label="Booking conversion" value={formatPercent(conversionRate)} />
              <MetricPill label="Booked volume estimate" value={formatMoney(bookedVolumeEstimate)} />
              <MetricPill label="Average listing rating" value={averageRating.toFixed(1)} />
              <MetricPill label="Unread messages" value={unreadMessageCount} />
            </Box>
          </CardContent>
        </Card>


        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5, mb: 4 }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <SectionHeader
              eyebrow="Backend analytics"
              title="Revenue and booking pipeline"
              description="These cards are powered by the Supabase host analytics function instead of only frontend-derived state."
              action={
                backendAnalytics?.refreshedAt ? (
                  <Chip
                    label={`Updated ${formatDateTime(backendAnalytics.refreshedAt)}`}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                ) : null
              }
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <AnalyticsBarList
                title="Paid revenue"
                description="Stripe-confirmed payment volume by month."
                icon={<PaidRoundedIcon />}
                items={monthlyRevenueItems}
                valueFormatter={(value, item) => `${formatMoneyExact(value)} · ${item.paymentCount || 0} payments`}
              />

              <AnalyticsBarList
                title="Booking pipeline"
                description="Current request and rental lifecycle status counts."
                icon={<BarChartRoundedIcon />}
                items={statusBreakdownItems}
                valueFormatter={(value) => value}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 1.5,
                mt: 2,
              }}
            >
              <MetricPill label="Saved by renters" value={savedListingsCount} />
              <MetricPill label="Paid payments" value={backendSummary.paidPaymentCount || 0} />
              <MetricPill label="Total reviews" value={backendSummary.reviewCount || 0} />
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5, mb: 4 }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <SectionHeader
              eyebrow="Focus area"
              title="Needs attention"
              description="These listings have open requests, waitlisted renters, unread messages, or are currently paused."
            />

            {attentionListings.length > 0 ? (
              <Stack spacing={1.5}>
                {attentionListings.map((listing) => (
                  <AttentionItem key={listing.id} listing={listing} />
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<CheckCircleRoundedIcon />}
                title="No urgent host items right now"
                description="Your hosted spaces currently look caught up."
              />
            )}
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5, mb: 4 }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <SectionHeader
              eyebrow="Requests"
              title="Reservation requests & bookings"
              description="Move renters through the booking lifecycle: approve, waitlist, activate, complete, or cancel."
            />

            {sortedBookingRequests.length > 0 ? (
              <Stack spacing={2}>
                {sortedBookingRequests.map((request) => (
                  <BookingRequestCard
                    key={request.id}
                    request={request}
                    onUpdateBookingRequestStatus={updateBookingRequestStatusAction}
                    onUpdateBookingLifecycle={updateBookingLifecycleAction}
                  />
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<PendingActionsRoundedIcon />}
                title="No reservation requests yet"
                description="When renters reserve your spaces, requests will show up here."
              />
            )}
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5, mb: 4 }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <SectionHeader
              eyebrow="Analytics"
              title="Listing performance"
              description="See which spaces are generating activity and where renters are getting stuck."
            />

            {displayedListingAnalytics.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                {displayedListingAnalytics.map((listing) => (
                  <ListingPerformanceCard key={listing.id} listing={listing} />
                ))}
              </Box>
            ) : (
              <EmptyState
                icon={<QueryStatsRoundedIcon />}
                title="No listing analytics yet"
                description="Create listings and collect renter activity to populate analytics."
              />
            )}
          </CardContent>
        </Card>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
            gap: 4,
          }}
        >
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5 }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <SectionHeader
                eyebrow="Inbox"
                title="Message inbox"
                description="Renter questions sent from listing detail pages appear here as local host inbox records."
              />

              {safeHostMessages.length > 0 ? (
                <Stack spacing={2}>
                  {safeHostMessages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      onUpdateHostMessageStatus={updateHostMessageStatusAction}
                    />
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  icon={<MailRoundedIcon />}
                  title="No messages yet"
                  description="Messages from renters will appear here after they contact you from a listing."
                />
              )}
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 5 }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <SectionHeader
                eyebrow="Listings"
                title="Manage my listings"
                description="Pause, resume, view, duplicate, or remove your hosted spaces."
                action={
                  safeMyListings.length > 0 ? (
                    <Button
                      component={RouterLink}
                      to={APP_ROUTES.createListing}
                      variant="contained"
                      size="small"
                      startIcon={<AddHomeWorkRoundedIcon />}
                    >
                      Add listing
                    </Button>
                  ) : null
                }
              />

              {safeMyListings.length > 0 ? (
                <Stack spacing={2}>
                  {safeMyListings.map((listing) => (
                    <React.Fragment key={listing.id}>
                      <HostListingCard
                        listing={listing}
                        onDeleteListing={deleteListingAction}
                        onToggleListingStatus={toggleListingStatusAction}
                      />
                      <Divider sx={{ display: { xs: "none", sm: "none" } }} />
                    </React.Fragment>
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  icon={<AddHomeWorkRoundedIcon />}
                  title="No listings yet"
                  description="Create your first storage listing to start the host side of Storet."
                  action={
                    <Button
                      component={RouterLink}
                      to={APP_ROUTES.createListing}
                      variant="contained"
                      startIcon={<AddHomeWorkRoundedIcon />}
                    >
                      Create my first listing
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}

export default HostDashboardPanel;
