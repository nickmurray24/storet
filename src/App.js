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
import {
  getStoredCurrentUser,
  readSavedListingIds,
  readUserListings,
  safeRemoveItem,
  safeWriteJson,
  writeSavedListingIds,
  writeUserListings,
} from "./utils/storage";
import { CURRENT_USER_KEY } from "./constants/storageKeys";
import { normalizeSavedIds } from "./utils/listingUtils";

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
  const [userListings, setUserListings] = useState(() => readUserListings());
  const [savedListingIds, setSavedListingIds] = useState(() =>
    readSavedListingIds()
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

    safeWriteJson(CURRENT_USER_KEY, loggedInUser);
    setCurrentUser(loggedInUser);
  }

  function handleLogout() {
    safeRemoveItem(CURRENT_USER_KEY);
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

      writeUserListings(updatedListings);

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

      writeSavedListingIds(updatedIds);

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
