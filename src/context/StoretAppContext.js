import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getHostBookingRequests } from "../utils/bookingSelectors";
import {
  BOOKING_STATUSES,
  createBookingRequest,
  createPaymentRecord,
  updateBookingLifecycle,
  updateBookingRequestStatus,
} from "../utils/bookingUtils";
import { createHostMessage, updateHostMessageStatus } from "../utils/hostMessageUtils";
import { normalizeListingList, normalizeSavedIds } from "../utils/listingUtils";
import { getHostMessagesForListings } from "../utils/messageSelectors";
import { authService } from "../services/authService";
import { listingService } from "../services/listingService";
import { storetDataService } from "../services/storetDataService";
import { LISTING_STATUSES, USER_ROLES } from "../constants/appEnums";
import { normalizeUserProfile } from "../models/storetModels";

const StoretAppContext = createContext(null);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(error, fallbackMessage = "Something went wrong.") {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || fallbackMessage;
}

function mergeListingsById(...listingGroups) {
  const listingMap = new Map();

  listingGroups.flatMap(ensureArray).forEach((listing) => {
    if (!listing?.id) {
      return;
    }

    listingMap.set(String(listing.id), listing);
  });

  return normalizeListingList(Array.from(listingMap.values()));
}

function isBackendListingId(listingId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(listingId || "")
  );
}

export function StoretAppProvider({ children }) {
  const initialState = useMemo(() => storetDataService.loadState(), []);

  const [currentUser, setCurrentUser] = useState(initialState.currentUser);
  const [listings, setListings] = useState([]);
  const [userListings, setUserListings] = useState(initialState.userListings);
  const [savedListingIds, setSavedListingIds] = useState(initialState.savedListingIds);
  const [bookingRequests, setBookingRequests] = useState(initialState.bookingRequests);
  const [paymentRecords, setPaymentRecords] = useState(initialState.paymentRecords);
  const [hostMessages, setHostMessages] = useState(initialState.hostMessages);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [listingsAreLoading, setListingsAreLoading] = useState(false);
  const [listingsError, setListingsError] = useState("");

  const persistAuthenticatedUser = useCallback((user) => {
    const normalizedUser = normalizeUserProfile({
      ...user,
      isAuthenticated: true,
      role: user?.role || USER_ROLES.RENTER,
    });

    storetDataService.saveCurrentUser(normalizedUser);
    setCurrentUser(normalizedUser);
    setAuthError("");

    return normalizedUser;
  }, []);

  const clearAuthenticatedUser = useCallback(() => {
    storetDataService.clearCurrentUser();
    setCurrentUser(null);
  }, []);

  const refreshActiveListings = useCallback(async () => {
    setListingsAreLoading(true);
    setListingsError("");

    const response = await listingService.getActiveListings();

    setListingsAreLoading(false);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not load listings from Storet yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    setListings(response.data || []);

    return {
      ok: true,
      listings: response.data || [],
    };
  }, []);

  const refreshCurrentUserListingData = useCallback(async () => {
    if (!currentUser?.isAuthenticated) {
      setUserListings([]);
      setSavedListingIds([]);
      return { ok: true };
    }

    setListingsError("");

    const [hostListingsResponse, savedListingsResponse] = await Promise.all([
      listingService.getCurrentUserListings(),
      listingService.getSavedListingIds(),
    ]);

    if (hostListingsResponse.error || savedListingsResponse.error) {
      const message = getErrorMessage(
        hostListingsResponse.error || savedListingsResponse.error,
        "We could not load your listing data yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    setUserListings(hostListingsResponse.data || []);
    setSavedListingIds(normalizeSavedIds(savedListingsResponse.data));

    return {
      ok: true,
      userListings: hostListingsResponse.data || [],
      savedListingIds: savedListingsResponse.data || [],
    };
  }, [currentUser?.isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthSession() {
      setAuthIsLoading(true);

      const sessionResponse = await authService.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionResponse.error) {
        setAuthError(getErrorMessage(sessionResponse.error));
        setAuthIsLoading(false);
        return;
      }

      if (!sessionResponse.data) {
        clearAuthenticatedUser();
        setAuthIsLoading(false);
        return;
      }

      const profileResponse = await authService.getCurrentUserProfile();

      if (!isMounted) {
        return;
      }

      if (profileResponse.error) {
        setAuthError(getErrorMessage(profileResponse.error));
        setAuthIsLoading(false);
        return;
      }

      if (profileResponse.data) {
        persistAuthenticatedUser(profileResponse.data);
      }

      setAuthIsLoading(false);
    }

    hydrateAuthSession();

    const subscription = authService.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        clearAuthenticatedUser();
        setAuthIsLoading(false);
        return;
      }

      authService.getCurrentUserProfile().then((profileResponse) => {
        if (!isMounted) {
          return;
        }

        if (profileResponse.error) {
          setAuthError(getErrorMessage(profileResponse.error));
          setAuthIsLoading(false);
          return;
        }

        if (profileResponse.data) {
          persistAuthenticatedUser(profileResponse.data);
        }

        setAuthIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthenticatedUser, persistAuthenticatedUser]);

  useEffect(() => {
    refreshActiveListings();
  }, [refreshActiveListings]);

  useEffect(() => {
    refreshCurrentUserListingData();
  }, [refreshCurrentUserListingData]);

  const activeBackendListings = useMemo(() => ensureArray(listings), [listings]);
  const allUserListings = useMemo(() => ensureArray(userListings), [userListings]);
  const allListings = useMemo(
    () => mergeListingsById(activeBackendListings, allUserListings),
    [activeBackendListings, allUserListings]
  );
  const allBookingRequests = useMemo(
    () => ensureArray(bookingRequests),
    [bookingRequests]
  );
  const allPaymentRecords = useMemo(() => ensureArray(paymentRecords), [paymentRecords]);
  const allHostMessages = useMemo(() => ensureArray(hostMessages), [hostMessages]);

  const hostBookingRequests = useMemo(() => {
    return getHostBookingRequests(allBookingRequests, allUserListings);
  }, [allBookingRequests, allUserListings]);

  const hostDashboardMessages = useMemo(() => {
    return getHostMessagesForListings(allHostMessages, allUserListings);
  }, [allHostMessages, allUserListings]);

  async function login(userOrCredentials = {}) {
    const hasPasswordCredentials = Boolean(userOrCredentials.password);

    if (!hasPasswordCredentials) {
      const loggedInUser = persistAuthenticatedUser(userOrCredentials);

      return {
        ok: true,
        user: loggedInUser,
      };
    }

    setAuthIsLoading(true);
    setAuthError("");

    const isSignup = userOrCredentials.authMode === "signup";
    const authResponse = isSignup
      ? await authService.signUp(userOrCredentials)
      : await authService.signIn(userOrCredentials);

    setAuthIsLoading(false);

    if (authResponse.error) {
      const message = getErrorMessage(
        authResponse.error,
        "We could not finish signing you in. Please try again."
      );
      setAuthError(message);

      return {
        ok: false,
        error: message,
      };
    }

    if (authResponse.data?.needsEmailConfirmation) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        user: authResponse.data.user,
      };
    }

    if (authResponse.data?.user) {
      const loggedInUser = persistAuthenticatedUser(authResponse.data.user);

      return {
        ok: true,
        user: loggedInUser,
      };
    }

    const fallbackMessage = "We could not finish signing you in. Please try again.";
    setAuthError(fallbackMessage);

    return {
      ok: false,
      error: fallbackMessage,
    };
  }

  async function logout() {
    setAuthIsLoading(true);
    setAuthError("");

    const response = await authService.signOut();

    setAuthIsLoading(false);

    if (response.error) {
      const message = getErrorMessage(response.error, "We could not sign you out.");
      setAuthError(message);
      return {
        ok: false,
        error: message,
      };
    }

    clearAuthenticatedUser();

    return {
      ok: true,
    };
  }

  async function addListing(newListing) {
    if (!newListing) {
      return {
        ok: false,
        error: "We could not save an empty listing.",
      };
    }

    setListingsError("");

    const response = await listingService.createListing(newListing);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not save your listing to Storet yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedListing = response.data;

    setUserListings((currentListings) =>
      mergeListingsById([savedListing], currentListings)
    );

    if (savedListing?.status === LISTING_STATUSES.ACTIVE) {
      setListings((currentListings) =>
        mergeListingsById([savedListing], currentListings)
      );
    }

    return {
      ok: true,
      listing: savedListing,
    };
  }

  async function toggleSave(listingId) {
    const normalizedId = String(listingId);
    const safeCurrentIds = normalizeSavedIds(savedListingIds);
    const isCurrentlySaved = safeCurrentIds.includes(normalizedId);
    const updatedIds = isCurrentlySaved
      ? safeCurrentIds.filter((id) => id !== normalizedId)
      : [...safeCurrentIds, normalizedId];

    setSavedListingIds(updatedIds);

    if (!currentUser?.isAuthenticated || !isBackendListingId(normalizedId)) {
      storetDataService.saveSavedListingIds(updatedIds);
      return {
        ok: true,
        savedListingIds: updatedIds,
      };
    }

    setListingsError("");

    const response = isCurrentlySaved
      ? await listingService.unsaveListing(normalizedId)
      : await listingService.saveListing(normalizedId);

    if (response.error) {
      setSavedListingIds(safeCurrentIds);
      const message = getErrorMessage(
        response.error,
        "We could not update your saved listings yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    return {
      ok: true,
      savedListingIds: updatedIds,
    };
  }

  async function toggleListingStatus(listingId) {
    const normalizedId = String(listingId);
    const targetListing = allUserListings.find(
      (listing) => String(listing.id) === normalizedId
    );

    if (!targetListing) {
      return {
        ok: false,
        error: "We could not find that listing.",
      };
    }

    const currentStatus = targetListing.status || LISTING_STATUSES.ACTIVE;
    const nextStatus =
      currentStatus === LISTING_STATUSES.PAUSED
        ? LISTING_STATUSES.ACTIVE
        : LISTING_STATUSES.PAUSED;
    const updatedListing = {
      ...targetListing,
      status: nextStatus,
      availabilityStatus:
        nextStatus === LISTING_STATUSES.ACTIVE ? "available" : "unavailable",
      updatedAt: new Date().toISOString(),
    };

    const previousHostListings = allUserListings;
    const previousActiveListings = activeBackendListings;

    setUserListings((currentListings) =>
      ensureArray(currentListings).map((listing) =>
        String(listing.id) === normalizedId ? updatedListing : listing
      )
    );

    setListings((currentListings) => {
      const withoutListing = ensureArray(currentListings).filter(
        (listing) => String(listing.id) !== normalizedId
      );

      return nextStatus === LISTING_STATUSES.ACTIVE
        ? mergeListingsById([updatedListing], withoutListing)
        : withoutListing;
    });

    setListingsError("");

    const response = await listingService.updateListing(normalizedId, {
      status: nextStatus,
      availabilityStatus: updatedListing.availabilityStatus,
    });

    if (response.error) {
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      const message = getErrorMessage(
        response.error,
        "We could not update that listing status yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedListing = response.data || updatedListing;

    setUserListings((currentListings) =>
      ensureArray(currentListings).map((listing) =>
        String(listing.id) === normalizedId ? savedListing : listing
      )
    );

    if (savedListing.status === LISTING_STATUSES.ACTIVE) {
      setListings((currentListings) =>
        mergeListingsById([savedListing], currentListings)
      );
    }

    return {
      ok: true,
      listing: savedListing,
    };
  }

  async function deleteListing(listingId) {
    const normalizedId = String(listingId);
    const previousHostListings = allUserListings;
    const previousActiveListings = activeBackendListings;
    const previousSavedIds = normalizeSavedIds(savedListingIds);

    setUserListings((currentListings) =>
      ensureArray(currentListings).filter(
        (listing) => String(listing.id) !== normalizedId
      )
    );

    setListings((currentListings) =>
      ensureArray(currentListings).filter(
        (listing) => String(listing.id) !== normalizedId
      )
    );

    setSavedListingIds((currentIds) =>
      normalizeSavedIds(currentIds).filter((id) => String(id) !== normalizedId)
    );

    setBookingRequests((currentRequests) => {
      const updatedRequests = ensureArray(currentRequests).filter(
        (request) => String(request.listingId) !== normalizedId
      );

      storetDataService.saveBookingRequests(updatedRequests);
      return updatedRequests;
    });

    setPaymentRecords((currentPaymentRecords) => {
      const updatedPaymentRecords = ensureArray(currentPaymentRecords).filter(
        (payment) => String(payment.listingId) !== normalizedId
      );

      storetDataService.savePaymentRecords(updatedPaymentRecords);
      return updatedPaymentRecords;
    });

    setHostMessages((currentMessages) => {
      const updatedMessages = ensureArray(currentMessages).filter(
        (message) => String(message.listingId) !== normalizedId
      );

      storetDataService.saveHostMessages(updatedMessages);
      return updatedMessages;
    });

    if (!isBackendListingId(normalizedId)) {
      storetDataService.saveUserListings(
        previousHostListings.filter((listing) => String(listing.id) !== normalizedId)
      );
      storetDataService.saveSavedListingIds(
        previousSavedIds.filter((id) => String(id) !== normalizedId)
      );

      return { ok: true };
    }

    setListingsError("");

    const response = await listingService.deleteListing(normalizedId);

    if (response.error) {
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      setSavedListingIds(previousSavedIds);
      const message = getErrorMessage(
        response.error,
        "We could not delete that listing yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    return { ok: true };
  }

  function submitBookingRequest(listing, requestData = {}) {
    if (!listing) {
      return {
        ok: false,
        error: "We could not find that listing.",
      };
    }

    const request = createBookingRequest({
      listing,
      currentUser,
      requestData,
    });

    setBookingRequests((currentRequests) => {
      const updatedRequests = [request, ...ensureArray(currentRequests)];
      storetDataService.saveBookingRequests(updatedRequests);
      return updatedRequests;
    });

    return {
      ok: true,
      request,
    };
  }

  function updateBookingRequestStatusById(requestId, status) {
    setBookingRequests((currentRequests) => {
      const updatedRequests = ensureArray(currentRequests).map((request) =>
        request.id === requestId ? updateBookingRequestStatus(request, status) : request
      );

      storetDataService.saveBookingRequests(updatedRequests);
      return updatedRequests;
    });
  }

  function updateBookingLifecycleById(requestId, status) {
    setBookingRequests((currentRequests) => {
      const updatedRequests = ensureArray(currentRequests).map((request) =>
        request.id === requestId ? updateBookingLifecycle(request, status) : request
      );

      storetDataService.saveBookingRequests(updatedRequests);
      return updatedRequests;
    });
  }

  function submitHostMessage(listing, messageData = {}) {
    if (!listing) {
      return {
        ok: false,
        error: "We could not find that listing.",
      };
    }

    const hostMessage = createHostMessage({
      listing,
      currentUser,
      messageData,
    });

    setHostMessages((currentMessages) => {
      const updatedMessages = [hostMessage, ...ensureArray(currentMessages)];
      storetDataService.saveHostMessages(updatedMessages);
      return updatedMessages;
    });

    return {
      ok: true,
      message: hostMessage,
    };
  }

  function updateHostMessageStatusById(messageId, status) {
    setHostMessages((currentMessages) => {
      const updatedMessages = ensureArray(currentMessages).map((message) =>
        message.id === messageId ? updateHostMessageStatus(message, status) : message
      );

      storetDataService.saveHostMessages(updatedMessages);
      return updatedMessages;
    });
  }

  function completeCheckout(requestId, paymentData = {}) {
    const request = allBookingRequests.find((item) => item.id === requestId);

    if (!request) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    const paymentRecord = createPaymentRecord(request, paymentData);

    setPaymentRecords((currentPaymentRecords) => {
      const updatedPaymentRecords = [paymentRecord, ...ensureArray(currentPaymentRecords)];
      storetDataService.savePaymentRecords(updatedPaymentRecords);
      return updatedPaymentRecords;
    });

    setBookingRequests((currentRequests) => {
      const updatedRequests = ensureArray(currentRequests).map((currentRequest) => {
        if (currentRequest.id !== requestId) {
          return currentRequest;
        }

        return {
          ...updateBookingLifecycle(currentRequest, BOOKING_STATUSES.CONFIRMED),
          paymentRecordId: paymentRecord.id,
          confirmedAt: paymentRecord.paidAt,
          updatedAt: paymentRecord.paidAt,
        };
      });

      storetDataService.saveBookingRequests(updatedRequests);
      return updatedRequests;
    });

    return {
      ok: true,
      paymentRecord,
    };
  }

  const value = {
    currentUser,
    listings: allListings,
    activeListings: activeBackendListings,
    userListings: allUserListings,
    savedListingIds,
    bookingRequests: allBookingRequests,
    paymentRecords: allPaymentRecords,
    hostMessages: allHostMessages,
    hostBookingRequests,
    hostDashboardMessages,
    authIsLoading,
    authError,
    listingsAreLoading,
    listingsError,
    actions: {
      login,
      logout,
      addListing,
      toggleSave,
      toggleListingStatus,
      deleteListing,
      submitBookingRequest,
      updateBookingRequestStatus: updateBookingRequestStatusById,
      updateBookingLifecycle: updateBookingLifecycleById,
      submitHostMessage,
      updateHostMessageStatus: updateHostMessageStatusById,
      completeCheckout,
      refreshActiveListings,
      refreshCurrentUserListingData,
    },
  };

  return (
    <StoretAppContext.Provider value={value}>
      {children}
    </StoretAppContext.Provider>
  );
}

export function useStoretApp() {
  const context = useContext(StoretAppContext);

  if (!context) {
    throw new Error("useStoretApp must be used within a StoretAppProvider.");
  }

  return context;
}

export function useOptionalStoretApp() {
  return useContext(StoretAppContext);
}
