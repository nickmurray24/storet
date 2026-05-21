import {
  BOOKING_REQUESTS_KEY,
  CURRENT_USER_KEY,
  HOST_MESSAGES_KEY,
  LEGACY_USER_LISTINGS_KEY,
  PAYMENT_RECORDS_KEY,
  SAVED_LISTINGS_KEY,
  USER_LISTINGS_KEY,
} from "../constants/storageKeys";
import { normalizeBookingRequestList } from "./bookingUtils";
import { normalizeHostMessageList } from "./hostMessageUtils";
import { normalizeListingList, normalizeSavedIds } from "./listingUtils";
import { normalizePaymentRecordList } from "./paymentUtils";
import { normalizeUserProfile } from "../models/storetModels";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function safeReadJson(key, fallbackValue) {
  if (!canUseLocalStorage()) {
    return fallbackValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function safeWriteJson(key, value) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStoredCurrentUser() {
  const storedUser = safeReadJson(CURRENT_USER_KEY, null);
  return storedUser ? normalizeUserProfile(storedUser) : null;
}

export function readUserListings() {
  const storedListings = safeReadJson(USER_LISTINGS_KEY, null);

  if (Array.isArray(storedListings)) {
    return normalizeListingList(storedListings);
  }

  const legacyListings = safeReadJson(LEGACY_USER_LISTINGS_KEY, []);
  return normalizeListingList(legacyListings);
}

export function writeUserListings(listings) {
  return safeWriteJson(USER_LISTINGS_KEY, normalizeListingList(listings));
}

export function readSavedListingIds() {
  return normalizeSavedIds(safeReadJson(SAVED_LISTINGS_KEY, []));
}

export function writeSavedListingIds(savedListingIds) {
  return safeWriteJson(SAVED_LISTINGS_KEY, normalizeSavedIds(savedListingIds));
}

export function readBookingRequests() {
  return normalizeBookingRequestList(safeReadJson(BOOKING_REQUESTS_KEY, []));
}

export function writeBookingRequests(bookingRequests) {
  return safeWriteJson(
    BOOKING_REQUESTS_KEY,
    normalizeBookingRequestList(bookingRequests)
  );
}

export function readPaymentRecords() {
  return normalizePaymentRecordList(safeReadJson(PAYMENT_RECORDS_KEY, []));
}

export function writePaymentRecords(paymentRecords) {
  return safeWriteJson(PAYMENT_RECORDS_KEY, normalizePaymentRecordList(paymentRecords));
}

export function readHostMessages() {
  return normalizeHostMessageList(safeReadJson(HOST_MESSAGES_KEY, []));
}

export function writeHostMessages(hostMessages) {
  return safeWriteJson(
    HOST_MESSAGES_KEY,
    normalizeHostMessageList(hostMessages)
  );
}
