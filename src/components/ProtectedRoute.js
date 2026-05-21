import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES } from "../routes/appRoutes";

function ProtectedRoute({ children }) {
  const { currentUser } = useStoretApp();
  const location = useLocation();

  if (!currentUser?.isAuthenticated) {
    return (
      <Navigate
        to={APP_ROUTES.auth}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
