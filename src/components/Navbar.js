import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import {
  APP_ROUTES,
  getRouteIsHiddenFromGlobalNav,
} from "../routes/appRoutes";
import { APP_MODES } from "../constants/appEnums";

function getNavItemsForMode({ isLoggedIn, activeMode, hostDashboardIsAvailable }) {
  if (!isLoggedIn) {
    return [{ label: "Explore", to: APP_ROUTES.explore }];
  }

  if (activeMode === APP_MODES.HOST) {
    return [
      { label: "Notifications", to: APP_ROUTES.notifications },
      hostDashboardIsAvailable
        ? { label: "Host Dashboard", to: APP_ROUTES.hostDashboard }
        : { label: "Create Listing", to: APP_ROUTES.createListing },
      { label: "Profile", to: APP_ROUTES.profile },
    ];
  }

  return [
    { label: "Explore", to: APP_ROUTES.explore },
    { label: "Notifications", to: APP_ROUTES.notifications },
    { label: "Profile", to: APP_ROUTES.profile },
  ];
}

function Navbar({ currentUser, onLogout }) {
  const storetApp = useOptionalStoretApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [modeMenuAnchor, setModeMenuAnchor] = useState(null);

  if (getRouteIsHiddenFromGlobalNav(location.pathname)) {
    return null;
  }

  const activeUser = currentUser || storetApp?.currentUser;
  const logoutAction = onLogout || storetApp?.actions?.logout;

  const isLoggedIn = activeUser?.isAuthenticated;
  const userName = activeUser?.fullName || "Demo User";
  const activeMode = storetApp?.activeMode || activeUser?.role || APP_MODES.RENTER;
  const userCapabilityModes = storetApp?.userCapabilityModes || [activeMode];
  const hasHostedListings = Boolean(storetApp?.hasHostedListings);
  const canSelectRenterMode = userCapabilityModes.includes(APP_MODES.RENTER);
  const canSelectHostMode =
    userCapabilityModes.includes(APP_MODES.HOST) &&
    (hasHostedListings || !canSelectRenterMode);
  const visibleModeOptions = [canSelectRenterMode, canSelectHostMode].filter(Boolean).length;
  const canSwitchModes = isLoggedIn && visibleModeOptions > 1;
  const unreadNotificationsCount = storetApp?.unreadNotificationsCount || 0;
  const hostDashboardIsAvailable = Boolean(storetApp?.hostDashboardIsAvailable);
  const visibleNavItems = getNavItemsForMode({
    isLoggedIn,
    activeMode,
    hostDashboardIsAvailable,
  });
  const brandDestination =
    isLoggedIn && activeMode === APP_MODES.HOST
      ? hostDashboardIsAvailable
        ? APP_ROUTES.hostDashboard
        : APP_ROUTES.createListing
      : APP_ROUTES.explore;

  function isActiveRoute(to) {
    if (to === APP_ROUTES.home) {
      return location.pathname === APP_ROUTES.home;
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function handleModeMenuOpen(event) {
    if (!canSwitchModes) {
      return;
    }

    setModeMenuAnchor(event.currentTarget);
  }

  function handleModeMenuClose() {
    setModeMenuAnchor(null);
  }

  function handleModeSwitch(nextMode) {
    const result = storetApp?.actions?.switchActiveMode?.(nextMode);
    handleModeMenuClose();

    if (!result?.ok) {
      return;
    }

    if (nextMode === APP_MODES.HOST) {
      navigate(hostDashboardIsAvailable ? APP_ROUTES.hostDashboard : APP_ROUTES.createListing);
      return;
    }

    if (location.pathname === APP_ROUTES.hostDashboard || location.pathname === APP_ROUTES.createListing) {
      navigate(APP_ROUTES.explore);
    }
  }

  async function handleLogout() {
    const result = await logoutAction?.();

    if (result?.ok !== false) {
      navigate(APP_ROUTES.auth, { replace: true });
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(255,255,255,0.9)",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(16px)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: 76,
            py: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box
            component={NavLink}
            to={brandDestination}
            sx={{
              color: "inherit",
              textDecoration: "none",
              minWidth: "fit-content",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
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
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            spacing={1}
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              ml: "auto",
              minWidth: 0,
              flex: { xs: "1 1 100%", md: "0 1 auto" },
              gap: 1,
              "& > .MuiButton-root, & > .MuiChip-root": { height: 36, minHeight: 36, flexShrink: 0 },
            }}
            useFlexGap
          >
            {visibleNavItems.map((item) => {
              const active = isActiveRoute(item.to);

              return (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  variant="outlined"
                  color={active ? "primary" : "inherit"}
                  size="small"
                  aria-label={item.to === APP_ROUTES.notifications && unreadNotificationsCount > 0
                    ? `${item.label}, ${unreadNotificationsCount} unread` : undefined}
                  sx={{
                    borderRadius: 999,
                    px: 1.5,
                    borderColor: active ? "primary.main" : "divider",
                    bgcolor: active ? "action.selected" : "transparent",
                    fontWeight: active ? 800 : 700,
                    gap: 0.75,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                  {item.to === APP_ROUTES.notifications && unreadNotificationsCount > 0 && (
                    <Badge color="error" badgeContent={unreadNotificationsCount} max={99} aria-hidden="true"
                      sx={{ "& .MuiBadge-badge": { position: "static", transform: "none", minWidth: 20,
                        height: 20, borderRadius: 10, px: 0.5, fontWeight: 800 } }} />
                  )}
                </Button>
              );
            })}

            {isLoggedIn ? (
              <>
                <Chip
                  icon={activeMode === APP_MODES.HOST ? <HomeWorkRoundedIcon /> : <PersonRoundedIcon />}
                  label={`${userName} • ${activeMode}`}
                  title={`${userName} • ${activeMode}`}
                  variant="outlined"
                  clickable={canSwitchModes}
                  onClick={handleModeMenuOpen}
                  onDelete={canSwitchModes ? handleModeMenuOpen : undefined}
                  deleteIcon={canSwitchModes ? <ArrowDropDownRoundedIcon /> : undefined}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "background.paper",
                    maxWidth: { xs: "min(100%, 260px)", md: 280 },
                    alignItems: "center",
                    "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                    "& .MuiChip-deleteIcon": {
                      color: "text.secondary",
                    },
                  }}
                />

                <Menu
                  anchorEl={modeMenuAnchor}
                  open={Boolean(modeMenuAnchor)}
                  onClose={handleModeMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                      Use Storet as
                    </Typography>
                  </Box>

                  <MenuItem
                    selected={activeMode === APP_MODES.RENTER}
                    disabled={!canSelectRenterMode}
                    onClick={() => handleModeSwitch(APP_MODES.RENTER)}
                  >
                    <ListItemIcon>
                      <PersonRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Renter" secondary="Browse, save, and book spaces" />
                  </MenuItem>

                  <MenuItem
                    selected={activeMode === APP_MODES.HOST}
                    disabled={!canSelectHostMode}
                    onClick={() => handleModeSwitch(APP_MODES.HOST)}
                  >
                    <ListItemIcon>
                      <HomeWorkRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Host"
                      secondary={hasHostedListings ? "List spaces and manage requests" : "Create a listing first to unlock host mode"}
                    />
                  </MenuItem>
                </Menu>

                {logoutAction && (
                  <Button size="small" variant="outlined" color="primary" onClick={handleLogout}>
                    Log Out
                  </Button>
                )}
              </>
            ) : (
              <Button size="small" component={NavLink} to={APP_ROUTES.auth} variant="outlined">
                Log In
              </Button>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
