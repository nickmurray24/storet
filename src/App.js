import React from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HostDashboardPanel from "./components/HostDashboardPanel";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ExplorePage from "./pages/ExplorePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import CheckoutPage from "./pages/CheckoutPage";
import NotFoundPage from "./pages/NotFoundPage";
import { StoretAppProvider } from "./context/StoretAppContext";
import { APP_ROUTES } from "./routes/appRoutes";

function AppRoutes() {
  return (
    <div className="app">
      <Navbar />

      <Routes>
        <Route path={APP_ROUTES.home} element={<LandingPage />} />
        <Route path={APP_ROUTES.auth} element={<AuthPage />} />
        <Route path={APP_ROUTES.explore} element={<ExplorePage />} />
        <Route path={APP_ROUTES.listingDetails} element={<ListingDetailsPage />} />

        <Route
          path={APP_ROUTES.createListing}
          element={
            <ProtectedRoute>
              <CreateListingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTES.profile}
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTES.hostDashboard}
          element={
            <ProtectedRoute>
              <HostDashboardPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTES.checkout}
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTES.notifications}
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
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
