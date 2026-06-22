import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

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
import { StoretAppProvider, useStoretApp } from "./context/StoretAppContext";
import { APP_ROUTES } from "./routes/appRoutes";
import { APP_MODES } from "./constants/appEnums";


function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}


function RenterExperienceRoute({ children }) {
  const {
    currentUser,
    authIsLoading,
    activeMode,
    hostDashboardIsAvailable,
  } = useStoretApp();

  if (
    !authIsLoading &&
    currentUser?.isAuthenticated &&
    activeMode === APP_MODES.HOST
  ) {
    return (
      <Navigate
        to={hostDashboardIsAvailable ? APP_ROUTES.hostDashboard : APP_ROUTES.createListing}
        replace
      />
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />

      <Routes>
        <Route path={APP_ROUTES.home} element={<LandingPage />} />
        <Route path={APP_ROUTES.auth} element={<AuthPage />} />
        <Route
          path={APP_ROUTES.explore}
          element={
            <RenterExperienceRoute>
              <ExplorePage />
            </RenterExperienceRoute>
          }
        />
        <Route path={APP_ROUTES.listingDetails} element={<ListingDetailsPage />} />

        <Route
          path={APP_ROUTES.createListing}
          element={
            <ProtectedRoute requiredMode={APP_MODES.HOST} allowHostSetup>
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
            <ProtectedRoute requiredMode={APP_MODES.HOST} requiresHostedListing>
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
