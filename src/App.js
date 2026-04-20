import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ExplorePage from './pages/ExplorePage';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';
import ListingDetailsPage from './pages/ListingDetailsPage';
import CheckoutPage from './pages/CheckoutPage';
import NotificationsPage from './pages/NotificationsPage';
import mockListings from './data/mockListings';
import './App.css';

const STORAGE_KEYS = {
  USER_LISTINGS: 'storet_user_listings',
  SAVED_LISTING_IDS: 'storet_saved_listing_ids',
  CURRENT_USER: 'storet_current_user',
  BOOKING_REQUESTS: 'storet_booking_requests',
  HOST_MESSAGES: 'storet_host_messages',
  PAYMENT_RECORDS: 'storet_payment_records',
  REVIEWS: 'storet_reviews',
  NOTIFICATIONS: 'storet_notifications',
};

const defaultCurrentUser = {
  fullName: 'Guest User',
  email: 'guest@example.com',
  role: 'Renter',
  isAuthenticated: false,
};

function readStoredValue(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Failed to read localStorage key: ${key}`, error);
    return fallback;
  }
}

function createRecordId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseCommaSeparatedList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCoordinate(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBlackoutRanges(value) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2})(?:\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2}))?$/
      );

      if (!match) {
        return null;
      }

      const startDate = match[1];
      const endDate = match[2] || match[1];

      return startDate <= endDate
        ? { startDate, endDate }
        : { startDate: endDate, endDate: startDate };
    })
    .filter(Boolean);
}

function normalizeListing(listing) {
  return {
    ...listing,
    status: listing.status || 'active',
    imageUrl: listing.imageUrl || '',
    security: listing.security || '',
    restrictions: Array.isArray(listing.restrictions) ? listing.restrictions : [],
    blackoutRanges: Array.isArray(listing.blackoutRanges)
      ? listing.blackoutRanges
      : [],
    bookingMode: listing.bookingMode || 'request',
    allowWaitlist: Boolean(listing.allowWaitlist),
    createdAt: listing.createdAt || null,
    latitude: parseCoordinate(listing.latitude),
    longitude: parseCoordinate(listing.longitude),
  };
}

function rangesOverlap(startA, endA, startB, endB) {
  return !(endA < startB || endB < startA);
}

function isHostRole(role) {
  return role === 'Host' || role === 'Both';
}

function RequireSignedIn({ currentUser, children }) {
  const location = useLocation();

  if (!currentUser.isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          redirectTo: location.pathname,
          message: 'Please log in to access that page.',
        }}
      />
    );
  }

  return children;
}

function RequireHostAccess({ currentUser, children }) {
  const location = useLocation();

  if (!currentUser.isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          redirectTo: location.pathname,
          message: 'Please log in with a Host or Both account to access host tools.',
        }}
      />
    );
  }

  if (!isHostRole(currentUser.role)) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          redirectTo: location.pathname,
          message:
            'Host tools require a Host or Both account. Update your role in Profile.',
        }}
      />
    );
  }

  return children;
}

function App() {
  const [userListings, setUserListings] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.USER_LISTINGS, []);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultCurrentUser;
    }

    return readStoredValue(STORAGE_KEYS.CURRENT_USER, defaultCurrentUser);
  });

  const [savedListingIdsStore, setSavedListingIdsStore] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    return readStoredValue(STORAGE_KEYS.SAVED_LISTING_IDS, {});
  });

  const [bookingRequests, setBookingRequests] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.BOOKING_REQUESTS, []);
  });

  const [hostMessages, setHostMessages] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.HOST_MESSAGES, []);
  });

  const [paymentRecords, setPaymentRecords] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.PAYMENT_RECORDS, []);
  });

  const [reviews, setReviews] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.REVIEWS, []);
  });

  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.NOTIFICATIONS, []);
  });

  useEffect(() => {
    if (Array.isArray(savedListingIdsStore) && currentUser.isAuthenticated) {
      setSavedListingIdsStore({
        [currentUser.email]: savedListingIdsStore,
      });
    }
  }, [savedListingIdsStore, currentUser]);

  const reviewSummaryByListing = useMemo(() => {
    const summaryMap = {};

    reviews.forEach((review) => {
      if (!summaryMap[review.listingId]) {
        summaryMap[review.listingId] = {
          total: 0,
          count: 0,
        };
      }

      summaryMap[review.listingId].total += Number(review.rating);
      summaryMap[review.listingId].count += 1;
    });

    Object.keys(summaryMap).forEach((listingId) => {
      const item = summaryMap[listingId];
      item.averageRating = item.count > 0 ? item.total / item.count : 0;
    });

    return summaryMap;
  }, [reviews]);

  const allListings = useMemo(() => {
    const baseListings = [
      ...userListings.map(normalizeListing),
      ...mockListings.map(normalizeListing),
    ];

    return baseListings.map((listing) => {
      const reviewSummary = reviewSummaryByListing[listing.id];

      return {
        ...listing,
        averageRating: reviewSummary?.averageRating || 0,
        reviewCount: reviewSummary?.count || 0,
      };
    });
  }, [userListings, reviewSummaryByListing]);

  const publicListings = useMemo(() => {
    return allListings.filter((listing) => listing.status !== 'paused');
  }, [allListings]);

  const myListings = useMemo(() => {
    if (!currentUser.isAuthenticated) {
      return [];
    }

    return allListings.filter(
      (listing) => listing.createdByAccountEmail === currentUser.email
    );
  }, [allListings, currentUser]);

  const savedListingIds = useMemo(() => {
    if (!currentUser.isAuthenticated) {
      return [];
    }

    if (Array.isArray(savedListingIdsStore)) {
      return savedListingIdsStore;
    }

    return savedListingIdsStore[currentUser.email] || [];
  }, [savedListingIdsStore, currentUser]);

  const myNotifications = useMemo(() => {
    if (!currentUser.isAuthenticated) {
      return [];
    }

    return notifications
      .filter((notification) => notification.recipientEmail === currentUser.email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, currentUser]);

  const unreadNotificationsCount = myNotifications.filter(
    (notification) => !notification.isRead
  ).length;

  function updateSavedIdsForCurrentUser(updater) {
    if (!currentUser.isAuthenticated) {
      return;
    }

    setSavedListingIdsStore((prev) => {
      const normalizedStore = Array.isArray(prev)
        ? { [currentUser.email]: prev }
        : prev;

      const currentIds = normalizedStore[currentUser.email] || [];

      return {
        ...normalizedStore,
        [currentUser.email]: updater(currentIds),
      };
    });
  }

  function createNotification(
    recipientEmail,
    title,
    body,
    actionPath = '/profile',
    category = 'general'
  ) {
    if (!recipientEmail) {
      return;
    }

    setNotifications((prev) => [
      {
        id: createRecordId('notification'),
        recipientEmail,
        title,
        body,
        actionPath,
        category,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function handleMarkNotificationRead(notificationId) {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }

  function handleMarkAllNotificationsRead() {
    if (!currentUser.isAuthenticated) {
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.recipientEmail === currentUser.email
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }

  function handleToggleSave(listingId) {
    if (!currentUser.isAuthenticated) {
      return;
    }

    updateSavedIdsForCurrentUser((prev) =>
      prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId]
    );
  }

  function handleCreateListing(formData) {
    const nextId =
      allListings.length > 0
        ? Math.max(...allListings.map((listing) => listing.id)) + 1
        : 1;

    const normalizedPrice = formData.price.trim().startsWith('$')
      ? `${formData.price.trim()}/mo`
      : `$${formData.price.trim()}/mo`;

    const features = parseCommaSeparatedList(formData.features);
    const restrictions = parseCommaSeparatedList(formData.restrictions);
    const blackoutRanges = parseBlackoutRanges(formData.blackoutRanges);

    const newListing = {
      id: nextId,
      title: formData.title.trim(),
      type: formData.type,
      price: normalizedPrice,
      size: formData.size.trim(),
      duration: formData.duration,
      location: formData.location.trim(),
      description: formData.description.trim(),
      hostName: formData.hostName.trim() || currentUser.fullName || 'You',
      availability: formData.availability,
      access: formData.access.trim(),
      features: features.length > 0 ? features : ['Flexible terms'],
      restrictions,
      blackoutRanges,
      bookingMode: formData.bookingMode,
      allowWaitlist: formData.allowWaitlist,
      security: formData.security.trim(),
      imageUrl: formData.imageUrl.trim(),
      latitude: parseCoordinate(formData.latitude),
      longitude: parseCoordinate(formData.longitude),
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      createdByAccountEmail: currentUser.email,
      status: 'active',
    };

    setUserListings((prev) => [newListing, ...prev]);
    return newListing;
  }

  function handleUpdateListing(listingId, formData) {
    const existingListing = userListings.find((listing) => listing.id === listingId);

    if (!existingListing) {
      return null;
    }

    if (existingListing.createdByAccountEmail !== currentUser.email) {
      return null;
    }

    const normalizedPrice = formData.price.trim().startsWith('$')
      ? `${formData.price.trim()}/mo`
      : `$${formData.price.trim()}/mo`;

    const features = parseCommaSeparatedList(formData.features);
    const restrictions = parseCommaSeparatedList(formData.restrictions);
    const blackoutRanges = parseBlackoutRanges(formData.blackoutRanges);

    const updatedListing = {
      ...existingListing,
      title: formData.title.trim(),
      type: formData.type,
      price: normalizedPrice,
      size: formData.size.trim(),
      duration: formData.duration,
      location: formData.location.trim(),
      description: formData.description.trim(),
      hostName: formData.hostName.trim() || currentUser.fullName || 'You',
      availability: formData.availability,
      access: formData.access.trim(),
      features: features.length > 0 ? features : ['Flexible terms'],
      restrictions,
      blackoutRanges,
      bookingMode: formData.bookingMode,
      allowWaitlist: formData.allowWaitlist,
      security: formData.security.trim(),
      imageUrl: formData.imageUrl.trim(),
      latitude: parseCoordinate(formData.latitude),
      longitude: parseCoordinate(formData.longitude),
      status: existingListing.status || 'active',
    };

    setUserListings((prev) =>
      prev.map((listing) => (listing.id === listingId ? updatedListing : listing))
    );

    return updatedListing;
  }

  function handleDeleteListing(listingId) {
    const targetListing = userListings.find((listing) => listing.id === listingId);

    if (!targetListing) {
      return;
    }

    if (targetListing.createdByAccountEmail !== currentUser.email) {
      return;
    }

    setUserListings((prev) => prev.filter((listing) => listing.id !== listingId));

    setSavedListingIdsStore((prev) => {
      if (Array.isArray(prev)) {
        return prev.filter((id) => id !== listingId);
      }

      const nextStore = {};

      Object.entries(prev).forEach(([email, ids]) => {
        nextStore[email] = ids.filter((id) => id !== listingId);
      });

      return nextStore;
    });

    setBookingRequests((prev) => prev.filter((request) => request.listingId !== listingId));
    setHostMessages((prev) => prev.filter((message) => message.listingId !== listingId));
    setPaymentRecords((prev) => prev.filter((payment) => payment.listingId !== listingId));
    setReviews((prev) => prev.filter((review) => review.listingId !== listingId));
  }

  function handleToggleListingStatus(listingId) {
    const targetListing = userListings.find((listing) => listing.id === listingId);

    if (!targetListing) {
      return;
    }

    if (targetListing.createdByAccountEmail !== currentUser.email) {
      return;
    }

    setUserListings((prev) =>
      prev.map((listing) => {
        if (listing.id !== listingId) {
          return listing;
        }

        return {
          ...listing,
          status: listing.status === 'paused' ? 'active' : 'paused',
        };
      })
    );
  }

  function handleAuthSubmit(userData) {
    setCurrentUser({
      fullName: userData.fullName.trim() || 'Guest User',
      email: userData.email.trim(),
      role: userData.role,
      isAuthenticated: true,
    });
  }

  function handleLogout() {
    setCurrentUser(defaultCurrentUser);
  }

  function handleUpdateRole(nextRole) {
    setCurrentUser((prev) => ({
      ...prev,
      role: nextRole,
    }));
  }

  function handleSubmitBookingRequest(listing, formData) {
    if (!formData.moveOutDate) {
      return {
        ok: false,
        error: 'Please choose a move-out date.',
      };
    }

    if (formData.moveOutDate < formData.moveInDate) {
      return {
        ok: false,
        error: 'Move-out date must be on or after the move-in date.',
      };
    }

    const blackoutConflict = (listing.blackoutRanges || []).some((range) =>
      rangesOverlap(
        formData.moveInDate,
        formData.moveOutDate,
        range.startDate,
        range.endDate
      )
    );

    const bookingConflict = bookingRequests.some(
      (request) =>
        request.listingId === listing.id &&
        ['Approved', 'Confirmed', 'Active'].includes(request.status) &&
        rangesOverlap(
          formData.moveInDate,
          formData.moveOutDate,
          request.moveInDate,
          request.moveOutDate
        )
    );

    const hasConflict = blackoutConflict || bookingConflict;
    const now = new Date().toISOString();

    if (hasConflict && !listing.allowWaitlist) {
      return {
        ok: false,
        error: blackoutConflict
          ? 'Those dates overlap with a host blackout range.'
          : 'Those dates overlap with an existing booking window.',
      };
    }

    const shouldWaitlist = hasConflict && listing.allowWaitlist;
    const isInstantBook = listing.bookingMode === 'instant' && !shouldWaitlist;

    const newRequest = {
      id: createRecordId('booking'),
      listingId: listing.id,
      listingTitle: listing.title,
      listingLocation: listing.location,
      listingPrice: listing.price,
      listingType: listing.type,
      hostName: listing.hostName,
      requesterName: formData.fullName.trim(),
      requesterEmail: formData.email.trim(),
      moveInDate: formData.moveInDate,
      moveOutDate: formData.moveOutDate,
      duration: formData.duration,
      notes: formData.notes.trim(),
      status: shouldWaitlist
        ? 'Waitlisted'
        : isInstantBook
        ? 'Approved'
        : 'Pending',
      submittedAt: now,
      reviewedAt: isInstantBook ? now : null,
      waitlistedAt: shouldWaitlist ? now : null,
      confirmedAt: null,
      activatedAt: null,
      completedAt: null,
      cancelledAt: null,
      waitlistReason: shouldWaitlist
        ? blackoutConflict
          ? 'Host blackout dates'
          : 'Conflicting booking dates'
        : null,
      paymentId: null,
      submittedByAccountEmail: currentUser.email,
    };

    setBookingRequests((prev) => [newRequest, ...prev]);

    const hostRecipientEmail = listing.createdByAccountEmail || null;

    if (shouldWaitlist) {
      createNotification(
        currentUser.email,
        'Added to waitlist',
        `Your requested dates for ${listing.title} were added to the waitlist.`,
        '/profile',
        'booking'
      );

      createNotification(
        hostRecipientEmail,
        'New waitlisted request',
        `${formData.fullName.trim()} was waitlisted for ${listing.title}.`,
        '/notifications',
        'booking'
      );
    } else if (isInstantBook) {
      createNotification(
        currentUser.email,
        'Instant booking approved',
        `Your request for ${listing.title} was instantly approved. Complete checkout to confirm it.`,
        '/profile',
        'booking'
      );

      createNotification(
        hostRecipientEmail,
        'New instant booking',
        `${formData.fullName.trim()} instantly booked ${listing.title}.`,
        '/notifications',
        'booking'
      );
    } else {
      createNotification(
        currentUser.email,
        'Booking request submitted',
        `Your request for ${listing.title} was sent to the host.`,
        '/profile',
        'booking'
      );

      createNotification(
        hostRecipientEmail,
        'New booking request',
        `${formData.fullName.trim()} requested ${listing.title}.`,
        '/notifications',
        'booking'
      );
    }

    return {
      ok: true,
      request: newRequest,
    };
  }

  function handleSubmitHostMessage(listing, formData) {
    const newMessage = {
      id: createRecordId('message'),
      listingId: listing.id,
      listingTitle: listing.title,
      listingLocation: listing.location,
      hostName: listing.hostName,
      senderName: formData.fullName.trim(),
      senderEmail: formData.email.trim(),
      message: formData.message.trim(),
      status: 'Unread',
      submittedAt: new Date().toISOString(),
      readAt: null,
      submittedByAccountEmail: currentUser.email,
    };

    setHostMessages((prev) => [newMessage, ...prev]);

    createNotification(
      currentUser.email,
      'Message sent',
      `Your message about ${listing.title} was sent to the host.`,
      '/profile',
      'message'
    );

    createNotification(
      listing.createdByAccountEmail || null,
      'New renter message',
      `${formData.fullName.trim()} sent a message about ${listing.title}.`,
      '/notifications',
      'message'
    );

    return newMessage;
  }

  function handleUpdateBookingRequestStatus(requestId, nextStatus) {
    const targetRequest = bookingRequests.find((request) => request.id === requestId);

    if (!targetRequest) {
      return;
    }

    const ownsListing = userListings.some(
      (listing) =>
        listing.id === targetRequest.listingId &&
        listing.createdByAccountEmail === currentUser.email
    );

    if (!ownsListing) {
      return;
    }

    if (!['Pending', 'Approved', 'Declined', 'Waitlisted'].includes(nextStatus)) {
      return;
    }

    if (
      !['Pending', 'Approved', 'Declined', 'Waitlisted'].includes(
        targetRequest.status
      )
    ) {
      return;
    }

    setBookingRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: nextStatus,
              reviewedAt: new Date().toISOString(),
              waitlistedAt:
                nextStatus === 'Waitlisted'
                  ? request.waitlistedAt || new Date().toISOString()
                  : request.waitlistedAt,
            }
          : request
      )
    );

    if (nextStatus === 'Approved') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Booking request approved',
        `Your request for ${targetRequest.listingTitle} was approved. You can now complete checkout.`,
        '/profile',
        'booking'
      );
    }

    if (nextStatus === 'Declined') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Booking request declined',
        `Your request for ${targetRequest.listingTitle} was declined.`,
        '/profile',
        'booking'
      );
    }

    if (nextStatus === 'Waitlisted') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Booking moved to waitlist',
        `Your request for ${targetRequest.listingTitle} is currently waitlisted.`,
        '/profile',
        'booking'
      );
    }
  }

  function handleUpdateBookingLifecycle(requestId, nextStatus) {
    const targetRequest = bookingRequests.find((request) => request.id === requestId);

    if (!targetRequest) {
      return;
    }

    const ownsListing = userListings.some(
      (listing) =>
        listing.id === targetRequest.listingId &&
        listing.createdByAccountEmail === currentUser.email
    );

    const isRequester =
      targetRequest.submittedByAccountEmail === currentUser.email;

    const now = new Date().toISOString();

    const canCancel =
      nextStatus === 'Cancelled' &&
      (ownsListing || isRequester) &&
      ['Approved', 'Confirmed', 'Active', 'Waitlisted'].includes(targetRequest.status);

    const canActivate =
      nextStatus === 'Active' &&
      ownsListing &&
      targetRequest.status === 'Confirmed';

    const canComplete =
      nextStatus === 'Completed' &&
      ownsListing &&
      targetRequest.status === 'Active';

    if (!canCancel && !canActivate && !canComplete) {
      return;
    }

    setBookingRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        if (nextStatus === 'Cancelled') {
          return {
            ...request,
            status: 'Cancelled',
            cancelledAt: now,
          };
        }

        if (nextStatus === 'Active') {
          return {
            ...request,
            status: 'Active',
            activatedAt: now,
          };
        }

        if (nextStatus === 'Completed') {
          return {
            ...request,
            status: 'Completed',
            completedAt: now,
          };
        }

        return request;
      })
    );

    if (nextStatus === 'Cancelled') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Booking cancelled',
        `Your booking for ${targetRequest.listingTitle} was cancelled.`,
        '/profile',
        'booking'
      );
    }

    if (nextStatus === 'Active') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Rental is now active',
        `Your rental for ${targetRequest.listingTitle} is now active.`,
        '/profile',
        'booking'
      );
    }

    if (nextStatus === 'Completed') {
      createNotification(
        targetRequest.submittedByAccountEmail,
        'Rental completed',
        `Your rental for ${targetRequest.listingTitle} was marked completed. You can now leave a review.`,
        `/listing/${targetRequest.listingId}`,
        'booking'
      );
    }
  }

  function handleUpdateHostMessageStatus(messageId, nextStatus) {
    const targetMessage = hostMessages.find((message) => message.id === messageId);

    if (!targetMessage) {
      return;
    }

    const ownsListing = userListings.some(
      (listing) =>
        listing.id === targetMessage.listingId &&
        listing.createdByAccountEmail === currentUser.email
    );

    if (!ownsListing) {
      return;
    }

    setHostMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              status: nextStatus,
              readAt:
                nextStatus === 'Read'
                  ? message.readAt || new Date().toISOString()
                  : null,
            }
          : message
      )
    );

    if (nextStatus === 'Read') {
      createNotification(
        targetMessage.submittedByAccountEmail,
        'Host read your message',
        `${targetMessage.hostName} marked your message about ${targetMessage.listingTitle} as read.`,
        `/listing/${targetMessage.listingId}`,
        'message'
      );
    }
  }

  function handleCompleteCheckout(requestId, paymentData) {
    const targetRequest = bookingRequests.find((request) => request.id === requestId);

    if (!targetRequest) {
      return null;
    }

    if (targetRequest.submittedByAccountEmail !== currentUser.email) {
      return null;
    }

    if (targetRequest.status !== 'Approved') {
      return null;
    }

    const newPayment = {
      id: createRecordId('payment'),
      requestId: targetRequest.id,
      listingId: targetRequest.listingId,
      listingTitle: targetRequest.listingTitle,
      hostName: targetRequest.hostName,
      amount: paymentData.totalAmount,
      storageCharge: paymentData.storageCharge,
      serviceFee: paymentData.serviceFee,
      cardBrand: paymentData.cardBrand,
      last4: paymentData.last4,
      cardholderName: paymentData.cardholderName.trim(),
      billingZip: paymentData.billingZip.trim(),
      paidAt: new Date().toISOString(),
      paidByAccountEmail: currentUser.email,
      receiptNumber: `STR-${Date.now()}`,
    };

    setPaymentRecords((prev) => [newPayment, ...prev]);

    setBookingRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: 'Confirmed',
              reviewedAt: new Date().toISOString(),
              confirmedAt: new Date().toISOString(),
              paymentId: newPayment.id,
            }
          : request
      )
    );

    const hostRecipientEmail =
      userListings.find((listing) => listing.id === targetRequest.listingId)
        ?.createdByAccountEmail || null;

    createNotification(
      currentUser.email,
      'Payment received',
      `Your booking for ${targetRequest.listingTitle} is now confirmed.`,
      `/checkout/${targetRequest.id}`,
      'payment'
    );

    createNotification(
      hostRecipientEmail,
      'Booking paid',
      `${targetRequest.requesterName} completed checkout for ${targetRequest.listingTitle}.`,
      '/notifications',
      'payment'
    );

    return newPayment;
  }

  function handleSubmitReview(requestId, reviewData) {
    const targetRequest = bookingRequests.find((request) => request.id === requestId);

    if (!targetRequest) {
      return {
        ok: false,
        error: 'We could not find that completed booking.',
      };
    }

    if (targetRequest.submittedByAccountEmail !== currentUser.email) {
      return {
        ok: false,
        error: 'You can only review your own completed booking.',
      };
    }

    if (targetRequest.status !== 'Completed') {
      return {
        ok: false,
        error: 'Reviews can only be submitted after a booking is completed.',
      };
    }

    const alreadyReviewed = reviews.some((review) => review.requestId === requestId);

    if (alreadyReviewed) {
      return {
        ok: false,
        error: 'You already submitted a review for this booking.',
      };
    }

    const newReview = {
      id: createRecordId('review'),
      requestId: targetRequest.id,
      listingId: targetRequest.listingId,
      listingTitle: targetRequest.listingTitle,
      hostName: targetRequest.hostName,
      rating: Number(reviewData.rating),
      reviewText: reviewData.reviewText.trim(),
      reviewerName: currentUser.fullName,
      reviewerEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      submittedByAccountEmail: currentUser.email,
    };

    setReviews((prev) => [newReview, ...prev]);

    const hostRecipientEmail =
      userListings.find((listing) => listing.id === targetRequest.listingId)
        ?.createdByAccountEmail || null;

    createNotification(
      hostRecipientEmail,
      'New review received',
      `${currentUser.fullName} left a ${reviewData.rating}-star review for ${targetRequest.listingTitle}.`,
      `/listing/${targetRequest.listingId}`,
      'review'
    );

    return {
      ok: true,
      review: newReview,
    };
  }

  const savedListings = allListings.filter((listing) =>
    savedListingIds.includes(listing.id)
  );

  const myBookingRequests = bookingRequests.filter(
    (request) => request.submittedByAccountEmail === currentUser.email
  );

  const myHostMessages = hostMessages.filter(
    (message) => message.submittedByAccountEmail === currentUser.email
  );

  const myPaymentRecords = paymentRecords.filter(
    (payment) => payment.paidByAccountEmail === currentUser.email
  );

  const myReviews = reviews.filter(
    (review) => review.submittedByAccountEmail === currentUser.email
  );

  const myListingIds = new Set(myListings.map((listing) => listing.id));

  const incomingBookingRequests = bookingRequests.filter((request) =>
    myListingIds.has(request.listingId)
  );

  const incomingHostMessages = hostMessages.filter((message) =>
    myListingIds.has(message.listingId)
  );

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.USER_LISTINGS,
      JSON.stringify(userListings)
    );
  }, [userListings]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.SAVED_LISTING_IDS,
      JSON.stringify(savedListingIdsStore)
    );
  }, [savedListingIdsStore]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(currentUser)
    );
  }, [currentUser]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.BOOKING_REQUESTS,
      JSON.stringify(bookingRequests)
    );
  }, [bookingRequests]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.HOST_MESSAGES,
      JSON.stringify(hostMessages)
    );
  }, [hostMessages]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.PAYMENT_RECORDS,
      JSON.stringify(paymentRecords)
    );
  }, [paymentRecords]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.REVIEWS,
      JSON.stringify(reviews)
    );
  }, [reviews]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.NOTIFICATIONS,
      JSON.stringify(notifications)
    );
  }, [notifications]);

  return (
    <div className="app-shell">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      <main className="page-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/auth"
            element={
              <AuthPage
                currentUser={currentUser}
                onAuthSubmit={handleAuthSubmit}
              />
            }
          />

          <Route
            path="/explore"
            element={
              <ExplorePage
                listings={publicListings}
                myListings={myListings}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                currentUser={currentUser}
                bookingRequests={incomingBookingRequests}
                hostMessages={incomingHostMessages}
                onDeleteListing={handleDeleteListing}
                onToggleListingStatus={handleToggleListingStatus}
                onUpdateBookingRequestStatus={handleUpdateBookingRequestStatus}
                onUpdateBookingLifecycle={handleUpdateBookingLifecycle}
                onUpdateHostMessageStatus={handleUpdateHostMessageStatus}
              />
            }
          />

          <Route
            path="/create-listing"
            element={
              <RequireHostAccess currentUser={currentUser}>
                <CreateListingPage
                  listings={myListings}
                  currentUser={currentUser}
                  onCreateListing={handleCreateListing}
                  onUpdateListing={handleUpdateListing}
                  onDeleteListing={handleDeleteListing}
                  onToggleListingStatus={handleToggleListingStatus}
                />
              </RequireHostAccess>
            }
          />

          <Route
            path="/edit-listing/:id"
            element={
              <RequireHostAccess currentUser={currentUser}>
                <CreateListingPage
                  listings={myListings}
                  currentUser={currentUser}
                  onCreateListing={handleCreateListing}
                  onUpdateListing={handleUpdateListing}
                  onDeleteListing={handleDeleteListing}
                  onToggleListingStatus={handleToggleListingStatus}
                />
              </RequireHostAccess>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireSignedIn currentUser={currentUser}>
                <ProfilePage
                  currentUser={currentUser}
                  savedListings={savedListings}
                  myListings={myListings}
                  savedListingIds={savedListingIds}
                  onToggleSave={handleToggleSave}
                  bookingRequests={myBookingRequests}
                  hostMessages={myHostMessages}
                  paymentRecords={myPaymentRecords}
                  reviews={myReviews}
                  onDeleteListing={handleDeleteListing}
                  onToggleListingStatus={handleToggleListingStatus}
                  onUpdateBookingLifecycle={handleUpdateBookingLifecycle}
                  onUpdateRole={handleUpdateRole}
                  onLogout={handleLogout}
                />
              </RequireSignedIn>
            }
          />

          <Route
            path="/notifications"
            element={
              <RequireSignedIn currentUser={currentUser}>
                <NotificationsPage
                  notifications={myNotifications}
                  unreadCount={unreadNotificationsCount}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                />
              </RequireSignedIn>
            }
          />

          <Route
            path="/checkout/:requestId"
            element={
              <RequireSignedIn currentUser={currentUser}>
                <CheckoutPage
                  currentUser={currentUser}
                  bookingRequests={myBookingRequests}
                  paymentRecords={myPaymentRecords}
                  onCompleteCheckout={handleCompleteCheckout}
                />
              </RequireSignedIn>
            }
          />

          <Route
            path="/listing/:id"
            element={
              <ListingDetailsPage
                listings={allListings}
                bookingRequests={bookingRequests}
                reviews={reviews}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                currentUser={currentUser}
                onSubmitBookingRequest={handleSubmitBookingRequest}
                onSubmitHostMessage={handleSubmitHostMessage}
                onSubmitReview={handleSubmitReview}
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;