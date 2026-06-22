import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

import { useStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES } from "../routes/appRoutes";
import { APP_MODES } from "../constants/appEnums";
import { userCanUseRenterMode } from "../utils/roleUtils";

function ProtectedRoute({ children, requiredMode = null, requiresHostedListing = false, allowHostSetup = false }) {
  const {
    currentUser,
    authIsLoading,
    activeMode,
    canUseHostMode,
    hasHostedListings,
    hostDashboardIsAvailable,
    actions,
  } = useStoretApp();
  const location = useLocation();
  const navigate = useNavigate();
  const canUseRenterMode = userCanUseRenterMode(currentUser);

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

  const hostSetupIsAllowed =
    requiredMode === APP_MODES.HOST &&
    allowHostSetup &&
    canUseHostMode &&
    !hasHostedListings;

  if (hostSetupIsAllowed) {
    return children;
  }

  if (requiredMode === APP_MODES.HOST && activeMode !== APP_MODES.HOST) {
    async function handleHostModeClick() {
      if (canUseHostMode && !hasHostedListings) {
        navigate(APP_ROUTES.createListing, { replace: true });
        return;
      }

      if (canUseHostMode) {
        const result = actions.switchActiveMode(APP_MODES.HOST);

        if (result?.ok) {
          navigate(
            hostDashboardIsAvailable ? location.pathname : APP_ROUTES.createListing,
            { replace: true }
          );
          return;
        }
      }

      const result = await actions.becomeHost();

      if (result?.ok) {
        navigate(APP_ROUTES.createListing, { replace: true });
      }
    }

    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 6,
          bgcolor: "background.default",
        }}
      >
        <Card sx={{ maxWidth: 620, width: "100%" }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5} alignItems="center" textAlign="center">
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.light",
                  color: "primary.dark",
                }}
              >
                <HomeWorkRoundedIcon fontSize="large" />
              </Box>

              <Box>
                <Typography variant="h4">
                  {canUseHostMode ? "Create your first listing" : "Host tools are not available yet"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {canUseHostMode
                    ? "Finish your first listing before Storet unlocks the full host dashboard experience."
                    : "Renter accounts stay focused on browsing and booking spaces. Become a host when you are ready to list extra space."}
                </Typography>
              </Box>

              {!canUseHostMode && (
                <Alert severity="info" sx={{ textAlign: "left" }}>
                  Your account is currently set up as a renter. You can become a host
                  to list extra space and manage renter requests.
                </Alert>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  variant="contained"
                  startIcon={canUseHostMode ? <SwapHorizRoundedIcon /> : <HomeWorkRoundedIcon />}
                  onClick={handleHostModeClick}
                >
                  {canUseHostMode ? (hasHostedListings ? "Switch to Host" : "Create first listing") : "Become a host"}
                </Button>

                {canUseRenterMode && (
                  <Button
                    variant="outlined"
                    startIcon={<WarehouseRoundedIcon />}
                    onClick={() => {
                      actions.switchActiveMode(APP_MODES.RENTER);
                      navigate(APP_ROUTES.explore);
                    }}
                  >
                    Stay in renter mode
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (requiredMode === APP_MODES.HOST && requiresHostedListing && !hasHostedListings) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 6,
          bgcolor: "background.default",
        }}
      >
        <Card sx={{ maxWidth: 620, width: "100%" }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5} alignItems="center" textAlign="center">
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.light",
                  color: "primary.dark",
                }}
              >
                <HomeWorkRoundedIcon fontSize="large" />
              </Box>

              <Box>
                <Typography variant="h4">Create your first listing first</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Host dashboard tools unlock after you have at least one space
                  listed. This keeps the host setup flow focused on creating your
                  first listing before managing requests or analytics.
                </Typography>
              </Box>

              <Alert severity="info" sx={{ textAlign: "left" }}>
                You are set up for hosting now. Create your first Storet listing,
                then the Host Dashboard will become available.
              </Alert>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  variant="contained"
                  startIcon={<HomeWorkRoundedIcon />}
                  onClick={() => navigate(APP_ROUTES.createListing)}
                >
                  Create first listing
                </Button>

                {canUseRenterMode && (
                  <Button
                    variant="outlined"
                    startIcon={<WarehouseRoundedIcon />}
                    onClick={() => {
                      actions.switchActiveMode(APP_MODES.RENTER);
                      navigate(APP_ROUTES.explore);
                    }}
                  >
                    Back to renter mode
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return children;
}

export default ProtectedRoute;
