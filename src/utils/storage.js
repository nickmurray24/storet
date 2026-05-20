import {
  CURRENT_USER_KEY,
  LEGACY_USER_LISTINGS_KEY,
  SAVED_LISTINGS_KEY,
  USER_LISTINGS_KEY,
} from "../constants/storageKeys";
import { normalizeSavedIds } from "./listingUtils";

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

  if (!storedUser) {
    return null;
  }

  return {
    ...storedUser,
    isAuthenticated: Boolean(storedUser.isAuthenticated),
  };
}

export function readUserListings() {
  const storedListings = safeReadJson(USER_LISTINGS_KEY, null);

  if (Array.isArray(storedListings)) {
    return storedListings;
  }

  const legacyListings = safeReadJson(LEGACY_USER_LISTINGS_KEY, []);
  return Array.isArray(legacyListings) ? legacyListings : [];
}

export function writeUserListings(listings) {
  const safeListings = Array.isArray(listings) ? listings : [];
  return safeWriteJson(USER_LISTINGS_KEY, safeListings);
}

export function readSavedListingIds() {
  return normalizeSavedIds(safeReadJson(SAVED_LISTINGS_KEY, []));
}

export function writeSavedListingIds(savedListingIds) {
  return safeWriteJson(SAVED_LISTINGS_KEY, normalizeSavedIds(savedListingIds));
}
