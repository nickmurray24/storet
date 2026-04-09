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

  const listings = useMemo(() => {
    return [...userListings, ...mockListings];
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
      listings.length > 0
        ? Math.max(...listings.map((listing) => listing.id)) + 1
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
    };

    setUserListings((prev) => [newListing, ...prev]);
    return newListing;
  }

  function handleAuthSubmit(userData) {
    setCurrentUser({
      fullName: userData.fullName.trim() || 'Guest User',
      email: userData.email.trim(),
      role: userData.role,
      isAuthenticated: true,
    });
  }

  const savedListings = listings.filter((listing) =>
    savedListingIds.includes(listing.id)
  );

  const myListings = userListings;

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
                listings={listings}
                myListings={myListings}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/create-listing"
            element={<CreateListingPage onCreateListing={handleCreateListing} />}
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
              />
            }
          />
          <Route
            path="/listing/:id"
            element={
              <ListingDetailsPage
                listings={listings}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;