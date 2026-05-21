import { HOST_MESSAGE_STATUSES } from "../constants/appEnums";
import { buildListingPath } from "../routes/appRoutes";
import {
  DEFAULT_HOST_MESSAGE_MODEL,
  MODEL_PREFIXES,
  createModelId,
  getIsoTimestamp,
} from "../models/storetModels";
import { normalizeListing } from "./listingUtils";

export { HOST_MESSAGE_STATUSES };

function normalizeStatus(status) {
  return status === HOST_MESSAGE_STATUSES.READ
    ? HOST_MESSAGE_STATUSES.READ
    : HOST_MESSAGE_STATUSES.UNREAD;
}

export function normalizeHostMessage(message = {}, index = 0) {
  const now = new Date().toISOString();
  const createdAt = getIsoTimestamp(message.createdAt || message.submittedAt, now);
  const updatedAt = getIsoTimestamp(message.updatedAt || createdAt, createdAt);
  const senderEmail = message.senderEmail || message.email || message.renterEmail || "";

  return {
    ...DEFAULT_HOST_MESSAGE_MODEL,
    ...message,
    id: String(message.id || `host-message-${index + 1}`),
    listingId: String(message.listingId || DEFAULT_HOST_MESSAGE_MODEL.listingId),
    listingTitle: message.listingTitle || DEFAULT_HOST_MESSAGE_MODEL.listingTitle,
    listingLocation: message.listingLocation || message.location || DEFAULT_HOST_MESSAGE_MODEL.listingLocation,
    hostName: message.hostName || message.host || DEFAULT_HOST_MESSAGE_MODEL.hostName,
    hostId: String(message.hostId || message.ownerId || DEFAULT_HOST_MESSAGE_MODEL.hostId),
    hostEmail: message.hostEmail || message.ownerEmail || DEFAULT_HOST_MESSAGE_MODEL.hostEmail,
    senderName:
      message.senderName ||
      message.fullName ||
      message.name ||
      message.renterName ||
      DEFAULT_HOST_MESSAGE_MODEL.senderName,
    senderEmail,
    senderId: String(message.senderId || message.renterId || senderEmail || DEFAULT_HOST_MESSAGE_MODEL.senderId),
    subject: message.subject || DEFAULT_HOST_MESSAGE_MODEL.subject,
    message: message.message || message.body || DEFAULT_HOST_MESSAGE_MODEL.message,
    status: normalizeStatus(message.status),
    submittedAt: getIsoTimestamp(message.submittedAt || createdAt, createdAt),
    createdAt,
    updatedAt,
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
  const senderName =
    messageData.fullName ||
    currentUser?.fullName ||
    currentUser?.name ||
    DEFAULT_HOST_MESSAGE_MODEL.senderName;
  const senderEmail = messageData.email || currentUser?.email || "";
  const senderId = String(currentUser?.id || currentUser?.userId || senderEmail || "demo-renter");

  return normalizeHostMessage({
    id: createModelId(MODEL_PREFIXES.HOST_MESSAGE),
    listingId: normalizedListing.id,
    listingTitle: normalizedListing.title,
    listingLocation: normalizedListing.location,
    hostName: normalizedListing.host,
    hostId: normalizedListing.hostId,
    hostEmail: normalizedListing.hostEmail,
    senderName,
    senderEmail,
    senderId,
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
    actionTo: buildListingPath(normalizedMessage.listingId),
    userName: normalizedMessage.senderName,
  };
}
