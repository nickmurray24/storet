import { NOTIFICATION_STATUSES } from "../constants/appEnums";
import { APP_ROUTES } from "../routes/appRoutes";

export const NOTIFICATION_TYPES = {
  BOOKING: "booking",
  WAITLIST: "waitlist",
  MESSAGE: "message",
  PAYMENT: "payment",
  REVIEW: "review",
  LISTING: "listing",
  SAVED: "saved",
  SYSTEM: "system",
};

const DEFAULT_NOTIFICATION = {
  id: "",
  recipientId: "",
  actorId: "",
  type: NOTIFICATION_TYPES.SYSTEM,
  title: "Storet update",
  description: "You have a new Storet update.",
  status: NOTIFICATION_STATUSES.UNREAD,
  actionLabel: "Open Storet",
  actionTo: APP_ROUTES.explore,
  listingId: "",
  bookingRequestId: "",
  hostMessageId: "",
  paymentRecordId: "",
  reviewId: "",
  metadata: {},
  readAt: null,
  createdAt: "",
  updatedAt: "",
};

export function normalizeNotification(notification = {}, index = 0) {
  const createdAt = notification.createdAt || notification.time || new Date().toISOString();
  const status =
    notification.status === NOTIFICATION_STATUSES.READ
      ? NOTIFICATION_STATUSES.READ
      : NOTIFICATION_STATUSES.UNREAD;

  return {
    ...DEFAULT_NOTIFICATION,
    ...notification,
    id: String(notification.id || `notification-${index + 1}`),
    recipientId: String(notification.recipientId || ""),
    actorId: String(notification.actorId || ""),
    type: notification.type || NOTIFICATION_TYPES.SYSTEM,
    title: notification.title || DEFAULT_NOTIFICATION.title,
    description: notification.description || DEFAULT_NOTIFICATION.description,
    status,
    actionLabel: notification.actionLabel || DEFAULT_NOTIFICATION.actionLabel,
    actionTo: notification.actionTo || DEFAULT_NOTIFICATION.actionTo,
    listingId: String(notification.listingId || ""),
    bookingRequestId: String(notification.bookingRequestId || notification.requestId || ""),
    hostMessageId: String(notification.hostMessageId || ""),
    paymentRecordId: String(notification.paymentRecordId || ""),
    reviewId: String(notification.reviewId || ""),
    metadata: notification.metadata && typeof notification.metadata === "object" ? notification.metadata : {},
    readAt: notification.readAt || null,
    createdAt,
    updatedAt: notification.updatedAt || createdAt,
    time: notification.time || createdAt,
    isRead: status === NOTIFICATION_STATUSES.READ,
    isUnread: status !== NOTIFICATION_STATUSES.READ,
  };
}

export function normalizeNotificationList(notifications = []) {
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const seenIds = new Set();

  return safeNotifications
    .map(normalizeNotification)
    .filter((notification) => {
      if (!notification.id || seenIds.has(notification.id)) {
        return false;
      }

      seenIds.add(notification.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.time || 0).getTime();
      const bTime = new Date(b.createdAt || b.time || 0).getTime();

      return bTime - aTime;
    });
}

export function getUnreadNotificationCount(notifications = []) {
  return normalizeNotificationList(notifications).filter(
    (notification) => notification.status !== NOTIFICATION_STATUSES.READ
  ).length;
}
