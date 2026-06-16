import { HOST_MESSAGE_STATUSES, normalizeHostMessageList } from "./hostMessageUtils";

function getMessageTimestamp(message = {}) {
  return message.updatedAt || message.submittedAt || message.createdAt || null;
}

function getMessageTimestampValue(message = {}) {
  const value = new Date(getMessageTimestamp(message) || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function sortHostMessagesByNewest(messages = []) {
  return normalizeHostMessageList(messages).sort(
    (a, b) => getMessageTimestampValue(b) - getMessageTimestampValue(a)
  );
}

export function getHostMessagesForListings(messages = [], hostListings = []) {
  const hostListingIds = new Set(
    (Array.isArray(hostListings) ? hostListings : [])
      .map((listing) => String(listing.id))
      .filter(Boolean)
  );

  if (hostListingIds.size === 0) {
    return [];
  }

  return sortHostMessagesByNewest(messages).filter((message) =>
    hostListingIds.has(String(message.listingId))
  );
}

export function getRenterHostMessages(messages = [], currentUser = {}) {
  const activeEmail = currentUser?.email?.toLowerCase?.() || "";
  const activeUserId = currentUser?.id ? String(currentUser.id) : "";
  const normalizedMessages = sortHostMessagesByNewest(messages);

  if (!activeEmail && !activeUserId) {
    return normalizedMessages;
  }

  return normalizedMessages.filter((message) => {
    const matchesUserId = activeUserId && String(message.senderId) === activeUserId;
    const matchesEmail =
      activeEmail && message.senderEmail?.toLowerCase?.() === activeEmail;

    return matchesUserId || matchesEmail;
  });
}

export function getUnreadHostMessageCount(messages = []) {
  return normalizeHostMessageList(messages).filter(
    (message) => message.status === HOST_MESSAGE_STATUSES.UNREAD
  ).length;
}
