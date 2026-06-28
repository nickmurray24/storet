import React, { useEffect, useMemo, useState } from "react";
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
import { APP_ROUTES } from "../routes/appRoutes";
import { APP_MODES, USER_ROLES } from "../constants/appEnums";
import { authService } from "../services/authService";

const AUTH_MODES = {
  LOGIN: "login",
  SIGNUP: "signup",
  FORGOT_PASSWORD: "forgot-password",
  RESET_PASSWORD: "reset-password",
};

const FAILED_LOGIN_RESET_PROMPT_THRESHOLD = 2;

function getRecoveryModeFromLocation(location) {
  const searchParams = new URLSearchParams(location.search || "");
  const hashParams = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const requestedMode = searchParams.get("mode") || hashParams.get("mode");
  const authType = searchParams.get("type") || hashParams.get("type");

  return requestedMode === AUTH_MODES.RESET_PASSWORD || authType === "recovery";
}

function AuthPage({ onLogin }) {
  const storetApp = useOptionalStoretApp();
  const navigate = useNavigate();
  const location = useLocation();
  // The role toggle on this page is the user's explicit mode choice.
  // Do not reuse a stale protected-route redirect from a previous session,
  // because that can send renters to host guards or hosts to renter pages.
  const redirectAfterAuth = "";

  const [authMode, setAuthMode] = useState(() =>
    getRecoveryModeFromLocation(window.location)
      ? AUTH_MODES.RESET_PASSWORD
      : AUTH_MODES.LOGIN
  );
  const [role, setRole] = useState(USER_ROLES.RENTER);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = authMode === AUTH_MODES.LOGIN;
  const isSignup = authMode === AUTH_MODES.SIGNUP;
  const isForgotPassword = authMode === AUTH_MODES.FORGOT_PASSWORD;
  const isResetPassword = authMode === AUTH_MODES.RESET_PASSWORD;
  const shouldShowForgotPasswordPrompt =
    isLogin && failedLoginAttempts >= FAILED_LOGIN_RESET_PROMPT_THRESHOLD;

  const pageCopy = useMemo(() => {
    if (isSignup) {
      return {
        eyebrow: "Create your Storet account",
        title: "Start storing or hosting with confidence.",
        description:
          "Create an account to save listings, reserve storage, manage bookings, or list extra space as a host.",
        formTitle: "Create account",
        formDescription: "Choose how you want to use Storet.",
        buttonLabel: "Create account",
        switchText: "Already have an account?",
        switchAction: "Log in",
      };
    }

    if (isForgotPassword) {
      return {
        eyebrow: "Password help",
        title: "Reset your Storet password.",
        description:
          "Enter your email and Storet will send a secure reset link if that email has an account.",
        formTitle: "Forgot password",
        formDescription: "We will email you a secure reset link.",
        buttonLabel: "Send reset link",
        switchText: "Remembered your password?",
        switchAction: "Back to log in",
      };
    }

    if (isResetPassword) {
      return {
        eyebrow: "Create a new password",
        title: "Choose a new Storet password.",
        description:
          "Enter a new password for your Storet account, then log in with the updated password.",
        formTitle: "New password",
        formDescription: "Use at least 6 characters.",
        buttonLabel: "Update password",
        switchText: "Need to log in instead?",
        switchAction: "Back to log in",
      };
    }

    return {
      eyebrow: "Welcome back",
      title: "Log in to manage your Storet activity.",
      description:
        "Access your saved spaces, booking requests, notifications, and host tools.",
      formTitle: "Log in",
      formDescription: "Continue to your Storet dashboard.",
      buttonLabel: "Log in",
      switchText: "New to Storet?",
      switchAction: "Create an account",
    };
  }, [isForgotPassword, isResetPassword, isSignup]);

  useEffect(() => {
    if (getRecoveryModeFromLocation(location)) {
      setAuthMode(AUTH_MODES.RESET_PASSWORD);
      setError("");
      setSuccessMessage("Create a new password to finish resetting your Storet account.");
    }
  }, [location]);

  useEffect(() => {
    const subscription = authService.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode(AUTH_MODES.RESET_PASSWORD);
        setError("");
        setSuccessMessage("Create a new password to finish resetting your Storet account.");
      }
    });

    return () => {
      subscription.unsubscribe?.();
    };
  }, []);

  function handleInputChange(event) {
    const { name, value } = event.target;

    if (name === "email") {
      setFailedLoginAttempts(0);
    }

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

  function resetFeedback() {
    setError("");
    setSuccessMessage("");
  }

  function switchAuthMode(nextMode) {
    resetFeedback();
    setFormData((currentData) => ({
      ...currentData,
      password: "",
      confirmPassword: "",
    }));
    setAuthMode(nextMode);
  }

  function handleModeSwitch() {
    setFailedLoginAttempts(0);
    switchAuthMode(isSignup ? AUTH_MODES.LOGIN : AUTH_MODES.SIGNUP);
  }

  function handleForgotPasswordClick() {
    switchAuthMode(AUTH_MODES.FORGOT_PASSWORD);
  }

  function handleBackToLogin() {
    setFailedLoginAttempts(0);
    switchAuthMode(AUTH_MODES.LOGIN);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();

    if (isSignup && !trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!isResetPassword && !trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (isForgotPassword) {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);

      const resetResponse = await authService.sendPasswordResetEmail(trimmedEmail);

      setIsSubmitting(false);

      if (resetResponse.error) {
        setError(
          resetResponse.error.message ||
            "We could not send a reset link right now. Please try again."
        );
        return;
      }

      setFailedLoginAttempts(0);
      setFormData((currentData) => ({
        ...currentData,
        password: "",
        confirmPassword: "",
      }));
      setAuthMode(AUTH_MODES.LOGIN);
      setSuccessMessage(
        "If that email has a Storet account, a password reset link is on the way."
      );
      return;
    }

    if (!formData.password) {
      setError("Please enter your password.");
      return;
    }

    if ((isSignup || isResetPassword) && formData.password.length < 6) {
      setError("Please use a password with at least 6 characters.");
      return;
    }

    if (isResetPassword && formData.password !== formData.confirmPassword) {
      setError("Please make sure both password fields match.");
      return;
    }

    if (isResetPassword) {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);

      const updateResponse = await authService.updatePassword(formData.password);

      if (!updateResponse.error) {
        await storetApp?.actions?.logout?.();
      }

      setIsSubmitting(false);

      if (updateResponse.error) {
        setError(
          updateResponse.error.message ||
            "We could not update your password. Open the latest reset link and try again."
        );
        return;
      }

      setFailedLoginAttempts(0);
      setFormData((currentData) => ({
        ...currentData,
        password: "",
        confirmPassword: "",
      }));
      setAuthMode(AUTH_MODES.LOGIN);
      setSuccessMessage("Password updated. Please log in with your new password.");
      return;
    }

    const loginAction = onLogin || storetApp?.actions?.login;

    if (!loginAction) {
      setError("We could not finish signing you in. Please refresh and try again.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await loginAction({
      authMode,
      fullName: trimmedName,
      email: trimmedEmail,
      password: formData.password,
      role,
      preferredMode: role === USER_ROLES.HOST ? APP_MODES.HOST : APP_MODES.RENTER,
      redirectAfterAuth,
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      if (isLogin) {
        setFailedLoginAttempts((currentAttempts) => currentAttempts + 1);
      }

      setError(result?.error || "We could not finish signing you in. Please try again.");
      return;
    }

    setFailedLoginAttempts(0);

    if (result.needsEmailConfirmation) {
      setSuccessMessage(
        "Account created. Check your email to confirm your Storet account, then log in."
      );
      setAuthMode(AUTH_MODES.LOGIN);
      return;
    }

    navigate(result.redirectPath || redirectAfterAuth || APP_ROUTES.explore, { replace: true });
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
                      <Typography variant="h4">{pageCopy.formTitle}</Typography>
                      <Typography color="text.secondary">
                        {pageCopy.formDescription}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  {storetApp?.authError && !error && (
                    <Alert severity="warning">{storetApp.authError}</Alert>
                  )}

                  {successMessage && (
                    <Alert severity="success">{successMessage}</Alert>
                  )}

                  {error && <Alert severity="error">{error}</Alert>}

                  {shouldShowForgotPasswordPrompt && (
                    <Alert
                      severity="info"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={handleForgotPasswordClick}
                          disabled={isSubmitting}
                          sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                        >
                          Reset password
                        </Button>
                      }
                    >
                      Having trouble signing in? You can reset your password with a secure email link.
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2.25}>
                      {isSignup && (
                        <TextField
                          label="Full name"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          fullWidth
                        />
                      )}

                      {!isResetPassword && (
                        <TextField
                          label="Email address"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          fullWidth
                        />
                      )}

                      {!isForgotPassword && (
                        <Stack spacing={0.65}>
                          <TextField
                            label={isResetPassword ? "New password" : "Password"}
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            helperText={
                              isSignup || isResetPassword
                                ? "Use at least 6 characters."
                                : ""
                            }
                            fullWidth
                          />

                          {isLogin && (
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                              <Button
                                size="small"
                                onClick={handleForgotPasswordClick}
                                disabled={isSubmitting}
                                sx={{
                                  minWidth: 0,
                                  px: 0.5,
                                  py: 0,
                                  fontWeight: 800,
                                  lineHeight: 1.35,
                                  textTransform: "none",
                                }}
                              >
                                Forgot password?
                              </Button>
                            </Box>
                          )}
                        </Stack>
                      )}

                      {isResetPassword && (
                        <TextField
                          label="Confirm new password"
                          name="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          fullWidth
                        />
                      )}

                      {(isLogin || isSignup) && (
                        <Stack spacing={1}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight={700}
                          >
                            {isSignup
                              ? "Create my Storet account as a:"
                              : "Continue to Storet as a:"}
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
                            <ToggleButton value={USER_ROLES.RENTER} disabled={isSubmitting}>
                              Renter
                            </ToggleButton>
                            <ToggleButton value={USER_ROLES.HOST} disabled={isSubmitting}>
                              Host
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                      )}

                      <Button
                        type="submit"
                        size="large"
                        variant="contained"
                        endIcon={<ArrowForwardRoundedIcon />}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Please wait..." : pageCopy.buttonLabel}
                      </Button>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      component="span"
                      color="text.secondary"
                      sx={{ lineHeight: 1.4 }}
                    >
                      {pageCopy.switchText}
                    </Typography>

                    <Box
                      component="button"
                      type="button"
                      onClick={
                        isForgotPassword || isResetPassword
                          ? handleBackToLogin
                          : handleModeSwitch
                      }
                      disabled={isSubmitting}
                      sx={{
                        appearance: "none",
                        border: 0,
                        bgcolor: "transparent",
                        color: "primary.main",
                        cursor: isSubmitting ? "default" : "pointer",
                        font: "inherit",
                        fontWeight: 800,
                        lineHeight: 1.4,
                        p: 0,
                        m: 0,
                        opacity: isSubmitting ? 0.5 : 1,
                        textAlign: "center",
                        textDecoration: "none",
                        '&:hover': {
                          textDecoration: isSubmitting ? "none" : "underline",
                        },
                      }}
                    >
                      {pageCopy.switchAction}
                    </Box>
                  </Box>
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