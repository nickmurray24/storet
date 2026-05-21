import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import { APP_ROUTES } from "../routes/appRoutes";

const featureCards = [
  {
    icon: <SearchRoundedIcon />,
    title: "Find storage nearby",
    description:
      "Search garages, spare rooms, basements, storage units, and flexible local spaces.",
  },
  {
    icon: <ShieldRoundedIcon />,
    title: "Store with confidence",
    description:
      "Compare listing details, availability, host information, and storage fit before reserving.",
  },
  {
    icon: <PaymentsRoundedIcon />,
    title: "Flexible renting",
    description:
      "Support short-term, long-term, instant booking, and waitlist-based storage options.",
  },
];

const useCases = [
  "College summer storage",
  "Apartment moves",
  "Garage overflow",
  "Long-term storage",
];

function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <Box
        component="header"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
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

            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to={APP_ROUTES.auth} color="inherit">
                Log in
              </Button>

              <Button
                component={RouterLink}
                to={APP_ROUTES.explore}
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Explore
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box
        component="main"
        sx={{
          position: "relative",
          py: { xs: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.14), transparent 34%), radial-gradient(circle at 85% 15%, rgba(20, 184, 166, 0.16), transparent 30%)",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 5, md: 7 }}
            alignItems="center"
          >
            <Stack spacing={3} sx={{ flex: 1 }}>
              <Chip
                label="Peer-to-peer storage marketplace"
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
                    fontSize: { xs: "2.7rem", sm: "3.6rem", md: "4.7rem" },
                    lineHeight: 0.95,
                    maxWidth: 720,
                  }}
                >
                  Find extra space without the storage headache.
                </Typography>

                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    maxWidth: 620,
                    lineHeight: 1.65,
                    fontWeight: 400,
                  }}
                >
                  Storet helps renters find nearby storage options and helps
                  hosts turn unused space into flexible income.
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ pt: 1 }}
              >
                <Button
                  component={RouterLink}
                  to={APP_ROUTES.explore}
                  size="large"
                  variant="contained"
                  startIcon={<MapRoundedIcon />}
                >
                  Find storage
                </Button>

                <Button
                  component={RouterLink}
                  to={APP_ROUTES.createListing}
                  size="large"
                  variant="outlined"
                  startIcon={<AddHomeWorkRoundedIcon />}
                  sx={{ bgcolor: "background.paper" }}
                >
                  List your space
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {useCases.map((useCase) => (
                  <Chip
                    key={useCase}
                    label={useCase}
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                ))}
              </Stack>
            </Stack>

            <Box sx={{ width: "100%", maxWidth: 430 }}>
              <Card
                sx={{
                  position: "relative",
                  overflow: "visible",
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Stack spacing={3}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Featured nearby
                        </Typography>
                        <Typography variant="h5">Oakley Garage Space</Typography>
                      </Box>

                      <Avatar sx={{ bgcolor: "secondary.main" }}>
                        <WarehouseRoundedIcon />
                      </Avatar>
                    </Stack>

                    <Box
                      sx={{
                        borderRadius: 4,
                        height: 190,
                        background:
                          "linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78))",
                        display: "flex",
                        alignItems: "flex-end",
                        p: 2,
                        color: "white",
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="h6">Clean, private, indoor</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.88 }}>
                          6 miles away · 120 sq ft · Instant booking
                        </Typography>
                      </Stack>
                    </Box>

                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography color="text.secondary">Available rates</Typography>
                        <Typography variant="h5">$10/day · $85/mo</Typography>
                      </Stack>

                      <Divider />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography color="text.secondary">Host rating</Typography>
                        <Typography fontWeight={800}>4.9 / 5</Typography>
                      </Stack>
                    </Stack>

                    <Button
                      component={RouterLink}
                      to={APP_ROUTES.explore}
                      variant="contained"
                      fullWidth
                    >
                      View listings
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mt: { xs: 7, md: 10 } }}
          >
            {featureCards.map((feature) => (
              <Card key={feature.title} sx={{ flex: 1 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Avatar
                      sx={{
                        bgcolor: "primary.light",
                        color: "primary.dark",
                      }}
                    >
                      {feature.icon}
                    </Avatar>

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography color="text.secondary" lineHeight={1.7}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;