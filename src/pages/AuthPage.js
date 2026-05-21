import React, { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES, getSafeRedirectPath } from "../routes/appRoutes";

function AuthPage({ onLogin }) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAfterAuth = getSafeRedirectPath(
    location.state?.from,
    APP_ROUTES.explore
  );

  const [authMode, setAuthMode] = useState("login");
  const [role, setRole] = useState("Renter");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const isSignup = authMode === "signup";

  const pageCopy = useMemo(() => {
    if (isSignup) {
      return {
        eyebrow: "Create your Storet account",
        title: "Start storing or hosting with confidence.",
        description:
          "Create an account to save listings, reserve storage, manage bookings, or list extra space as a host.",
        buttonLabel: "Create account",
        switchText: "Already have an account?",
        switchAction: "Log in",
      };
    }

    return {
      eyebrow: "Welcome back",
      title: "Log in to manage your Storet activity.",
      description:
        "Access your saved spaces, booking requests, notifications, and host tools.",
      buttonLabel: "Log in",
      switchText: "New to Storet?",
      switchAction: "Create an account",
    };
  }, [isSignup]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleRoleChange(event, newRole) {
    if (newRole) {
      setRole(newRole);
    }
  }

  function handleModeSwitch() {
    setError("");
    setAuthMode((currentMode) =>
      currentMode === "login" ? "signup" : "login"
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();

    if (isSignup && !trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      setError("Please enter your password.");
      return;
    }

    const user = {
      isAuthenticated: true,
      fullName: isSignup ? trimmedName : "Demo User",
      email: trimmedEmail,
      role,
    };

    const loginAction = onLogin || storetApp?.actions?.login;

    if (!loginAction) {
      setError("We could not finish signing you in. Please refresh and try again.");
      return;
    }

    loginAction(user);
    navigate(redirectAfterAuth, { replace: true });
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 18% 15%, rgba(37, 99, 235, 0.14), transparent 32%), radial-gradient(circle at 90% 10%, rgba(20, 184, 166, 0.15), transparent 30%)",
        }}
      />

      <Box
        component="header"
        sx={{
          position: "relative",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ py: 2 }}
          >
            <Stack
              component={RouterLink}
              to={APP_ROUTES.home}
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{
                color: "text.primary",
                textDecoration: "none",
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "primary.main",
                  fontWeight: 800,
                }}
              >
                S
              </Avatar>

              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>
                  Storet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Storage, simplified
                </Typography>
              </Box>
            </Stack>

            <Button
              component={RouterLink}
              to={APP_ROUTES.explore}
              variant="outlined"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ bgcolor: "background.paper" }}
            >
              Explore spaces
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          py: { xs: 5, md: 9 },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 4, md: 7 }}
          alignItems="center"
        >
          <Stack spacing={3} sx={{ flex: 1 }}>
            <Chip
              label={pageCopy.eyebrow}
              color="primary"
              variant="outlined"
              sx={{
                width: "fit-content",
                bgcolor: "background.paper",
                fontWeight: 700,
              }}
            />

            <Stack spacing={2}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "2.5rem", sm: "3.4rem", md: "4.25rem" },
                  lineHeight: 0.98,
                  maxWidth: 680,
                }}
              >
                {pageCopy.title}
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  maxWidth: 590,
                  lineHeight: 1.65,
                  fontWeight: 400,
                }}
              >
                {pageCopy.description}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ maxWidth: 650 }}
            >
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                      <PersonRoundedIcon />
                    </Avatar>
                    <Typography variant="h6">Renters</Typography>
                    <Typography color="text.secondary" lineHeight={1.7}>
                      Save spaces, request reservations, join waitlists, and track
                      storage activity.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    <Avatar
                      sx={{ bgcolor: "secondary.light", color: "secondary.dark" }}
                    >
                      <HomeWorkRoundedIcon />
                    </Avatar>
                    <Typography variant="h6">Hosts</Typography>
                    <Typography color="text.secondary" lineHeight={1.7}>
                      List unused space, manage requests, and keep storage
                      activity organized.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Stack>

          <Box sx={{ width: "100%", maxWidth: 460 }}>
            <Card>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Stack spacing={3}>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: "primary.main",
                      }}
                    >
                      <LockRoundedIcon />
                    </Avatar>

                    <Box>
                      <Typography variant="h4">
                        {isSignup ? "Create account" : "Log in"}
                      </Typography>
                      <Typography color="text.secondary">
                        {isSignup
                          ? "Choose how you want to use Storet."
                          : "Continue to your Storet dashboard."}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  {error && <Alert severity="error">{error}</Alert>}

                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2.25}>
                      {isSignup && (
                        <TextField
                          label="Full name"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          fullWidth
                        />
                      )}

                      <TextField
                        label="Email address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        fullWidth
                      />

                      <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        fullWidth
                      />

                      <Stack spacing={1}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          fontWeight={700}
                        >
                          I am using Storet as a:
                        </Typography>

                        <ToggleButtonGroup
                          value={role}
                          exclusive
                          onChange={handleRoleChange}
                          fullWidth
                          color="primary"
                          sx={{
                            "& .MuiToggleButton-root": {
                              py: 1.25,
                              fontWeight: 700,
                              textTransform: "none",
                            },
                          }}
                        >
                          <ToggleButton value="Renter">Renter</ToggleButton>
                          <ToggleButton value="Host">Host</ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>

                      <Button
                        type="submit"
                        size="large"
                        variant="contained"
                        endIcon={<ArrowForwardRoundedIcon />}
                      >
                        {pageCopy.buttonLabel}
                      </Button>
                    </Stack>
                  </Box>

                  <Divider />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                  >
                    <Typography color="text.secondary">
                      {pageCopy.switchText}
                    </Typography>

                    <Button onClick={handleModeSwitch}>
                      {pageCopy.switchAction}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default AuthPage;