import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import { useStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES } from "../routes/appRoutes";

function ProtectedRoute({ children }) {
  const { currentUser, authIsLoading } = useStoretApp();
  const location = useLocation();

  if (authIsLoading) {
    return (
      <Box
        sx={{
          minHeight: "55vh",
          display: "grid",
          placeItems: "center",
          px: 2,
        }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <CircularProgress />
          <Typography color="text.secondary">Checking your Storet session...</Typography>
        </Stack>
      </Box>
    );
  }

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
