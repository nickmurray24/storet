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
import mockListings from './data/mockListings';
import './App.css';

const STORAGE_KEYS = {
  USER_LISTINGS: 'storet_user_listings',
  SAVED_LISTING_IDS: 'storet_saved_listing_ids',
  CURRENT_USER: 'storet_current_user',
  BOOKING_REQUESTS: 'storet_booking_requests',
  HOST_MESSAGES: 'storet_host_messages',
  PAYMENT_RECORDS: 'storet_payment_records',
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

function normalizeListing(listing) {
  return {
    ...listing,
    status: listing.status || 'active',
    imageUrl: listing.imageUrl || '',
    security: listing.security || '',
    restrictions: Array.isArray(listing.restrictions)
      ? listing.restrictions
      : [],
    createdAt: listing.createdAt || null,
    latitude: parseCoordinate(listing.latitude),
    longitude: parseCoordinate(listing.longitude),
  };
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

  useEffect(() => {
    if (Array.isArray(savedListingIdsStore) && currentUser.isAuthenticated) {
      setSavedListingIdsStore({
        [currentUser.email]: savedListingIdsStore,
      });
    }
  }, [savedListingIdsStore, currentUser]);

  const allListings = useMemo(() => {
    return [...userListings.map(normalizeListing), ...mockListings.map(normalizeListing)];
  }, [userListings]);

  const publicListings = useMemo(() => {
    return allListings.filter((listing) => listing.status !== 'paused');
  }, [allListings]);

  const myListings = useMemo(() => {
    if (!currentUser.isAuthenticated) {
      return [];
    }

    return userListings
      .filter((listing) => listing.createdByAccountEmail === currentUser.email)
      .map(normalizeListing);
  }, [userListings, currentUser]);

  const savedListingIds = useMemo(() => {
    if (!currentUser.isAuthenticated) {
      return [];
    }

    if (Array.isArray(savedListingIdsStore)) {
      return savedListingIdsStore;
    }

    return savedListingIdsStore[currentUser.email] || [];
  }, [savedListingIdsStore, currentUser]);

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
      duration: formData.duration,
      notes: formData.notes.trim(),
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      confirmedAt: null,
      paymentId: null,
      submittedByAccountEmail: currentUser.email,
    };

    setBookingRequests((prev) => [newRequest, ...prev]);
    return newRequest;
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

    setBookingRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: nextStatus,
              reviewedAt: new Date().toISOString(),
            }
          : request
      )
    );
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

    return newPayment;
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

  return (
    <div className="app-shell">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

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
                  onDeleteListing={handleDeleteListing}
                  onToggleListingStatus={handleToggleListingStatus}
                  onUpdateRole={handleUpdateRole}
                  onLogout={handleLogout}
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
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                currentUser={currentUser}
                onSubmitBookingRequest={handleSubmitBookingRequest}
                onSubmitHostMessage={handleSubmitHostMessage}
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