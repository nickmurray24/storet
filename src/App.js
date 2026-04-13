import { useEffect, useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ExplorePage from './pages/ExplorePage';
import CreateListingPage from './pages/CreateListingPage';
import ProfilePage from './pages/ProfilePage';
import ListingDetailsPage from './pages/ListingDetailsPage';
import mockListings from './data/mockListings';
import './App.css';

const STORAGE_KEYS = {
  USER_LISTINGS: 'storet_user_listings',
  SAVED_LISTING_IDS: 'storet_saved_listing_ids',
  CURRENT_USER: 'storet_current_user',
  BOOKING_REQUESTS: 'storet_booking_requests',
  HOST_MESSAGES: 'storet_host_messages',
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

function normalizeListing(listing) {
  return {
    ...listing,
    status: listing.status || 'active',
  };
}

function App() {
  const [userListings, setUserListings] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.USER_LISTINGS, []);
  });

  const [savedListingIds, setSavedListingIds] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readStoredValue(STORAGE_KEYS.SAVED_LISTING_IDS, []);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultCurrentUser;
    }

    return readStoredValue(STORAGE_KEYS.CURRENT_USER, defaultCurrentUser);
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

  const allListings = useMemo(() => {
    return [...userListings.map(normalizeListing), ...mockListings.map(normalizeListing)];
  }, [userListings]);

  const publicListings = useMemo(() => {
    return allListings.filter((listing) => listing.status !== 'paused');
  }, [allListings]);

  const myListings = useMemo(() => {
    return userListings.map(normalizeListing);
  }, [userListings]);

  function handleToggleSave(listingId) {
    setSavedListingIds((prev) =>
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

    const features = formData.features
      .split(',')
      .map((feature) => feature.trim())
      .filter(Boolean);

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

    const normalizedPrice = formData.price.trim().startsWith('$')
      ? `${formData.price.trim()}/mo`
      : `$${formData.price.trim()}/mo`;

    const features = formData.features
      .split(',')
      .map((feature) => feature.trim())
      .filter(Boolean);

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
      status: existingListing.status || 'active',
    };

    setUserListings((prev) =>
      prev.map((listing) => (listing.id === listingId ? updatedListing : listing))
    );

    return updatedListing;
  }

  function handleDeleteListing(listingId) {
    setUserListings((prev) => prev.filter((listing) => listing.id !== listingId));
    setSavedListingIds((prev) => prev.filter((id) => id !== listingId));
    setBookingRequests((prev) => prev.filter((request) => request.listingId !== listingId));
    setHostMessages((prev) => prev.filter((message) => message.listingId !== listingId));
  }

  function handleToggleListingStatus(listingId) {
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
      submittedByAccountEmail: currentUser.email,
    };

    setHostMessages((prev) => [newMessage, ...prev]);
    return newMessage;
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
      JSON.stringify(savedListingIds)
    );
  }, [savedListingIds]);

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

  return (
    <div className="app-shell">
      <Navbar currentUser={currentUser} />

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
              />
            }
          />

          <Route
            path="/create-listing"
            element={
              <CreateListingPage
                listings={myListings}
                currentUser={currentUser}
                onCreateListing={handleCreateListing}
                onUpdateListing={handleUpdateListing}
                onDeleteListing={handleDeleteListing}
                onToggleListingStatus={handleToggleListingStatus}
              />
            }
          />

          <Route
            path="/edit-listing/:id"
            element={
              <CreateListingPage
                listings={myListings}
                currentUser={currentUser}
                onCreateListing={handleCreateListing}
                onUpdateListing={handleUpdateListing}
                onDeleteListing={handleDeleteListing}
                onToggleListingStatus={handleToggleListingStatus}
              />
            }
          />

          <Route
            path="/profile"
            element={
              <ProfilePage
                currentUser={currentUser}
                savedListings={savedListings}
                myListings={myListings}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                bookingRequests={myBookingRequests}
                hostMessages={myHostMessages}
                onDeleteListing={handleDeleteListing}
                onToggleListingStatus={handleToggleListingStatus}
              />
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
        </Routes>
      </main>
    </div>
  );
}

export default App;