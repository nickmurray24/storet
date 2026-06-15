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
import { normalizeSavedIds } from "../utils/listingUtils";
import { getHostMessagesForListings } from "../utils/messageSelectors";
import { authService } from "../services/authService";
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

export function StoretAppProvider({ children }) {
  const initialState = useMemo(() => storetDataService.loadState(), []);

  const [currentUser, setCurrentUser] = useState(initialState.currentUser);
  const [userListings, setUserListings] = useState(initialState.userListings);
  const [savedListingIds, setSavedListingIds] = useState(initialState.savedListingIds);
  const [bookingRequests, setBookingRequests] = useState(initialState.bookingRequests);
  const [paymentRecords, setPaymentRecords] = useState(initialState.paymentRecords);
  const [hostMessages, setHostMessages] = useState(initialState.hostMessages);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

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

  const allUserListings = useMemo(() => ensureArray(userListings), [userListings]);
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

  function addListing(newListing) {
    if (!newListing) {
      return;
    }

    setUserListings((currentListings) => {
      const updatedListings = [newListing, ...ensureArray(currentListings)];
      storetDataService.saveUserListings(updatedListings);
      return updatedListings;
    });
  }

  function toggleSave(listingId) {
    const normalizedId = String(listingId);

    setSavedListingIds((currentIds) => {
      const safeCurrentIds = normalizeSavedIds(currentIds);
      const updatedIds = safeCurrentIds.includes(normalizedId)
        ? safeCurrentIds.filter((id) => id !== normalizedId)
        : [...safeCurrentIds, normalizedId];

      storetDataService.saveSavedListingIds(updatedIds);
      return updatedIds;
    });
  }

  function toggleListingStatus(listingId) {
    const normalizedId = String(listingId);

    setUserListings((currentListings) => {
      const updatedListings = ensureArray(currentListings).map((listing) => {
        if (String(listing.id) !== normalizedId) {
          return listing;
        }

        const currentStatus = listing.status || LISTING_STATUSES.ACTIVE;

        return {
          ...listing,
          status:
            currentStatus === LISTING_STATUSES.PAUSED
              ? LISTING_STATUSES.ACTIVE
              : LISTING_STATUSES.PAUSED,
          updatedAt: new Date().toISOString(),
        };
      });

      storetDataService.saveUserListings(updatedListings);
      return updatedListings;
    });
  }

  function deleteListing(listingId) {
    const normalizedId = String(listingId);

    setUserListings((currentListings) => {
      const updatedListings = ensureArray(currentListings).filter(
        (listing) => String(listing.id) !== normalizedId
      );

      storetDataService.saveUserListings(updatedListings);
      return updatedListings;
    });

    setSavedListingIds((currentIds) => {
      const updatedIds = normalizeSavedIds(currentIds).filter(
        (id) => String(id) !== normalizedId
      );

      storetDataService.saveSavedListingIds(updatedIds);
      return updatedIds;
    });

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
    userListings: allUserListings,
    savedListingIds,
    bookingRequests: allBookingRequests,
    paymentRecords: allPaymentRecords,
    hostMessages: allHostMessages,
    hostBookingRequests,
    hostDashboardMessages,
    authIsLoading,
    authError,
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
