import { CURRENT_USER_KEY } from "../constants/storageKeys";
import {
  getStoredCurrentUser,
  readBookingRequests,
  readHostMessages,
  readPaymentRecords,
  readSavedListingIds,
  readUserListings,
  safeRemoveItem,
  safeWriteJson,
  writeBookingRequests,
  writeHostMessages,
  writePaymentRecords,
  writeSavedListingIds,
  writeUserListings,
} from "../utils/storage";

export function loadStoretState() {
  return {
    currentUser: getStoredCurrentUser(),
    userListings: readUserListings(),
    savedListingIds: readSavedListingIds(),
    bookingRequests: readBookingRequests(),
    paymentRecords: readPaymentRecords(),
    hostMessages: readHostMessages(),
  };
}

export const storetDataService = {
  loadState: loadStoretState,

  saveCurrentUser(user) {
    return safeWriteJson(CURRENT_USER_KEY, user);
  },

  clearCurrentUser() {
    return safeRemoveItem(CURRENT_USER_KEY);
  },

  saveUserListings(listings) {
    return writeUserListings(listings);
  },

  saveSavedListingIds(savedListingIds) {
    return writeSavedListingIds(savedListingIds);
  },

  saveBookingRequests(bookingRequests) {
    return writeBookingRequests(bookingRequests);
  },

  savePaymentRecords(paymentRecords) {
    return writePaymentRecords(paymentRecords);
  },

  saveHostMessages(hostMessages) {
    return writeHostMessages(hostMessages);
  },
};
