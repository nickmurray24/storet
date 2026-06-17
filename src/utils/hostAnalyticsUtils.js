import { BOOKING_STATUSES } from "./bookingUtils";

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function moneyFromCents(cents) {
  return toNumber(cents) / 100;
}

function normalizeSummary(summary = {}) {
  const grossRevenueCents = toNumber(summary.grossRevenueCents ?? summary.gross_revenue_cents);

  return {
    hostedListings: toNumber(summary.hostedListings ?? summary.hosted_listings),
    activeListings: toNumber(summary.activeListings ?? summary.active_listings),
    pausedListings: toNumber(summary.pausedListings ?? summary.paused_listings),
    totalRequests: toNumber(summary.totalRequests ?? summary.total_requests),
    pendingRequests: toNumber(summary.pendingRequests ?? summary.pending_requests),
    waitlistedRequests: toNumber(summary.waitlistedRequests ?? summary.waitlisted_requests),
    approvedRequests: toNumber(summary.approvedRequests ?? summary.approved_requests),
    confirmedBookings: toNumber(summary.confirmedBookings ?? summary.confirmed_bookings),
    activeBookings: toNumber(summary.activeBookings ?? summary.active_bookings),
    completedBookings: toNumber(summary.completedBookings ?? summary.completed_bookings),
    cancelledBookings: toNumber(summary.cancelledBookings ?? summary.cancelled_bookings),
    unreadMessages: toNumber(summary.unreadMessages ?? summary.unread_messages),
    totalMessages: toNumber(summary.totalMessages ?? summary.total_messages),
    savedListings: toNumber(summary.savedListings ?? summary.saved_listings),
    averageRating: toNumber(summary.averageRating ?? summary.average_rating),
    reviewCount: toNumber(summary.reviewCount ?? summary.review_count),
    conversionRate: toNumber(summary.conversionRate ?? summary.conversion_rate),
    grossRevenueCents,
    grossRevenue: toNumber(summary.grossRevenue, moneyFromCents(grossRevenueCents)),
    paidPaymentCount: toNumber(summary.paidPaymentCount ?? summary.paid_payment_count),
    actionNeededCount: toNumber(summary.actionNeededCount ?? summary.action_needed_count),
  };
}

function normalizeListingAnalyticsItem(item = {}) {
  const paidRevenueCents = toNumber(item.paidRevenueCents ?? item.paid_revenue_cents);

  return {
    id: item.id || item.listingId || item.listing_id,
    listingId: item.listingId || item.listing_id || item.id,
    title: item.title || "Untitled listing",
    location: item.location || "Location not provided",
    status: item.status || "active",
    listingType: item.listingType || item.listing_type || "Private host",
    averageRating: toNumber(item.averageRating ?? item.average_rating),
    reviewCount: toNumber(item.reviewCount ?? item.review_count),
    savedCount: toNumber(item.savedCount ?? item.saved_count),
    totalRequests: toNumber(item.totalRequests ?? item.total_requests),
    pending: toNumber(item.pending),
    waitlisted: toNumber(item.waitlisted),
    approved: toNumber(item.approved),
    confirmed: toNumber(item.confirmed),
    active: toNumber(item.active),
    completed: toNumber(item.completed),
    cancelled: toNumber(item.cancelled),
    unreadMessages: toNumber(item.unreadMessages ?? item.unread_messages),
    messageCount: toNumber(item.messageCount ?? item.message_count),
    paidRevenueCents,
    paidRevenue: toNumber(item.paidRevenue, moneyFromCents(paidRevenueCents)),
  };
}

function normalizeMonthlyRevenueItem(item = {}) {
  const revenueCents = toNumber(item.revenueCents ?? item.revenue_cents);

  return {
    month: item.month || "",
    label: item.label || item.month || "Month",
    revenueCents,
    revenue: toNumber(item.revenue, moneyFromCents(revenueCents)),
    paymentCount: toNumber(item.paymentCount ?? item.payment_count),
    bookingCount: toNumber(item.bookingCount ?? item.booking_count),
  };
}

function normalizeStatusBreakdownItem(item = {}) {
  return {
    status: item.status || "Unknown",
    count: toNumber(item.count),
  };
}

export function normalizeHostAnalytics(analytics = {}) {
  return {
    summary: normalizeSummary(analytics.summary || {}),
    listingAnalytics: toArray(
      analytics.listingAnalytics || analytics.listing_analytics
    ).map(normalizeListingAnalyticsItem),
    monthlyRevenue: toArray(
      analytics.monthlyRevenue || analytics.monthly_revenue
    ).map(normalizeMonthlyRevenueItem),
    statusBreakdown: toArray(
      analytics.statusBreakdown || analytics.status_breakdown
    ).map(normalizeStatusBreakdownItem),
    refreshedAt: analytics.refreshedAt || analytics.refreshed_at || new Date().toISOString(),
  };
}

export function getHostAnalyticsSummaryValue(summary = {}, key, fallbackValue) {
  const value = summary?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : fallbackValue;
}

export function getDefaultStatusBreakdown() {
  return [
    BOOKING_STATUSES.PENDING,
    BOOKING_STATUSES.APPROVED,
    BOOKING_STATUSES.WAITLISTED,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.ACTIVE,
    BOOKING_STATUSES.COMPLETED,
  ].map((status) => ({ status, count: 0 }));
}
