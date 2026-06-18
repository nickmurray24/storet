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
  const baseItems = [
    { label: "Home", to: APP_ROUTES.home },
  ];

  if (!isLoggedIn) {
    return [
      ...baseItems,
      { label: "Explore", to: APP_ROUTES.explore },
    ];
  }

  if (activeMode === APP_MODES.HOST) {
    return [
      ...baseItems,
      { label: "Notifications", to: APP_ROUTES.notifications },
      hostDashboardIsAvailable
        ? { label: "Host Dashboard", to: APP_ROUTES.hostDashboard }
        : { label: "Create Listing", to: APP_ROUTES.createListing },
      { label: "Profile", to: APP_ROUTES.profile },
    ];
  }

  return [
    ...baseItems,
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
  const canSelectHostMode = userCapabilityModes.includes(APP_MODES.HOST) && hasHostedListings;
  const visibleModeOptions = [canSelectRenterMode, canSelectHostMode].filter(Boolean).length;
  const canSwitchModes = isLoggedIn && visibleModeOptions > 1;
  const unreadNotificationsCount = storetApp?.unreadNotificationsCount || 0;
  const hostDashboardIsAvailable = Boolean(storetApp?.hostDashboardIsAvailable);
  const visibleNavItems = getNavItemsForMode({
    isLoggedIn,
    activeMode,
    hostDashboardIsAvailable,
  });

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
      navigate(APP_ROUTES.hostDashboard);
      return;
    }

    if (location.pathname === APP_ROUTES.hostDashboard || location.pathname === APP_ROUTES.createListing) {
      navigate(APP_ROUTES.explore);
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
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box
            component={NavLink}
            to={APP_ROUTES.explore}
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
            }}
          >
            {visibleNavItems.map((item) => {
              const active = isActiveRoute(item.to);

              return (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  variant={active ? "contained" : "text"}
                  color={active ? "primary" : "inherit"}
                  sx={{
                    borderRadius: 999,
                    px: 2,
                  }}
                >
                  {item.to === APP_ROUTES.notifications && unreadNotificationsCount > 0 ? (
                    <Badge
                      color="error"
                      badgeContent={unreadNotificationsCount}
                      max={99}
                      sx={{ "& .MuiBadge-badge": { right: -14 } }}
                    >
                      <Box component="span" sx={{ pr: 0.75 }}>
                        {item.label}
                      </Box>
                    </Badge>
                  ) : (
                    item.label
                  )}
                </Button>
              );
            })}

            {isLoggedIn ? (
              <>
                <Chip
                  icon={activeMode === APP_MODES.HOST ? <HomeWorkRoundedIcon /> : <PersonRoundedIcon />}
                  label={`${userName} • ${activeMode}`}
                  variant="outlined"
                  clickable={canSwitchModes}
                  onClick={handleModeMenuOpen}
                  onDelete={canSwitchModes ? handleModeMenuOpen : undefined}
                  deleteIcon={canSwitchModes ? <ArrowDropDownRoundedIcon /> : undefined}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "background.paper",
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
                  <Button variant="outlined" color="primary" onClick={logoutAction}>
                    Log Out
                  </Button>
                )}
              </>
            ) : (
              <Button component={NavLink} to={APP_ROUTES.auth} variant="contained">
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
