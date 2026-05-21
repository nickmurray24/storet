import React, { useMemo, useState } from "react";
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
import {
  getStoredCurrentUser,
  readBookingRequests,
  readPaymentRecords,
  readSavedListingIds,
  readUserListings,
  safeRemoveItem,
  safeWriteJson,
  writeBookingRequests,
  writePaymentRecords,
  writeSavedListingIds,
  writeUserListings,
} from "./utils/storage";
import { CURRENT_USER_KEY } from "./constants/storageKeys";
import { normalizeSavedIds } from "./utils/listingUtils";
import {
  BOOKING_STATUSES,
  createBookingRequest,
  createPaymentRecord,
  updateBookingLifecycle,
  updateBookingRequestStatus,
} from "./utils/bookingUtils";
import { getHostBookingRequests } from "./utils/bookingSelectors";

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
  const [bookingRequests, setBookingRequests] = useState(() =>
    readBookingRequests()
  );
  const [paymentRecords, setPaymentRecords] = useState(() =>
    readPaymentRecords()
  );

  const allUserListings = useMemo(() => {
    return Array.isArray(userListings) ? userListings : [];
  }, [userListings]);

  const allBookingRequests = useMemo(() => {
    return Array.isArray(bookingRequests) ? bookingRequests : [];
  }, [bookingRequests]);

  const allPaymentRecords = useMemo(() => {
    return Array.isArray(paymentRecords) ? paymentRecords : [];
  }, [paymentRecords]);

  const hostBookingRequests = useMemo(() => {
    return getHostBookingRequests(allBookingRequests, allUserListings);
  }, [allBookingRequests, allUserListings]);

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

  function handleToggleListingStatus(listingId) {
    const normalizedId = String(listingId);

    setUserListings((currentListings) => {
      const safeCurrentListings = Array.isArray(currentListings)
        ? currentListings
        : [];

      const updatedListings = safeCurrentListings.map((listing) => {
        if (String(listing.id) !== normalizedId) {
          return listing;
        }

        const currentStatus = listing.status || "active";

        return {
          ...listing,
          status: currentStatus === "paused" ? "active" : "paused",
          updatedAt: new Date().toISOString(),
        };
      });

      writeUserListings(updatedListings);
      return updatedListings;
    });
  }

  function handleDeleteListing(listingId) {
    const normalizedId = String(listingId);

    setUserListings((currentListings) => {
      const safeCurrentListings = Array.isArray(currentListings)
        ? currentListings
        : [];

      const updatedListings = safeCurrentListings.filter(
        (listing) => String(listing.id) !== normalizedId
      );

      writeUserListings(updatedListings);
      return updatedListings;
    });

    setSavedListingIds((currentIds) => {
      const updatedIds = normalizeSavedIds(currentIds).filter(
        (id) => String(id) !== normalizedId
      );

      writeSavedListingIds(updatedIds);
      return updatedIds;
    });

    setBookingRequests((currentRequests) => {
      const safeCurrentRequests = Array.isArray(currentRequests)
        ? currentRequests
        : [];

      const updatedRequests = safeCurrentRequests.filter(
        (request) => String(request.listingId) !== normalizedId
      );

      writeBookingRequests(updatedRequests);
      return updatedRequests;
    });

    setPaymentRecords((currentPaymentRecords) => {
      const safeCurrentPaymentRecords = Array.isArray(currentPaymentRecords)
        ? currentPaymentRecords
        : [];

      const updatedPaymentRecords = safeCurrentPaymentRecords.filter(
        (payment) => String(payment.listingId) !== normalizedId
      );

      writePaymentRecords(updatedPaymentRecords);
      return updatedPaymentRecords;
    });
  }

  function handleSubmitBookingRequest(listing, requestData = {}) {
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

    setBookingRequests((currentRequests) => {
      const safeCurrentRequests = Array.isArray(currentRequests)
        ? currentRequests
        : [];

      const updatedRequests = [request, ...safeCurrentRequests];
      writeBookingRequests(updatedRequests);

      return updatedRequests;
    });

    return {
      ok: true,
      request,
    };
  }

  function handleUpdateBookingRequestStatus(requestId, status) {
    setBookingRequests((currentRequests) => {
      const safeCurrentRequests = Array.isArray(currentRequests)
        ? currentRequests
        : [];

      const updatedRequests = safeCurrentRequests.map((request) =>
        request.id === requestId
          ? updateBookingRequestStatus(request, status)
          : request
      );

      writeBookingRequests(updatedRequests);
      return updatedRequests;
    });
  }

  function handleUpdateBookingLifecycle(requestId, status) {
    setBookingRequests((currentRequests) => {
      const safeCurrentRequests = Array.isArray(currentRequests)
        ? currentRequests
        : [];

      const updatedRequests = safeCurrentRequests.map((request) =>
        request.id === requestId ? updateBookingLifecycle(request, status) : request
      );

      writeBookingRequests(updatedRequests);
      return updatedRequests;
    });
  }

  function handleCompleteCheckout(requestId, paymentData = {}) {
    const request = allBookingRequests.find((item) => item.id === requestId);

    if (!request) {
      return {
        ok: false,
        error: "We could not find that booking request.",
      };
    }

    const paymentRecord = createPaymentRecord(request, paymentData);

    setPaymentRecords((currentPaymentRecords) => {
      const safeCurrentPaymentRecords = Array.isArray(currentPaymentRecords)
        ? currentPaymentRecords
        : [];

      const updatedPaymentRecords = [paymentRecord, ...safeCurrentPaymentRecords];
      writePaymentRecords(updatedPaymentRecords);

      return updatedPaymentRecords;
    });

    setBookingRequests((currentRequests) => {
      const updatedRequests = currentRequests.map((currentRequest) => {
        if (currentRequest.id !== requestId) {
          return currentRequest;
        }

        return {
          ...updateBookingLifecycle(currentRequest, BOOKING_STATUSES.CONFIRMED),
          paymentRecordId: paymentRecord.id,
          confirmedAt: paymentRecord.paidAt,
          updatedAt: paymentRecord.paidAt,
        };
      });

      writeBookingRequests(updatedRequests);
      return updatedRequests;
    });

    return {
      ok: true,
      paymentRecord,
    };
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
              bookingRequests={allBookingRequests}
              onToggleSave={handleToggleSave}
              onSubmitBookingRequest={handleSubmitBookingRequest}
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
                bookingRequests={allBookingRequests}
                paymentRecords={allPaymentRecords}
                onToggleSave={handleToggleSave}
                onUpdateBookingRequestStatus={handleUpdateBookingRequestStatus}
                onUpdateBookingLifecycle={handleUpdateBookingLifecycle}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/host-dashboard"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <HostDashboardPanel
                myListings={allUserListings}
                bookingRequests={hostBookingRequests}
                hostMessages={[]}
                onDeleteListing={handleDeleteListing}
                onToggleListingStatus={handleToggleListingStatus}
                onUpdateBookingRequestStatus={handleUpdateBookingRequestStatus}
                onUpdateBookingLifecycle={handleUpdateBookingLifecycle}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout/:requestId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <CheckoutPage
                currentUser={currentUser}
                bookingRequests={allBookingRequests}
                paymentRecords={allPaymentRecords}
                onCompleteCheckout={handleCompleteCheckout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <NotificationsPage
                currentUser={currentUser}
                bookingRequests={allBookingRequests}
              />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
