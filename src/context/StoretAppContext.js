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
import { createReviewRecord, normalizeReviewList } from "../utils/reviewUtils";
import { getUnreadNotificationCount, normalizeNotificationList } from "../utils/notificationUtils";
import { normalizeHostAnalytics } from "../utils/hostAnalyticsUtils";
import { getHostMessagesForListings } from "../utils/messageSelectors";
import { authService } from "../services/authService";
import { bookingService } from "../services/bookingService";
import { listingService } from "../services/listingService";
import { listingImageService } from "../services/listingImageService";
import { messageService } from "../services/messageService";
import { paymentService } from "../services/paymentService";
import { notificationService } from "../services/notificationService";
import { reviewService } from "../services/reviewService";
import { hostAnalyticsService } from "../services/hostAnalyticsService";
import { stripeCheckoutService } from "../services/stripeCheckoutService";
import { payoutService } from "../services/payoutService";
import { storetDataService } from "../services/storetDataService";
import {
  APP_MODES,
  AVAILABILITY_STATUSES,
  LISTING_STATUSES,
  USER_ROLES,
} from "../constants/appEnums";
import { getHostPayoutStatus } from "../utils/payoutUtils";
import { APP_ROUTES, buildCheckoutPath, getSafeRedirectPath } from "../routes/appRoutes";
import { normalizeUserProfile } from "../models/storetModels";
import {
  getDefaultModeForUser,
  getNextRoleForHostUpgrade,
  getNextRoleForRenterUpgrade,
  getUserCapabilityModes,
  userCanUseHostMode,
  userCanUseMode,
  userCanUseRenterMode,
} from "../utils/roleUtils";

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

function mergeRecordsById(...recordGroups) {
  const recordMap = new Map();

  recordGroups.flatMap(ensureArray).forEach((record) => {
    if (!record?.id) {
      return;
    }

    recordMap.set(String(record.id), record);
  });

  return Array.from(recordMap.values());
}

function replaceRecordById(records = [], recordId, nextRecord) {
  return ensureArray(records).map((record) =>
    String(record.id) === String(recordId) ? nextRecord : record
  );
}

function removeRecordById(records = [], recordId) {
  return ensureArray(records).filter((record) => String(record.id) !== String(recordId));
}

function getAvailableListingAvailabilityStatus(listing = {}) {
  return listing.waitlist
    ? AVAILABILITY_STATUSES.WAITLIST
    : AVAILABILITY_STATUSES.AVAILABLE;
}

function bookingStatusBlocksListing(status) {
  return [
    BOOKING_STATUSES.APPROVED,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.ACTIVE,
  ].includes(status);
}

function syncListingWithBookingState(listing, requests = [], options = {}) {
  if (!listing?.id) {
    return listing;
  }

  const listingRequests = ensureArray(requests).filter(
    (request) => String(request.listingId) === String(listing.id)
  );
  const hasBlockingBooking = listingRequests.some((request) =>
    bookingStatusBlocksListing(request.status)
  );
  const postBookingActionRequired = Boolean(
    listing.postBookingActionRequired || options.markPostBookingActionRequired
  );
  const shouldStayUnavailable = hasBlockingBooking || postBookingActionRequired;

  return {
    ...listing,
    availabilityStatus: shouldStayUnavailable
      ? AVAILABILITY_STATUSES.UNAVAILABLE
      : listing.status === LISTING_STATUSES.ACTIVE
      ? getAvailableListingAvailabilityStatus(listing)
      : AVAILABILITY_STATUSES.UNAVAILABLE,
    postBookingActionRequired,
    updatedAt: new Date().toISOString(),
  };
}

function attachPaymentRecordIdsToBookings(bookings = [], payments = []) {
  const paymentIdByRequestId = new Map();

  ensureArray(payments).forEach((payment) => {
    const requestId = payment?.requestId || payment?.bookingRequestId;

    if (requestId && payment?.id) {
      paymentIdByRequestId.set(String(requestId), payment.id);
    }
  });

  return ensureArray(bookings).map((booking) => {
    const linkedPaymentRecordId = paymentIdByRequestId.get(String(booking.id));

    return linkedPaymentRecordId && !booking.paymentRecordId
      ? { ...booking, paymentRecordId: linkedPaymentRecordId }
      : booking;
  });
}

function isBackendId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function getPreferredModeFromAuthInput(userOrCredentials = {}) {
  if (userOrCredentials.preferredMode === APP_MODES.HOST) {
    return APP_MODES.HOST;
  }

  if (userOrCredentials.role === USER_ROLES.HOST) {
    return APP_MODES.HOST;
  }

  return APP_MODES.RENTER;
}

function routeRequiresHostAccess(pathname = "") {
  return (
    pathname === APP_ROUTES.hostDashboard ||
    pathname === APP_ROUTES.createListing ||
    pathname.startsWith(`${APP_ROUTES.hostDashboard}/`) ||
    pathname.startsWith(`${APP_ROUTES.createListing}/`)
  );
}

function routeIsAuthOrHome(pathname = "") {
  return pathname === APP_ROUTES.home || pathname === APP_ROUTES.auth;
}

function getModeForUserSession(user, preferredMode = APP_MODES.RENTER, hostListingCount = 0) {
  const normalizedPreferredMode = preferredMode === APP_MODES.HOST ? APP_MODES.HOST : APP_MODES.RENTER;
  const hasHostListings = Number(hostListingCount) > 0;
  const canHost = userCanUseHostMode(user);
  const canRenter = userCanUseRenterMode(user);

  if (normalizedPreferredMode === APP_MODES.HOST && canHost) {
    if (hasHostListings || !canRenter) {
      return APP_MODES.HOST;
    }

    return APP_MODES.RENTER;
  }

  if (canRenter) {
    return APP_MODES.RENTER;
  }

  return getDefaultModeForUser(user, normalizedPreferredMode);
}

function getPostAuthRedirectPath(user, options = {}) {
  const {
    preferredMode = APP_MODES.RENTER,
    requestedPath = "",
    hostListingCount = 0,
  } = options;

  const safeRequestedPath = getSafeRedirectPath(requestedPath, "");
  const hasHostListings = Number(hostListingCount) > 0;
  const wantsHost = preferredMode === APP_MODES.HOST;
  const canHost = userCanUseHostMode(user);
  const canRenter = userCanUseRenterMode(user);

  const hostDestination = hasHostListings
    ? APP_ROUTES.hostDashboard
    : APP_ROUTES.createListing;

  if (safeRequestedPath && !routeIsAuthOrHome(safeRequestedPath)) {
    if (routeRequiresHostAccess(safeRequestedPath)) {
      if (canHost) {
        return hasHostListings ? safeRequestedPath : APP_ROUTES.createListing;
      }

      return APP_ROUTES.explore;
    }

    if (!canRenter && canHost) {
      return hostDestination;
    }

    return safeRequestedPath;
  }

  if (wantsHost && canHost) {
    return hostDestination;
  }

  if (!canRenter && canHost) {
    return hostDestination;
  }

  return APP_ROUTES.explore;
}

export function StoretAppProvider({ children }) {
  const initialState = useMemo(() => storetDataService.loadState(), []);

  const [currentUser, setCurrentUser] = useState(initialState.currentUser);
  const [activeMode, setActiveMode] = useState(
    getDefaultModeForUser(initialState.currentUser, initialState.activeMode)
  );
  const [listings, setListings] = useState([]);
  const [userListings, setUserListings] = useState(initialState.userListings);
  const [savedListingIds, setSavedListingIds] = useState(initialState.savedListingIds);
  const [bookingRequests, setBookingRequests] = useState(initialState.bookingRequests);
  const [paymentRecords, setPaymentRecords] = useState(initialState.paymentRecords);
  const [hostMessages, setHostMessages] = useState(initialState.hostMessages);
  const [reviewsByListingId, setReviewsByListingId] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [hostAnalytics, setHostAnalytics] = useState(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [listingsAreLoading, setListingsAreLoading] = useState(false);
  const [listingsError, setListingsError] = useState("");
  const [activityIsLoading, setActivityIsLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [reviewsAreLoading, setReviewsAreLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [notificationsAreLoading, setNotificationsAreLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [hostAnalyticsAreLoading, setHostAnalyticsAreLoading] = useState(false);
  const [hostAnalyticsError, setHostAnalyticsError] = useState("");

  const persistAuthenticatedUser = useCallback((user, options = {}) => {
    const normalizedUser = normalizeUserProfile({
      ...user,
      isAuthenticated: true,
      role: user?.role || USER_ROLES.RENTER,
    });

    const preferredMode = options.preferredMode || activeMode;
    const hostListingCount = options.hostListingCount ?? userListings.length;
    const nextMode = getModeForUserSession(
      normalizedUser,
      preferredMode,
      hostListingCount
    );

    storetDataService.saveCurrentUser(normalizedUser);
    storetDataService.saveActiveMode(nextMode);
    setCurrentUser(normalizedUser);
    setActiveMode(nextMode);
    setAuthError("");

    return normalizedUser;
  }, [activeMode, userListings.length]);

  const clearAuthenticatedUser = useCallback(() => {
    storetDataService.clearCurrentUser();
    setCurrentUser(null);
    setUserListings([]);
    setSavedListingIds([]);
    setBookingRequests([]);
    setPaymentRecords([]);
    setHostMessages([]);
    setActivityError("");
    setListingsError("");
    setReviewsError("");
    setNotifications([]);
    setNotificationsError("");
    setHostAnalytics(null);
    setHostAnalyticsError("");
    setActiveMode(APP_MODES.RENTER);
    storetDataService.saveActiveMode(APP_MODES.RENTER);
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

  const refreshCurrentUserActivityData = useCallback(async () => {
    if (!currentUser?.isAuthenticated) {
      setBookingRequests([]);
      setPaymentRecords([]);
      setHostMessages([]);
      return { ok: true };
    }

    setActivityIsLoading(true);
    setActivityError("");

    const [bookingsResponse, paymentsResponse, messagesResponse] = await Promise.all([
      bookingService.getCurrentUserBookings(),
      paymentService.getCurrentUserPaymentRecords(),
      messageService.getCurrentUserMessages(),
    ]);

    setActivityIsLoading(false);

    if (bookingsResponse.error || paymentsResponse.error || messagesResponse.error) {
      const message = getErrorMessage(
        bookingsResponse.error || paymentsResponse.error || messagesResponse.error,
        "We could not load your booking and message activity yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const enrichedBookingRequests = attachPaymentRecordIdsToBookings(
      bookingsResponse.data || [],
      paymentsResponse.data || []
    );

    setBookingRequests(enrichedBookingRequests);
    setPaymentRecords(paymentsResponse.data || []);
    setHostMessages(messagesResponse.data || []);

    return {
      ok: true,
      bookingRequests: enrichedBookingRequests,
      paymentRecords: paymentsResponse.data || [],
      hostMessages: messagesResponse.data || [],
    };
  }, [currentUser?.isAuthenticated]);

  const refreshCurrentUserNotificationData = useCallback(async () => {
    if (!currentUser?.isAuthenticated) {
      setNotifications([]);
      return { ok: true, notifications: [] };
    }

    setNotificationsAreLoading(true);
    setNotificationsError("");

    const response = await notificationService.getCurrentUserNotifications();

    setNotificationsAreLoading(false);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not load your notifications yet."
      );
      setNotificationsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const normalizedNotifications = normalizeNotificationList(response.data || []);
    setNotifications(normalizedNotifications);

    return {
      ok: true,
      notifications: normalizedNotifications,
    };
  }, [currentUser?.id, currentUser?.isAuthenticated]);


  const refreshCurrentUserHostAnalyticsData = useCallback(async () => {
    if (!currentUser?.isAuthenticated) {
      setHostAnalytics(null);
      return { ok: true, hostAnalytics: null };
    }

    setHostAnalyticsAreLoading(true);
    setHostAnalyticsError("");

    const response = await hostAnalyticsService.getCurrentHostAnalytics();

    setHostAnalyticsAreLoading(false);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not load host analytics yet."
      );
      setHostAnalyticsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const normalizedAnalytics = normalizeHostAnalytics(response.data || {});
    setHostAnalytics(normalizedAnalytics);

    return {
      ok: true,
      hostAnalytics: normalizedAnalytics,
    };
  }, [currentUser?.id, currentUser?.isAuthenticated]);

  const refreshHostPayoutStatus = useCallback(async () => {
    if (!currentUser?.isAuthenticated) {
      return { ok: false, error: "Please sign in before checking payout setup." };
    }

    setListingsError("");

    const response = await payoutService.refreshConnectAccountStatus();

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not refresh your payout setup status yet."
      );
      setListingsError(message);

      return { ok: false, error: message };
    }

    const refreshedUser = response.data?.user;

    if (refreshedUser) {
      const nextUser = persistAuthenticatedUser({
        ...currentUser,
        ...refreshedUser,
      });

      return { ok: true, user: nextUser, payoutStatus: getHostPayoutStatus(nextUser) };
    }

    return { ok: true, payoutStatus: getHostPayoutStatus(currentUser) };
  }, [currentUser, persistAuthenticatedUser]);

  const startPayoutOnboarding = useCallback(async ({ returnPath, refreshPath } = {}) => {
    if (!currentUser?.isAuthenticated) {
      return { ok: false, error: "Please sign in before setting up payouts." };
    }

    setListingsError("");

    const response = await payoutService.createConnectAccountLink({
      returnPath,
      refreshPath,
    });

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not start Stripe payout setup yet."
      );
      setListingsError(message);

      return { ok: false, error: message };
    }

    const updatedUser = response.data?.user;

    if (updatedUser) {
      persistAuthenticatedUser({
        ...currentUser,
        ...updatedUser,
      });
    }

    if (response.data?.url) {
      window.location.assign(response.data.url);
      return { ok: true, url: response.data.url };
    }

    return {
      ok: false,
      error: "Stripe did not return a payout setup link.",
    };
  }, [currentUser, persistAuthenticatedUser]);

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

  useEffect(() => {
    refreshCurrentUserActivityData();
  }, [refreshCurrentUserActivityData]);

  useEffect(() => {
    refreshCurrentUserNotificationData();
  }, [refreshCurrentUserNotificationData]);

  useEffect(() => {
    refreshCurrentUserHostAnalyticsData();
  }, [refreshCurrentUserHostAnalyticsData]);

  useEffect(() => {
    if (!currentUser?.isAuthenticated || !currentUser?.id) {
      return undefined;
    }

    const subscription = notificationService.subscribeToCurrentUserNotifications(
      currentUser.id,
      () => {
        refreshCurrentUserNotificationData();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.id, currentUser?.isAuthenticated, refreshCurrentUserNotificationData]);

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
  const allNotifications = useMemo(
    () => normalizeNotificationList(notifications),
    [notifications]
  );
  const unreadNotificationsCount = useMemo(
    () => getUnreadNotificationCount(allNotifications),
    [allNotifications]
  );
  const userCapabilityModes = useMemo(
    () => getUserCapabilityModes(currentUser),
    [currentUser]
  );
  const canUseHostMode = useMemo(
    () => userCanUseHostMode(currentUser),
    [currentUser]
  );
  const canUseRenterMode = useMemo(
    () => userCanUseRenterMode(currentUser),
    [currentUser]
  );
  const hasHostedListings = allUserListings.length > 0;
  const hostDashboardIsAvailable = canUseHostMode && hasHostedListings;
  const currentActiveMode = useMemo(() => {
    const normalizedMode = getDefaultModeForUser(currentUser, activeMode);
    const shouldFallbackToRenter =
      normalizedMode === APP_MODES.HOST &&
      !hasHostedListings &&
      userCanUseRenterMode(currentUser);

    return shouldFallbackToRenter ? APP_MODES.RENTER : normalizedMode;
  }, [activeMode, currentUser, hasHostedListings]);
  const isHostMode = currentActiveMode === APP_MODES.HOST;
  const isRenterMode = currentActiveMode === APP_MODES.RENTER;
  const hostPayoutStatus = useMemo(
    () => getHostPayoutStatus(currentUser),
    [currentUser]
  );
  const hostPayoutsReady = hostPayoutStatus.isReady;

  useEffect(() => {
    if (!currentUser?.isAuthenticated) {
      return;
    }

    const nextMode = getModeForUserSession(
      currentUser,
      activeMode,
      allUserListings.length
    );

    if (nextMode !== activeMode) {
      setActiveMode(nextMode);
      storetDataService.saveActiveMode(nextMode);
    }
  }, [activeMode, allUserListings.length, currentUser]);

  const hostBookingRequests = useMemo(() => {
    return getHostBookingRequests(allBookingRequests, allUserListings);
  }, [allBookingRequests, allUserListings]);

  const hostDashboardMessages = useMemo(() => {
    return getHostMessagesForListings(allHostMessages, allUserListings);
  }, [allHostMessages, allUserListings]);

  async function login(userOrCredentials = {}) {
    const hasPasswordCredentials = Boolean(userOrCredentials.password);
    const preferredMode = getPreferredModeFromAuthInput(userOrCredentials);

    if (!hasPasswordCredentials) {
      const loggedInUser = persistAuthenticatedUser(userOrCredentials, {
        preferredMode,
        hostListingCount: userListings.length,
      });

      return {
        ok: true,
        user: loggedInUser,
        activeMode: getModeForUserSession(loggedInUser, preferredMode, userListings.length),
        redirectPath: getPostAuthRedirectPath(loggedInUser, {
          preferredMode,
          requestedPath: userOrCredentials.redirectAfterAuth,
          hostListingCount: userListings.length,
        }),
      };
    }

    setAuthIsLoading(true);
    setAuthError("");

    const isSignup = userOrCredentials.authMode === "signup";
    const authResponse = isSignup
      ? await authService.signUp(userOrCredentials)
      : await authService.signIn(userOrCredentials);

    if (authResponse.error) {
      const message = getErrorMessage(
        authResponse.error,
        "We could not finish signing you in. Please try again."
      );
      setAuthError(message);
      setAuthIsLoading(false);

      return {
        ok: false,
        error: message,
      };
    }

    if (authResponse.data?.needsEmailConfirmation) {
      setAuthIsLoading(false);

      return {
        ok: true,
        needsEmailConfirmation: true,
        user: authResponse.data.user,
      };
    }

    if (authResponse.data?.user) {
      const hostListingsResponse = await listingService.getCurrentUserListings();
      const savedListingsResponse = await listingService.getSavedListingIds();

      const hostListings = hostListingsResponse.error
        ? []
        : normalizeListingList(hostListingsResponse.data || []);
      const nextSavedListingIds = savedListingsResponse.error
        ? []
        : normalizeSavedIds(savedListingsResponse.data);

      if (hostListingsResponse.error || savedListingsResponse.error) {
        const message = getErrorMessage(
          hostListingsResponse.error || savedListingsResponse.error,
          "You are signed in, but we could not load all of your account data yet."
        );
        setListingsError(message);
      }

      setUserListings(hostListings);
      setSavedListingIds(nextSavedListingIds);

      const loggedInUser = persistAuthenticatedUser(authResponse.data.user, {
        preferredMode,
        hostListingCount: hostListings.length,
      });
      const nextMode = getModeForUserSession(
        loggedInUser,
        preferredMode,
        hostListings.length
      );

      setAuthIsLoading(false);

      return {
        ok: true,
        user: loggedInUser,
        activeMode: nextMode,
        redirectPath: getPostAuthRedirectPath(loggedInUser, {
          preferredMode,
          requestedPath: userOrCredentials.redirectAfterAuth,
          hostListingCount: hostListings.length,
        }),
      };
    }

    const fallbackMessage = "We could not finish signing you in. Please try again.";
    setAuthError(fallbackMessage);
    setAuthIsLoading(false);

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

  function switchActiveMode(nextMode) {
    const normalizedMode = getDefaultModeForUser(currentUser, nextMode);

    if (!currentUser?.isAuthenticated || !userCanUseMode(currentUser, normalizedMode)) {
      return {
        ok: false,
        error: "That Storet mode is not available for this account.",
      };
    }

    if (
      normalizedMode === APP_MODES.HOST &&
      !hasHostedListings &&
      userCanUseRenterMode(currentUser)
    ) {
      return {
        ok: false,
        error: "Create your first listing before switching into host mode.",
      };
    }

    setActiveMode(normalizedMode);
    storetDataService.saveActiveMode(normalizedMode);

    return {
      ok: true,
      activeMode: normalizedMode,
    };
  }

  async function becomeHost() {
    if (!currentUser?.isAuthenticated) {
      return {
        ok: false,
        error: "Please sign in before becoming a host.",
      };
    }

    const nextRole = getNextRoleForHostUpgrade(currentUser.role);
    const nextMode = hasHostedListings ? APP_MODES.HOST : APP_MODES.RENTER;

    if (currentUser.role === nextRole && userCanUseHostMode(currentUser)) {
      setActiveMode(nextMode);
      storetDataService.saveActiveMode(nextMode);

      return {
        ok: true,
        user: currentUser,
        activeMode: nextMode,
        needsFirstListing: !hasHostedListings,
      };
    }

    setAuthError("");

    const response = await authService.updateCurrentUserRole(nextRole);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not upgrade your account for hosting yet."
      );
      setAuthError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const upgradedUser = persistAuthenticatedUser({
      ...currentUser,
      ...(response.data || {}),
      role: nextRole,
    });

    setActiveMode(nextMode);
    storetDataService.saveActiveMode(nextMode);

    return {
      ok: true,
      user: upgradedUser,
      activeMode: nextMode,
      needsFirstListing: !hasHostedListings,
    };
  }

  async function becomeRenter() {
    if (!currentUser?.isAuthenticated) {
      return {
        ok: false,
        error: "Please sign in before creating a renter account.",
      };
    }

    const nextRole = getNextRoleForRenterUpgrade(currentUser.role);
    const nextMode = APP_MODES.RENTER;

    if (currentUser.role === nextRole && userCanUseRenterMode(currentUser)) {
      setActiveMode(nextMode);
      storetDataService.saveActiveMode(nextMode);

      return {
        ok: true,
        user: currentUser,
        activeMode: nextMode,
      };
    }

    setAuthError("");

    const response = await authService.updateCurrentUserRole(nextRole);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not add renter access to your account yet."
      );
      setAuthError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const upgradedUser = persistAuthenticatedUser(
      {
        ...currentUser,
        ...(response.data || {}),
        role: nextRole,
      },
      { preferredMode: nextMode }
    );

    setActiveMode(nextMode);
    storetDataService.saveActiveMode(nextMode);

    return {
      ok: true,
      user: upgradedUser,
      activeMode: nextMode,
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

    setActiveMode(APP_MODES.HOST);
    storetDataService.saveActiveMode(APP_MODES.HOST);
    refreshCurrentUserHostAnalyticsData();

    return {
      ok: true,
      listing: savedListing,
    };
  }

  async function attachListingImages(listingId, imageFiles = []) {
    const normalizedId = String(listingId || "");

    if (!normalizedId) {
      return {
        ok: false,
        error: "We could not find that listing before uploading photos.",
      };
    }

    if (!currentUser?.isAuthenticated || !isBackendId(normalizedId)) {
      return {
        ok: true,
        imageUrls: [],
      };
    }

    const targetListing = allUserListings.find(
      (listing) => String(listing.id) === normalizedId
    );

    setListingsError("");

    const uploadResponse = await listingImageService.uploadListingImages(imageFiles, {
      listingId: normalizedId,
    });

    if (uploadResponse.error) {
      const message = getErrorMessage(
        uploadResponse.error,
        "We saved your listing, but could not upload the photos yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const imageUrls = (uploadResponse.data || [])
      .map((image) => image.url)
      .filter(Boolean);

    if (imageUrls.length === 0) {
      return {
        ok: true,
        imageUrls: [],
      };
    }

    const nextImages = Array.from(
      new Set([...(targetListing?.images || []), ...imageUrls])
    );

    const updateResponse = await listingService.updateListing(normalizedId, {
      images: nextImages,
    });

    if (updateResponse.error) {
      const message = getErrorMessage(
        updateResponse.error,
        "We uploaded your photos, but could not attach them to the listing yet."
      );
      setListingsError(message);

      return {
        ok: false,
        error: message,
        imageUrls,
      };
    }

    const updatedListing = updateResponse.data;

    setUserListings((currentListings) =>
      ensureArray(currentListings).map((listing) =>
        String(listing.id) === normalizedId ? updatedListing : listing
      )
    );

    setListings((currentListings) =>
      updatedListing?.status === LISTING_STATUSES.ACTIVE
        ? mergeListingsById([updatedListing], currentListings)
        : ensureArray(currentListings)
    );

    return {
      ok: true,
      listing: updatedListing,
      imageUrls,
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

    if (!currentUser?.isAuthenticated || !isBackendId(normalizedId)) {
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

    const currentStatus = targetListing.status || LISTING_STATUSES.DRAFT;
    const nextStatus =
      currentStatus === LISTING_STATUSES.DRAFT
        ? LISTING_STATUSES.ACTIVE
        : currentStatus === LISTING_STATUSES.PAUSED
        ? LISTING_STATUSES.ACTIVE
        : LISTING_STATUSES.PAUSED;
    const hasBlockingBooking = allBookingRequests.some(
      (request) =>
        String(request.listingId) === normalizedId &&
        bookingStatusBlocksListing(request.status)
    );

    if (
      nextStatus === LISTING_STATUSES.ACTIVE &&
      !getHostPayoutStatus(currentUser).isReady
    ) {
      const message =
        "Set up payouts before activating this listing. It will stay saved as a draft until payouts are ready.";
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    if (nextStatus === LISTING_STATUSES.ACTIVE && hasBlockingBooking) {
      const message =
        "This listing has an approved or active rental and must stay hidden until that rental is completed or cancelled.";
      setListingsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const updatedListing = {
      ...targetListing,
      status: nextStatus,
      availabilityStatus:
        nextStatus === LISTING_STATUSES.ACTIVE
          ? getAvailableListingAvailabilityStatus(targetListing)
          : AVAILABILITY_STATUSES.UNAVAILABLE,
      postBookingActionRequired: false,
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

    if (!isBackendId(normalizedId)) {
      storetDataService.saveUserListings(
        previousHostListings.map((listing) =>
          String(listing.id) === normalizedId ? updatedListing : listing
        )
      );
      return { ok: true, listing: updatedListing };
    }

    setListingsError("");

    const response = await listingService.updateListing(normalizedId, {
      status: nextStatus,
      availabilityStatus: updatedListing.availabilityStatus,
      postBookingActionRequired: false,
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

  async function resolveCompletedListingAvailability(listingId, nextStatus) {
    const normalizedId = String(listingId);
    const normalizedStatus =
      nextStatus === LISTING_STATUSES.PAUSED
        ? LISTING_STATUSES.PAUSED
        : LISTING_STATUSES.ACTIVE;
    const targetListing = allUserListings.find(
      (listing) => String(listing.id) === normalizedId
    );

    if (!targetListing) {
      return {
        ok: false,
        error: "We could not find that listing.",
      };
    }

    const hasBlockingBooking = allBookingRequests.some(
      (request) =>
        String(request.listingId) === normalizedId &&
        bookingStatusBlocksListing(request.status)
    );

    if (hasBlockingBooking) {
      return {
        ok: false,
        error:
          "This listing still has an approved or active rental. Finish that rental before choosing its next availability.",
      };
    }

    if (
      normalizedStatus === LISTING_STATUSES.ACTIVE &&
      !getHostPayoutStatus(currentUser).isReady
    ) {
      return {
        ok: false,
        error: "Set up payouts before returning this listing to Explore.",
      };
    }

    const updatedListing = {
      ...targetListing,
      status: normalizedStatus,
      availabilityStatus:
        normalizedStatus === LISTING_STATUSES.ACTIVE
          ? getAvailableListingAvailabilityStatus(targetListing)
          : AVAILABILITY_STATUSES.UNAVAILABLE,
      postBookingActionRequired: false,
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

      return normalizedStatus === LISTING_STATUSES.ACTIVE
        ? mergeListingsById([updatedListing], withoutListing)
        : withoutListing;
    });

    if (!isBackendId(normalizedId)) {
      storetDataService.saveUserListings(
        previousHostListings.map((listing) =>
          String(listing.id) === normalizedId ? updatedListing : listing
        )
      );

      return { ok: true, listing: updatedListing };
    }

    setListingsError("");

    const response = await listingService.updateListing(normalizedId, {
      status: normalizedStatus,
      availabilityStatus: updatedListing.availabilityStatus,
      postBookingActionRequired: false,
    });

    if (response.error) {
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      const message = getErrorMessage(
        response.error,
        "We could not update this listing's availability yet."
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

    setBookingRequests((currentRequests) =>
      ensureArray(currentRequests).filter(
        (request) => String(request.listingId) !== normalizedId
      )
    );

    setPaymentRecords((currentPaymentRecords) =>
      ensureArray(currentPaymentRecords).filter(
        (payment) => String(payment.listingId) !== normalizedId
      )
    );

    setHostMessages((currentMessages) =>
      ensureArray(currentMessages).filter(
        (message) => String(message.listingId) !== normalizedId
      )
    );

    if (!isBackendId(normalizedId)) {
      storetDataService.saveUserListings(
        previousHostListings.filter((listing) => String(listing.id) !== normalizedId)
      );
      storetDataService.saveSavedListingIds(
        previousSavedIds.filter((id) => String(id) !== normalizedId)
      );
      storetDataService.saveBookingRequests(
        allBookingRequests.filter((request) => String(request.listingId) !== normalizedId)
      );
      storetDataService.savePaymentRecords(
        allPaymentRecords.filter((payment) => String(payment.listingId) !== normalizedId)
      );
      storetDataService.saveHostMessages(
        allHostMessages.filter((message) => String(message.listingId) !== normalizedId)
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

  function syncListingCollectionsAfterBookingChange(
    listingId,
    nextRequests,
    options = {}
  ) {
    const normalizedListingId = String(listingId);

    setUserListings((currentListings) =>
      ensureArray(currentListings).map((listing) =>
        String(listing.id) === normalizedListingId
          ? syncListingWithBookingState(listing, nextRequests, options)
          : listing
      )
    );

    setListings((currentListings) =>
      ensureArray(currentListings).map((listing) =>
        String(listing.id) === normalizedListingId
          ? syncListingWithBookingState(listing, nextRequests, options)
          : listing
      )
    );
  }

  async function submitBookingRequest(listing, requestData = {}) {
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
    const previousHostListings = allUserListings;
    const previousActiveListings = activeBackendListings;

    const optimisticRequests = mergeRecordsById([request], allBookingRequests);

    if (bookingStatusBlocksListing(request.status)) {
      syncListingCollectionsAfterBookingChange(
        request.listingId,
        optimisticRequests
      );
    }

    if (!currentUser?.isAuthenticated || !isBackendId(request.listingId)) {
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

    setActivityError("");

    const response = await bookingService.createBookingRequest(request);

    if (response.error) {
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      const message = getErrorMessage(
        response.error,
        "We could not submit that booking request yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedRequest = response.data || request;

    setBookingRequests((currentRequests) =>
      mergeRecordsById([savedRequest], currentRequests)
    );

    refreshCurrentUserHostAnalyticsData();

    return {
      ok: true,
      request: savedRequest,
    };
  }

  async function updateBookingRequestStatusById(requestId, status) {
    const targetRequest = allBookingRequests.find(
      (request) => String(request.id) === String(requestId)
    );

    if (!targetRequest) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    const previousRequests = allBookingRequests;
    const previousHostListings = allUserListings;
    const previousActiveListings = activeBackendListings;
    const updatedRequest = updateBookingRequestStatus(targetRequest, status);
    const nextRequests = replaceRecordById(previousRequests, requestId, updatedRequest);

    setBookingRequests((currentRequests) =>
      replaceRecordById(currentRequests, requestId, updatedRequest)
    );
    syncListingCollectionsAfterBookingChange(targetRequest.listingId, nextRequests);

    if (!isBackendId(requestId)) {
      storetDataService.saveBookingRequests(nextRequests);
      storetDataService.saveUserListings(
        previousHostListings.map((listing) =>
          String(listing.id) === String(targetRequest.listingId)
            ? syncListingWithBookingState(listing, nextRequests)
            : listing
        )
      );
      return { ok: true, request: updatedRequest };
    }

    setActivityError("");

    const response = await bookingService.updateBookingRequest(requestId, updatedRequest);

    if (response.error) {
      setBookingRequests(previousRequests);
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      const message = getErrorMessage(
        response.error,
        "We could not update that booking request yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedRequest = response.data || updatedRequest;
    setBookingRequests((currentRequests) =>
      replaceRecordById(currentRequests, requestId, savedRequest)
    );

    refreshCurrentUserHostAnalyticsData();

    return { ok: true, request: savedRequest };
  }

  async function updateBookingLifecycleById(requestId, status) {
    const targetRequest = allBookingRequests.find(
      (request) => String(request.id) === String(requestId)
    );

    if (!targetRequest) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    const previousRequests = allBookingRequests;
    const previousHostListings = allUserListings;
    const previousActiveListings = activeBackendListings;
    const updatedRequest = updateBookingLifecycle(targetRequest, status);
    const nextRequests = replaceRecordById(previousRequests, requestId, updatedRequest);
    const bookingSyncOptions = {
      markPostBookingActionRequired: status === BOOKING_STATUSES.COMPLETED,
    };

    setBookingRequests((currentRequests) =>
      replaceRecordById(currentRequests, requestId, updatedRequest)
    );
    syncListingCollectionsAfterBookingChange(
      targetRequest.listingId,
      nextRequests,
      bookingSyncOptions
    );

    if (!isBackendId(requestId)) {
      storetDataService.saveBookingRequests(nextRequests);
      storetDataService.saveUserListings(
        previousHostListings.map((listing) =>
          String(listing.id) === String(targetRequest.listingId)
            ? syncListingWithBookingState(
                listing,
                nextRequests,
                bookingSyncOptions
              )
            : listing
        )
      );
      return { ok: true, request: updatedRequest };
    }

    setActivityError("");

    const response = await bookingService.updateBookingRequest(requestId, updatedRequest);

    if (response.error) {
      setBookingRequests(previousRequests);
      setUserListings(previousHostListings);
      setListings(previousActiveListings);
      const message = getErrorMessage(
        response.error,
        "We could not update that booking yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedRequest = response.data || updatedRequest;
    setBookingRequests((currentRequests) =>
      replaceRecordById(currentRequests, requestId, savedRequest)
    );

    refreshCurrentUserHostAnalyticsData();

    return { ok: true, request: savedRequest };
  }

  async function submitHostMessage(listing, messageData = {}) {
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

    if (!currentUser?.isAuthenticated || !isBackendId(hostMessage.listingId)) {
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

    setActivityError("");

    const response = await messageService.createHostMessage(hostMessage);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not send that host message yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedMessage = response.data || hostMessage;

    setHostMessages((currentMessages) =>
      mergeRecordsById([savedMessage], currentMessages)
    );

    refreshCurrentUserHostAnalyticsData();

    return {
      ok: true,
      message: savedMessage,
    };
  }

  async function updateHostMessageStatusById(messageId, status) {
    const targetMessage = allHostMessages.find(
      (message) => String(message.id) === String(messageId)
    );

    if (!targetMessage) {
      return {
        ok: false,
        error: "We could not find that message.",
      };
    }

    const previousMessages = allHostMessages;
    const updatedMessage = updateHostMessageStatus(targetMessage, status);

    setHostMessages((currentMessages) =>
      replaceRecordById(currentMessages, messageId, updatedMessage)
    );

    if (!isBackendId(messageId)) {
      storetDataService.saveHostMessages(
        replaceRecordById(previousMessages, messageId, updatedMessage)
      );
      return { ok: true, message: updatedMessage };
    }

    setActivityError("");

    const response = await messageService.updateHostMessage(messageId, updatedMessage);

    if (response.error) {
      setHostMessages(previousMessages);
      const message = getErrorMessage(
        response.error,
        "We could not update that host message yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedMessage = response.data || updatedMessage;
    setHostMessages((currentMessages) =>
      replaceRecordById(currentMessages, messageId, savedMessage)
    );

    refreshCurrentUserHostAnalyticsData();

    return { ok: true, message: savedMessage };
  }


  async function loadListingReviews(listingId) {
    const normalizedListingId = String(listingId || "");

    if (!normalizedListingId) {
      return {
        ok: false,
        error: "We could not find that listing before loading reviews.",
      };
    }

    setReviewsAreLoading(true);
    setReviewsError("");

    const response = await reviewService.getListingReviews(normalizedListingId);

    setReviewsAreLoading(false);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not load reviews for this listing yet."
      );
      setReviewsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const reviews = normalizeReviewList(response.data || []);

    setReviewsByListingId((currentReviewsByListingId) => ({
      ...currentReviewsByListingId,
      [normalizedListingId]: reviews,
    }));

    return {
      ok: true,
      reviews,
    };
  }

  async function submitReview(listing, bookingRequest, reviewData = {}) {
    if (!listing || !bookingRequest) {
      return {
        ok: false,
        error: "A completed booking is required before leaving a review.",
      };
    }

    if (!currentUser?.isAuthenticated || !isBackendId(listing.id)) {
      return {
        ok: false,
        error: "Please sign in and use a backend-backed listing before leaving a review.",
      };
    }

    const review = createReviewRecord({
      listing,
      bookingRequest,
      currentUser,
      reviewData,
    });

    setReviewsError("");

    const response = await reviewService.createReview(review);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not save that review yet."
      );
      setReviewsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedReview = response.data || review;
    const normalizedListingId = String(savedReview.listingId || listing.id);

    setReviewsByListingId((currentReviewsByListingId) => {
      const currentListingReviews = normalizeReviewList(
        currentReviewsByListingId[normalizedListingId] || []
      );

      return {
        ...currentReviewsByListingId,
        [normalizedListingId]: normalizeReviewList([
          savedReview,
          ...currentListingReviews.filter(
            (currentReview) => String(currentReview.id) !== String(savedReview.id)
          ),
        ]),
      };
    });

    await Promise.all([
      refreshActiveListings(),
      refreshCurrentUserListingData(),
      refreshCurrentUserHostAnalyticsData(),
    ]);

    return {
      ok: true,
      review: savedReview,
    };
  }


  async function markNotificationRead(notificationId) {
    const targetNotification = allNotifications.find(
      (notification) => String(notification.id) === String(notificationId)
    );

    if (!targetNotification) {
      return {
        ok: false,
        error: "We could not find that notification.",
      };
    }

    if (targetNotification.isRead) {
      return {
        ok: true,
        notification: targetNotification,
      };
    }

    setNotificationsError("");

    const response = await notificationService.markNotificationRead(notificationId);

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not mark that notification as read yet."
      );
      setNotificationsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const updatedNotification = response.data;

    setNotifications((currentNotifications) =>
      normalizeNotificationList(
        ensureArray(currentNotifications).map((notification) =>
          String(notification.id) === String(notificationId)
            ? updatedNotification
            : notification
        )
      )
    );

    return {
      ok: true,
      notification: updatedNotification,
    };
  }

  async function markAllNotificationsRead() {
    if (unreadNotificationsCount === 0) {
      return {
        ok: true,
      };
    }

    setNotificationsError("");

    const response = await notificationService.markAllNotificationsRead();

    if (response.error) {
      const message = getErrorMessage(
        response.error,
        "We could not mark your notifications as read yet."
      );
      setNotificationsError(message);

      return {
        ok: false,
        error: message,
      };
    }

    await refreshCurrentUserNotificationData();

    return {
      ok: true,
      notifications: response.data || [],
    };
  }

  async function startStripeCheckout(requestId) {
    const request = allBookingRequests.find((item) => String(item.id) === String(requestId));

    if (!request) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    if (!currentUser?.isAuthenticated || !isBackendId(requestId)) {
      return {
        ok: false,
        error: "Stripe checkout is only available for backend-backed bookings.",
      };
    }

    setActivityError("");

    const response = await stripeCheckoutService.createCheckoutSession({
      requestId,
      returnPath: buildCheckoutPath(requestId),
    });

    if (response.error || !response.data?.url) {
      const message = getErrorMessage(
        response.error || response.data?.error,
        "We could not start Stripe Checkout yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    return {
      ok: true,
      url: response.data.url,
      sessionId: response.data.sessionId,
    };
  }

  async function completeCheckout(requestId, paymentData = {}) {
    const request = allBookingRequests.find((item) => String(item.id) === String(requestId));

    if (!request) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    const paymentRecord = createPaymentRecord(request, paymentData);

    if (!currentUser?.isAuthenticated || !isBackendId(requestId)) {
      setPaymentRecords((currentPaymentRecords) => {
        const updatedPaymentRecords = [paymentRecord, ...ensureArray(currentPaymentRecords)];
        storetDataService.savePaymentRecords(updatedPaymentRecords);
        return updatedPaymentRecords;
      });

      setBookingRequests((currentRequests) => {
        const updatedRequests = ensureArray(currentRequests).map((currentRequest) => {
          if (String(currentRequest.id) !== String(requestId)) {
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

    setActivityError("");

    const paymentResponse = await paymentService.createMockPaymentRecord(paymentRecord);

    if (paymentResponse.error) {
      const message = getErrorMessage(
        paymentResponse.error,
        "We could not record that checkout payment yet."
      );
      setActivityError(message);

      return {
        ok: false,
        error: message,
      };
    }

    const savedPaymentRecord = {
      ...paymentRecord,
      ...(paymentResponse.data || {}),
      listingTitle: paymentRecord.listingTitle,
      hostName: paymentRecord.hostName,
      renterName: paymentRecord.renterName,
      renterEmail: paymentRecord.renterEmail,
      hostEmail: paymentRecord.hostEmail,
      cardholderName: paymentRecord.cardholderName,
      billingZip: paymentRecord.billingZip,
    };

    const confirmedRequest = {
      ...updateBookingLifecycle(request, BOOKING_STATUSES.CONFIRMED),
      paymentRecordId: savedPaymentRecord.id,
      confirmedAt: savedPaymentRecord.paidAt,
      updatedAt: savedPaymentRecord.paidAt,
    };

    const bookingResponse = await bookingService.updateBookingRequest(requestId, confirmedRequest);

    if (bookingResponse.error) {
      const message = getErrorMessage(
        bookingResponse.error,
        "We recorded the payment, but could not confirm the booking yet."
      );
      setActivityError(message);

      setPaymentRecords((currentPaymentRecords) =>
        mergeRecordsById([savedPaymentRecord], currentPaymentRecords)
      );

      return {
        ok: false,
        error: message,
        paymentRecord: savedPaymentRecord,
      };
    }

    const savedRequest = {
      ...(bookingResponse.data || confirmedRequest),
      paymentRecordId: savedPaymentRecord.id,
    };

    setPaymentRecords((currentPaymentRecords) =>
      mergeRecordsById([savedPaymentRecord], currentPaymentRecords)
    );

    setBookingRequests((currentRequests) =>
      replaceRecordById(currentRequests, requestId, savedRequest)
    );

    return {
      ok: true,
      paymentRecord: savedPaymentRecord,
      request: savedRequest,
    };
  }

  const value = {
    currentUser,
    activeMode: currentActiveMode,
    userCapabilityModes,
    canUseHostMode,
    canUseRenterMode,
    hasHostedListings,
    hostPayoutStatus,
    hostPayoutsReady,
    hostDashboardIsAvailable,
    isHostMode,
    isRenterMode,
    listings: allListings,
    activeListings: activeBackendListings,
    userListings: allUserListings,
    savedListingIds,
    bookingRequests: allBookingRequests,
    paymentRecords: allPaymentRecords,
    hostMessages: allHostMessages,
    reviewsByListingId,
    reviewsAreLoading,
    reviewsError,
    notifications: allNotifications,
    unreadNotificationsCount,
    notificationsAreLoading,
    notificationsError,
    hostAnalytics,
    hostAnalyticsAreLoading,
    hostAnalyticsError,
    hostBookingRequests,
    hostDashboardMessages,
    authIsLoading,
    authError,
    listingsAreLoading,
    listingsError,
    activityIsLoading,
    activityError,
    actions: {
      login,
      logout,
      switchActiveMode,
      becomeHost,
      becomeRenter,
      addListing,
      attachListingImages,
      toggleSave,
      toggleListingStatus,
      resolveCompletedListingAvailability,
      deleteListing,
      submitBookingRequest,
      updateBookingRequestStatus: updateBookingRequestStatusById,
      updateBookingLifecycle: updateBookingLifecycleById,
      submitHostMessage,
      updateHostMessageStatus: updateHostMessageStatusById,
      loadListingReviews,
      submitReview,
      markNotificationRead,
      markAllNotificationsRead,
      refreshCurrentUserNotificationData,
      refreshCurrentUserHostAnalyticsData,
      refreshHostPayoutStatus,
      startPayoutOnboarding,
      startStripeCheckout,
      completeCheckout,
      refreshActiveListings,
      refreshCurrentUserListingData,
      refreshCurrentUserActivityData,
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
