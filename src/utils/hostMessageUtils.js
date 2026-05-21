import { normalizeListing } from "./listingUtils";

export const HOST_MESSAGE_STATUSES = {
  UNREAD: "Unread",
  READ: "Read",
};

function normalizeStatus(status) {
  return status === HOST_MESSAGE_STATUSES.READ
    ? HOST_MESSAGE_STATUSES.READ
    : HOST_MESSAGE_STATUSES.UNREAD;
}

export function normalizeHostMessage(message = {}, index = 0) {
  const createdAt = message.createdAt || message.submittedAt || new Date().toISOString();

  return {
    id: String(message.id || `host-message-${index + 1}`),
    listingId: String(message.listingId || ""),
    listingTitle: message.listingTitle || "Storage space",
    listingLocation: message.listingLocation || "",
    hostName: message.hostName || message.host || "Storet Host",
    senderName:
      message.senderName ||
      message.fullName ||
      message.name ||
      message.renterName ||
      "Demo User",
    senderEmail:
      message.senderEmail ||
      message.email ||
      message.renterEmail ||
      "",
    subject: message.subject || "Listing question",
    message: message.message || message.body || "",
    status: normalizeStatus(message.status),
    submittedAt: message.submittedAt || createdAt,
    createdAt,
    updatedAt: message.updatedAt || createdAt,
    readAt: message.readAt || null,
  };
}

export function normalizeHostMessageList(messages) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const seenIds = new Set();

  return safeMessages.map(normalizeHostMessage).filter((message) => {
    if (!message.id || seenIds.has(message.id)) {
      return false;
    }

    seenIds.add(message.id);
    return true;
  });
}

export function createHostMessage({ listing, currentUser, messageData = {} }) {
  const normalizedListing = normalizeListing(listing);
  const now = new Date().toISOString();

  return normalizeHostMessage({
    id: `host-message-${Date.now()}`,
    listingId: normalizedListing.id,
    listingTitle: normalizedListing.title,
    listingLocation: normalizedListing.location,
    hostName: normalizedListing.host,
    senderName:
      messageData.fullName ||
      currentUser?.fullName ||
      currentUser?.name ||
      "Demo User",
    senderEmail: messageData.email || currentUser?.email || "",
    subject: messageData.subject || `Question about ${normalizedListing.title}`,
    message: messageData.message || "",
    status: HOST_MESSAGE_STATUSES.UNREAD,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateHostMessageStatus(message, status) {
  const now = new Date().toISOString();
  const nextStatus = normalizeStatus(status);

  return normalizeHostMessage({
    ...message,
    status: nextStatus,
    updatedAt: now,
    readAt: nextStatus === HOST_MESSAGE_STATUSES.READ ? now : null,
  });
}

export function buildHostMessageActivity(message = {}) {
  const normalizedMessage = normalizeHostMessage(message);

  return {
    id: `activity-message-${normalizedMessage.id}-${normalizedMessage.status}`,
    type: "message",
    title: `${normalizedMessage.senderName} messaged about ${normalizedMessage.listingTitle}`,
    description: normalizedMessage.message,
    time: normalizedMessage.updatedAt || normalizedMessage.submittedAt,
    status: normalizedMessage.status,
    actionLabel: "Open listing",
    actionTo: `/listing/${normalizedMessage.listingId}`,
    userName: normalizedMessage.senderName,
  };
}
