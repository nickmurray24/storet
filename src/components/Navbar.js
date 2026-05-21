import { NavLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import {
  APP_ROUTES,
  NAV_ITEMS,
  getRouteIsHiddenFromGlobalNav,
} from "../routes/appRoutes";

function Navbar({ currentUser, onLogout }) {
  const storetApp = useOptionalStoretApp();
  const location = useLocation();

  if (getRouteIsHiddenFromGlobalNav(location.pathname)) {
    return null;
  }

  const activeUser = currentUser || storetApp?.currentUser;
  const logoutAction = onLogout || storetApp?.actions?.logout;

  const isLoggedIn = activeUser?.isAuthenticated;
  const userName = activeUser?.fullName || "Demo User";
  const userRole = activeUser?.role || "Renter";

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresAuth || isLoggedIn
  );

  function isActiveRoute(to) {
    if (to === APP_ROUTES.home) {
      return location.pathname === APP_ROUTES.home;
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`);
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
                  {item.label}
                </Button>
              );
            })}

            {isLoggedIn ? (
              <>
                <Chip
                  label={`${userName} • ${userRole}`}
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    bgcolor: "background.paper",
                  }}
                />

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
