import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  LinearProgress,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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


const DASHBOARD_SECTIONS = {
  attention: "needs-attention",
  requests: "reservation-requests",
  active: "active-rentals",
  listings: "hosted-listings",
  messages: "messages",
  analytics: "analytics",
};

const BOOKING_TABS = [
  {
    key: "pending",
    label: "Pending",
    statuses: [BOOKING_STATUSES.PENDING],
    emptyTitle: "No pending requests",
    emptyDescription: "New renter requests will appear here first.",
  },
  {
    key: "waitlisted",
    label: "Waitlisted",
    statuses: [BOOKING_STATUSES.WAITLISTED],
    emptyTitle: "No waitlisted renters",
    emptyDescription: "Requests you move to the waitlist will appear here.",
  },
  {
    key: "approved",
    label: "Approved",
    statuses: [BOOKING_STATUSES.APPROVED],
    emptyTitle: "No approved requests awaiting checkout",
    emptyDescription: "Approved renters will appear here until they complete checkout.",
  },
  {
    key: "active",
    label: "Confirmed / Active",
    statuses: [BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE],
    emptyTitle: "No confirmed or active rentals",
    emptyDescription: "Paid and active rentals will appear here.",
  },
  {
    key: "completed",
    label: "Completed",
    statuses: [BOOKING_STATUSES.COMPLETED],
    emptyTitle: "No completed rentals yet",
    emptyDescription: "Completed rentals will be stored here for review and history.",
  },
  {
    key: "closed",
    label: "Closed",
    statuses: [BOOKING_STATUSES.CANCELLED, BOOKING_STATUSES.DECLINED],
    emptyTitle: "No closed requests",
    emptyDescription: "Cancelled or declined requests will appear here.",
  },
];

const DEFAULT_VISIBLE_ITEMS = 4;

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

function StatCard({ icon, label, value, helper, tone = "primary", onClick }) {
  const clickableProps = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <Card
      elevation={0}
      {...clickableProps}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        bgcolor: "background.paper",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              borderColor: `${tone}.main`,
              boxShadow: 4,
            }
          : undefined,
        "&:focus-visible": onClick
          ? {
              outline: "3px solid",
              outlineColor: `${tone}.light`,
              outlineOffset: 2,
            }
          : undefined,
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


function DashboardSection({
  id,
  title,
  eyebrow,
  description,
  expanded,
  onToggle,
  summary,
  children,
}) {
  return (
    <Accordion
      id={id}
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={onToggle}
      sx={{
        scrollMarginTop: { xs: 96, md: 112 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "24px !important",
        overflow: "hidden",
        mb: 2,
        bgcolor: "background.paper",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{
          px: { xs: 2.5, md: 3.5 },
          py: 1.5,
          alignItems: "center",
          "& .MuiAccordionSummary-content": {
            my: 0,
          },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ width: "100%", pr: 2 }}
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
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            )}
          </Box>

          {summary}
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 2.5, md: 3.5 }, pb: { xs: 2.5, md: 3.5 }, pt: 0 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

function SectionNavChip({ label, count, onClick, active = false }) {
  return (
    <Chip
      label={count !== undefined ? `${label} · ${count}` : label}
      onClick={onClick}
      variant={active ? "filled" : "outlined"}
      color="primary"
      sx={{
        width: { md: "100%" },
        justifyContent: { md: "flex-start" },
        fontWeight: 900,
        borderRadius: 999,
        px: 0.5,
        bgcolor: active ? "primary.main" : "background.paper",
        color: active ? "primary.contrastText" : "primary.main",
        "& .MuiChip-label": {
          width: { md: "100%" },
          textAlign: { md: "left" },
        },
      }}
    />
  );
}

function DashboardSectionNav({ activeSection, onOpenSection, counts }) {
  const navItems = [
    { id: DASHBOARD_SECTIONS.attention, label: "Needs attention", count: counts.actionNeededCount },
    { id: DASHBOARD_SECTIONS.requests, label: "Requests", count: counts.requestCount },
    { id: DASHBOARD_SECTIONS.active, label: "Active rentals", count: counts.activeRentalCount },
    { id: DASHBOARD_SECTIONS.listings, label: "Listings", count: counts.listingCount },
    { id: DASHBOARD_SECTIONS.messages, label: "Messages", count: counts.messageCount },
    { id: DASHBOARD_SECTIONS.analytics, label: "Analytics" },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
          Dashboard sections
        </Typography>

        <Stack
          direction={{ xs: "row", md: "column" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 1.25 }}
        >
          {navItems.map((item) => (
            <SectionNavChip
              key={item.id}
              label={item.label}
              count={item.count}
              active={activeSection === item.id}
              onClick={() => onOpenSection(item.id)}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ShowMoreButton({ visibleCount, totalCount, expanded, onClick, itemLabel = "items" }) {
  if (totalCount <= visibleCount) {
    return null;
  }

  return (
    <Button variant="text" onClick={onClick} sx={{ alignSelf: "flex-start", fontWeight: 900 }}>
      {expanded ? `Show fewer ${itemLabel}` : `Show all ${totalCount} ${itemLabel}`}
    </Button>
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
  const [expandedSections, setExpandedSections] = useState({
    [DASHBOARD_SECTIONS.attention]: true,
    [DASHBOARD_SECTIONS.requests]: true,
    [DASHBOARD_SECTIONS.listings]: false,
    [DASHBOARD_SECTIONS.active]: false,
    [DASHBOARD_SECTIONS.messages]: false,
    [DASHBOARD_SECTIONS.analytics]: false,
  });
  const [activeSection, setActiveSection] = useState(DASHBOARD_SECTIONS.attention);
  const [bookingTab, setBookingTab] = useState(BOOKING_TABS[0].key);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showAllListings, setShowAllListings] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [showAllPerformance, setShowAllPerformance] = useState(false);

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

  const confirmedAndActiveRequests = sortedBookingRequests.filter((request) =>
    [BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE].includes(request.status)
  );

  const bookingTabCounts = BOOKING_TABS.reduce((counts, tab) => {
    counts[tab.key] = sortedBookingRequests.filter((request) => tab.statuses.includes(request.status)).length;
    return counts;
  }, {});

  const selectedBookingTab = BOOKING_TABS.find((tab) => tab.key === bookingTab) || BOOKING_TABS[0];
  const selectedBookingRequests = sortedBookingRequests.filter((request) =>
    selectedBookingTab.statuses.includes(request.status)
  );
  const visibleBookingRequests = showAllBookings
    ? selectedBookingRequests
    : selectedBookingRequests.slice(0, DEFAULT_VISIBLE_ITEMS);
  const visibleListings = showAllListings
    ? safeMyListings
    : safeMyListings.slice(0, DEFAULT_VISIBLE_ITEMS);
  const visibleMessages = showAllMessages
    ? safeHostMessages
    : safeHostMessages.slice(0, DEFAULT_VISIBLE_ITEMS);
  const visiblePerformanceListings = showAllPerformance
    ? displayedListingAnalytics
    : displayedListingAnalytics.slice(0, DEFAULT_VISIBLE_ITEMS);

  function toggleSection(sectionId) {
    setActiveSection(sectionId);
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function openSection(sectionId) {
    setActiveSection(sectionId);
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: true,
    }));

    window.setTimeout(() => {
      const section = document.getElementById(sectionId);

      if (!section) {
        return;
      }

      const navbarOffset = window.innerWidth >= 900 ? 108 : 92;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY - navbarOffset;

      window.scrollTo({
        top: Math.max(sectionTop, 0),
        behavior: "smooth",
      });
    }, 120);
  }

  function handleBookingTabChange(event, nextTab) {
    setBookingTab(nextTab);
    setShowAllBookings(false);
  }

  useEffect(() => {
    const sectionIds = Object.values(DASHBOARD_SECTIONS);
    let animationFrameId = null;

    function getScrollAnchor() {
      return window.innerWidth >= 900 ? 126 : 104;
    }

    function updateActiveSectionFromScroll() {
      animationFrameId = null;

      const anchor = getScrollAnchor();
      const sections = sectionIds
        .map((sectionId) => {
          const element = document.getElementById(sectionId);

          if (!element) {
            return null;
          }

          const rect = element.getBoundingClientRect();

          return {
            id: sectionId,
            top: rect.top,
            bottom: rect.bottom,
          };
        })
        .filter(Boolean);

      if (sections.length === 0) {
        return;
      }

      const sectionAtAnchor = sections.find(
        (section) => section.top <= anchor && section.bottom >= anchor
      );

      if (sectionAtAnchor) {
        setActiveSection(sectionAtAnchor.id);
        return;
      }

      const previousSection = [...sections]
        .reverse()
        .find((section) => section.top <= anchor);

      if (previousSection) {
        setActiveSection(previousSection.id);
        return;
      }

      setActiveSection(sections[0].id);
    }

    function requestActiveSectionUpdate() {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateActiveSectionFromScroll);
    }

    requestActiveSectionUpdate();
    window.addEventListener("scroll", requestActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", requestActiveSectionUpdate);

    return () => {
      window.removeEventListener("scroll", requestActiveSectionUpdate);
      window.removeEventListener("resize", requestActiveSectionUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

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

      <Container maxWidth="xl" sx={{ mt: { xs: 3, md: 4 } }}>
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
            mb: 2,
          }}
        >
          <StatCard
            icon={<WarningAmberRoundedIcon />}
            label="Needs attention"
            value={actionNeededCount}
            helper="Pending, waitlisted, unread, or paused"
            tone={actionNeededCount > 0 ? "warning" : "success"}
            onClick={() => openSection(DASHBOARD_SECTIONS.attention)}
          />
          <StatCard
            icon={<Inventory2RoundedIcon />}
            label="Hosted listings"
            value={getHostAnalyticsSummaryValue(backendSummary, "hostedListings", safeMyListings.length)}
            helper={`${activeCount} active · ${pausedCount} paused`}
            onClick={() => openSection(DASHBOARD_SECTIONS.listings)}
          />
          <StatCard
            icon={<PendingActionsRoundedIcon />}
            label="Open requests"
            value={pendingRequestCount + waitlistedCount}
            helper={`${pendingRequestCount} pending · ${waitlistedCount} waitlisted`}
            tone="warning"
            onClick={() => openSection(DASHBOARD_SECTIONS.requests)}
          />
          <StatCard
            icon={<TaskAltRoundedIcon />}
            label="Confirmed / active"
            value={confirmedCount + activeBookingCount}
            helper={`${completedCount} completed rentals`}
            tone="success"
            onClick={() => openSection(DASHBOARD_SECTIONS.active)}
          />
        </Box>

        <Box
          sx={{
            display: { xs: "block", md: "grid" },
            gridTemplateColumns: { md: "240px minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              position: { md: "sticky" },
              top: { md: 96 },
              zIndex: 2,
              mb: { xs: 3, md: 0 },
            }}
          >
            <DashboardSectionNav
              activeSection={activeSection}
              onOpenSection={openSection}
              counts={{
                actionNeededCount,
                listingCount: safeMyListings.length,
                requestCount: sortedBookingRequests.length,
                activeRentalCount: confirmedAndActiveRequests.length,
                messageCount: safeHostMessages.length,
              }}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <DashboardSection
          id={DASHBOARD_SECTIONS.attention}
          eyebrow="Focus area"
          title="Needs attention"
          description="Only the listings that need action right now."
          expanded={expandedSections[DASHBOARD_SECTIONS.attention]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.attention)}
          summary={
            <Chip
              label={actionNeededCount > 0 ? `${actionNeededCount} items` : "Caught up"}
              color={actionNeededCount > 0 ? "warning" : "success"}
              size="small"
              sx={{ fontWeight: 900 }}
            />
          }
        >
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
        </DashboardSection>

        <DashboardSection
          id={DASHBOARD_SECTIONS.requests}
          eyebrow="Requests"
          title="Reservation requests & bookings"
          description="Use the tabs to focus on one booking status at a time."
          expanded={expandedSections[DASHBOARD_SECTIONS.requests]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.requests)}
          summary={
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`${pendingRequestCount} pending`} color="warning" size="small" sx={{ fontWeight: 900 }} />
              <Chip label={`${waitlistedCount} waitlisted`} color="info" size="small" sx={{ fontWeight: 900 }} />
            </Stack>
          }
        >
          {sortedBookingRequests.length > 0 ? (
            <Stack spacing={2}>
              <Tabs
                value={bookingTab}
                onChange={handleBookingTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  minHeight: 44,
                  "& .MuiTab-root": { fontWeight: 900, minHeight: 44 },
                }}
              >
                {BOOKING_TABS.map((tab) => (
                  <Tab
                    key={tab.key}
                    value={tab.key}
                    label={`${tab.label} (${bookingTabCounts[tab.key] || 0})`}
                  />
                ))}
              </Tabs>

              {selectedBookingRequests.length > 0 ? (
                <Stack spacing={2}>
                  {visibleBookingRequests.map((request) => (
                    <BookingRequestCard
                      key={request.id}
                      request={request}
                      onUpdateBookingRequestStatus={updateBookingRequestStatusAction}
                      onUpdateBookingLifecycle={updateBookingLifecycleAction}
                    />
                  ))}
                  <ShowMoreButton
                    visibleCount={DEFAULT_VISIBLE_ITEMS}
                    totalCount={selectedBookingRequests.length}
                    expanded={showAllBookings}
                    onClick={() => setShowAllBookings((current) => !current)}
                    itemLabel="bookings"
                  />
                </Stack>
              ) : (
                <EmptyState
                  icon={<PendingActionsRoundedIcon />}
                  title={selectedBookingTab.emptyTitle}
                  description={selectedBookingTab.emptyDescription}
                />
              )}
            </Stack>
          ) : (
            <EmptyState
              icon={<PendingActionsRoundedIcon />}
              title="No reservation requests yet"
              description="When renters reserve your spaces, requests will show up here."
            />
          )}
        </DashboardSection>

        <DashboardSection
          id={DASHBOARD_SECTIONS.active}
          eyebrow="Rentals"
          title="Confirmed and active rentals"
          description="A focused view of paid or currently active rentals."
          expanded={expandedSections[DASHBOARD_SECTIONS.active]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.active)}
          summary={
            <Chip
              label={`${confirmedCount + activeBookingCount} current`}
              color="success"
              size="small"
              sx={{ fontWeight: 900 }}
            />
          }
        >
          {confirmedAndActiveRequests.length > 0 ? (
            <Stack spacing={2}>
              {confirmedAndActiveRequests.slice(0, DEFAULT_VISIBLE_ITEMS).map((request) => (
                <BookingRequestCard
                  key={request.id}
                  request={request}
                  onUpdateBookingRequestStatus={updateBookingRequestStatusAction}
                  onUpdateBookingLifecycle={updateBookingLifecycleAction}
                />
              ))}
              {confirmedAndActiveRequests.length > DEFAULT_VISIBLE_ITEMS && (
                <Button
                  variant="text"
                  onClick={() => {
                    setBookingTab("active");
                    openSection(DASHBOARD_SECTIONS.requests);
                  }}
                  sx={{ alignSelf: "flex-start", fontWeight: 900 }}
                >
                  View all active rentals in Requests
                </Button>
              )}
            </Stack>
          ) : (
            <EmptyState
              icon={<TaskAltRoundedIcon />}
              title="No confirmed or active rentals"
              description="Paid rentals will appear here after renters complete checkout."
            />
          )}
        </DashboardSection>

        <DashboardSection
          id={DASHBOARD_SECTIONS.listings}
          eyebrow="Listings"
          title="Hosted listings"
          description="Pause, resume, view, duplicate, or remove your spaces."
          expanded={expandedSections[DASHBOARD_SECTIONS.listings]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.listings)}
          summary={
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`${activeCount} active`} color="success" size="small" sx={{ fontWeight: 900 }} />
              <Chip label={`${pausedCount} paused`} variant="outlined" size="small" sx={{ fontWeight: 900 }} />
            </Stack>
          }
        >
          {safeMyListings.length > 0 ? (
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  component={RouterLink}
                  to={APP_ROUTES.createListing}
                  variant="contained"
                  size="small"
                  startIcon={<AddHomeWorkRoundedIcon />}
                >
                  Add listing
                </Button>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                {visibleListings.map((listing) => (
                  <HostListingCard
                    key={listing.id}
                    listing={listing}
                    onDeleteListing={deleteListingAction}
                    onToggleListingStatus={toggleListingStatusAction}
                  />
                ))}
              </Box>

              <ShowMoreButton
                visibleCount={DEFAULT_VISIBLE_ITEMS}
                totalCount={safeMyListings.length}
                expanded={showAllListings}
                onClick={() => setShowAllListings((current) => !current)}
                itemLabel="listings"
              />
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
        </DashboardSection>

        <DashboardSection
          id={DASHBOARD_SECTIONS.messages}
          eyebrow="Inbox"
          title="Message inbox"
          description="Renter questions sent from listing detail pages."
          expanded={expandedSections[DASHBOARD_SECTIONS.messages]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.messages)}
          summary={
            <Chip
              label={unreadMessageCount > 0 ? `${unreadMessageCount} unread` : `${safeHostMessages.length} total`}
              color={unreadMessageCount > 0 ? "primary" : "default"}
              size="small"
              sx={{ fontWeight: 900 }}
            />
          }
        >
          {safeHostMessages.length > 0 ? (
            <Stack spacing={2}>
              {visibleMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  onUpdateHostMessageStatus={updateHostMessageStatusAction}
                />
              ))}
              <ShowMoreButton
                visibleCount={DEFAULT_VISIBLE_ITEMS}
                totalCount={safeHostMessages.length}
                expanded={showAllMessages}
                onClick={() => setShowAllMessages((current) => !current)}
                itemLabel="messages"
              />
            </Stack>
          ) : (
            <EmptyState
              icon={<MailRoundedIcon />}
              title="No messages yet"
              description="Messages from renters will appear here after they contact you from a listing."
            />
          )}
        </DashboardSection>

        <DashboardSection
          id={DASHBOARD_SECTIONS.analytics}
          eyebrow="Analytics"
          title="Performance and revenue"
          description="Backend-powered revenue, pipeline, rating, and listing performance insights."
          expanded={expandedSections[DASHBOARD_SECTIONS.analytics]}
          onToggle={() => toggleSection(DASHBOARD_SECTIONS.analytics)}
          summary={
            backendAnalytics?.refreshedAt ? (
              <Chip
                label={`Updated ${formatDateTime(backendAnalytics.refreshedAt)}`}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 900 }}
              />
            ) : (
              <Chip label="Snapshot" variant="outlined" size="small" sx={{ fontWeight: 900 }} />
            )
          }
        >
          <Stack spacing={2.5}>
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
              <MetricPill label="Saved by renters" value={savedListingsCount} />
            </Box>

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

            {displayedListingAnalytics.length > 0 ? (
              <Stack spacing={2}>
                <Typography variant="h5">Listing performance</Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                  }}
                >
                  {visiblePerformanceListings.map((listing) => (
                    <ListingPerformanceCard key={listing.id} listing={listing} />
                  ))}
                </Box>
                <ShowMoreButton
                  visibleCount={DEFAULT_VISIBLE_ITEMS}
                  totalCount={displayedListingAnalytics.length}
                  expanded={showAllPerformance}
                  onClick={() => setShowAllPerformance((current) => !current)}
                  itemLabel="performance cards"
                />
              </Stack>
            ) : (
              <EmptyState
                icon={<QueryStatsRoundedIcon />}
                title="No listing analytics yet"
                description="Create listings and collect renter activity to populate analytics."
              />
            )}
          </Stack>
        </DashboardSection>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default HostDashboardPanel;
