import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar";
import HostDashboardPanel from "./components/HostDashboardPanel";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ExplorePage from "./pages/ExplorePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import CheckoutPage from "./pages/CheckoutPage";
import { StoretAppProvider, useStoretApp } from "./context/StoretAppContext";

function ProtectedRoute({ children }) {
  const { currentUser } = useStoretApp();

  if (!currentUser?.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <div className="app">
      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/listing/:id" element={<ListingDetailsPage />} />

        <Route
          path="/create-listing"
          element={
            <ProtectedRoute>
              <CreateListingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/host-dashboard"
          element={
            <ProtectedRoute>
              <HostDashboardPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout/:requestId"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <StoretAppProvider>
      <AppRoutes />
    </StoretAppProvider>
  );
}

export default App;
