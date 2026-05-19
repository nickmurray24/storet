import React, { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ExplorePage from "./pages/ExplorePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";

const CURRENT_USER_KEY = "storet_current_user";
const USER_LISTINGS_KEY = "STORET_USER_LISTINGS";
const SAVED_LISTINGS_KEY = "storet_saved_listing_ids";

function safeReadJson(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function getStoredCurrentUser() {
  const storedUser = safeReadJson(CURRENT_USER_KEY, null);

  if (!storedUser) {
    return null;
  }

  return {
    ...storedUser,
    isAuthenticated: Boolean(storedUser.isAuthenticated),
  };
}

function normalizeSavedIds(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value instanceof Set) {
    return Array.from(value).map(String);
  }

  if (value && Array.isArray(value.ids)) {
    return value.ids.map(String);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, isSaved]) => Boolean(isSaved))
      .map(([id]) => String(id));
  }

  return [];
}

function ProtectedRoute({ currentUser, children }) {
  const storedUser = getStoredCurrentUser();
  const activeUser = currentUser || storedUser;

  if (!activeUser?.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredCurrentUser());

  const [userListings, setUserListings] = useState(() => {
    const storedListings = safeReadJson(USER_LISTINGS_KEY, []);
    return Array.isArray(storedListings) ? storedListings : [];
  });

  const [savedListingIds, setSavedListingIds] = useState(() =>
    normalizeSavedIds(safeReadJson(SAVED_LISTINGS_KEY, []))
  );

  const allUserListings = useMemo(() => {
    return Array.isArray(userListings) ? userListings : [];
  }, [userListings]);

  function handleLogin(user) {
    const loggedInUser = {
      ...user,
      isAuthenticated: true,
      fullName: user?.fullName || "Demo User",
      email: user?.email || "",
      role: user?.role || "Renter",
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser));
    setCurrentUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
  }

  function handleAddListing(newListing) {
    if (!newListing) {
      return;
    }

    setUserListings((currentListings) => {
      const safeCurrentListings = Array.isArray(currentListings)
        ? currentListings
        : [];

      const updatedListings = [newListing, ...safeCurrentListings];

      localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(updatedListings));

      return updatedListings;
    });
  }

  function handleToggleSave(listingId) {
    const normalizedId = String(listingId);

    setSavedListingIds((currentIds) => {
      const safeCurrentIds = normalizeSavedIds(currentIds);

      const updatedIds = safeCurrentIds.includes(normalizedId)
        ? safeCurrentIds.filter((id) => id !== normalizedId)
        : [...safeCurrentIds, normalizedId];

      localStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify(updatedIds));

      return updatedIds;
    });
  }

  return (
    <div className="app">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />

        <Route
          path="/explore"
          element={
            <ExplorePage
              listings={allUserListings}
              currentUser={currentUser}
              savedListingIds={savedListingIds}
              onToggleSave={handleToggleSave}
            />
          }
        />

        <Route
          path="/listing/:id"
          element={
            <ListingDetailsPage
              listings={allUserListings}
              currentUser={currentUser}
              savedListingIds={savedListingIds}
              onToggleSave={handleToggleSave}
            />
          }
        />

        <Route
          path="/create-listing"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <CreateListingPage
                currentUser={currentUser}
                onAddListing={handleAddListing}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <ProfilePage
                currentUser={currentUser}
                listings={allUserListings}
                savedListingIds={savedListingIds}
                onToggleSave={handleToggleSave}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <NotificationsPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;