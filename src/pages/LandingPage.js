import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Avatar, Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { APP_ROUTES } from "../routes/appRoutes";
import exampleGaragePhoto from "../assets/example-storage-garage.png";

const featureCards = [
  {
    icon: <SearchRoundedIcon />,
    title: "Find storage nearby",
    description: "Search garages, spare rooms, basements, storage units, and flexible local spaces.",
  },
  {
    icon: <ShieldRoundedIcon />,
    title: "Store with confidence",
    description: "Compare listing details, availability, host information, and storage fit before reserving.",
  },
  {
    icon: <PaymentsRoundedIcon />,
    title: "Flexible renting",
    description: "Support short-term, long-term, instant booking, and waitlist-based storage options.",
  },
];

const useCases = ["College summer storage", "Apartment moves", "Garage overflow", "Long-term storage"];

function LandingPage() {
  return (
    <Box sx={{
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      bgcolor: "background.default",
      "--landing-page-pad": "24px",
      "--landing-content-gap": "16px",
      "--landing-card-padding": "24px",
      "--landing-feature-padding": "20px",
      "--landing-photo-min": "180px",
      "@media (min-width: 900px) and (max-height: 840px)": {
        "--landing-page-pad": "16px",
        "--landing-content-gap": "12px",
        "--landing-card-padding": "20px",
        "--landing-feature-padding": "10px",
        "--landing-photo-min": "130px",
      },
      "@media (min-width: 900px) and (max-height: 640px)": {
        "--landing-page-pad": "8px",
        "--landing-content-gap": "10px",
        "--landing-card-padding": "16px",
        "--landing-feature-padding": "10px",
        "--landing-photo-min": "110px",
      },
    }}>
      <Box component="header" sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(255,255,255,0.92)", flexShrink: 0 }}>
        <Container maxWidth="lg">
          <Stack direction="row" useFlexGap sx={{ minHeight: { md: 63 }, py: { xs: 1.25, md: 1 }, gap: 1.5, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <Stack component={RouterLink} to={APP_ROUTES.home} direction="row" spacing={1.25} sx={{ color: "text.primary", textDecoration: "none", alignItems: "center", flexShrink: 0 }}>
              <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.main", fontWeight: 800 }}>S</Avatar>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1 }}>Storet</Typography>
                <Typography variant="caption" color="text.secondary">Storage, simplified</Typography>
              </Box>
            </Stack>
            <Stack direction="row" useFlexGap sx={{ ml: "auto", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", "& .MuiButton-root": { height: 36, px: 1.25, fontSize: "0.8125rem" } }}>
              <Button component={RouterLink} to={APP_ROUTES.auth} color="inherit" size="small" variant="outlined">Log in</Button>
              <Button component={RouterLink} to={`${APP_ROUTES.auth}?mode=signup`} variant="contained" size="small">Create account</Button>
              <Button component={RouterLink} to={APP_ROUTES.explore} variant="outlined" size="small" endIcon={<ArrowForwardRoundedIcon />}>Explore</Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box component="main" sx={{
        flex: 1,
        py: "var(--landing-page-pad)",
        background: "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.12), transparent 42%), radial-gradient(circle at 92% 16%, rgba(20, 184, 166, 0.14), transparent 40%)",
      }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.2fr) minmax(0, 1fr)" },
            gap: { xs: 3, md: 4, lg: 5 },
            alignItems: "stretch",
            minHeight: { md: "calc(100svh - 64px - var(--landing-page-pad) - var(--landing-page-pad))" },
          }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 2.5 }, minWidth: 0, "@media (min-width: 900px) and (max-height: 840px)": { gap: 2 } }}>
              <Stack sx={{ gap: "var(--landing-content-gap)" }}>
                <Chip label="Peer-to-peer storage marketplace" color="primary" variant="outlined" sx={{ alignSelf: "flex-start", bgcolor: "background.paper", fontWeight: 700 }} />
                <Typography variant="h1" sx={{
                  fontSize: { xs: "2.25rem", sm: "3rem", md: "3.45rem", lg: "3.8rem" },
                  lineHeight: 1.02,
                  maxWidth: 640,
                  "@media (min-width: 900px) and (max-height: 840px)": { fontSize: "2.9rem" },
                  "@media (min-width: 900px) and (max-height: 640px)": { fontSize: "2.55rem" },
                }}>
                  Find extra space without the storage headache.
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "1rem", lineHeight: 1.5, maxWidth: 580 }}>
                  Storet helps renters find nearby storage options and helps hosts turn unused space into flexible income.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  <Button component={RouterLink} to={APP_ROUTES.explore} variant="contained" startIcon={<MapRoundedIcon />}>Find storage</Button>
                  <Button component={RouterLink} to={APP_ROUTES.createListing} variant="outlined" startIcon={<AddHomeWorkRoundedIcon />} sx={{ bgcolor: "background.paper" }}>List your space</Button>
                </Stack>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {useCases.map(useCase => <Chip key={useCase} label={useCase} size="small" sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }} />)}
                </Stack>
              </Stack>

              <Stack spacing={1.25} sx={{ mt: "auto" }}>
                {featureCards.map(feature => (
                  <Card key={feature.title} variant="outlined" sx={{ borderColor: "rgba(37,99,235,0.1)", borderRadius: "20px", boxShadow: "0 6px 20px rgba(15,23,42,0.035)" }}>
                    <CardContent sx={{ p: "var(--landing-feature-padding)", "&:last-child": { pb: "var(--landing-feature-padding)" } }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar variant="rounded" sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: "14px", bgcolor: "rgba(37,99,235,0.09)", color: "primary.main", "@media (min-width: 900px) and (max-height: 840px)": { width: 40, height: 40 } }}>{feature.icon}</Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ fontSize: "1.0625rem", lineHeight: 1.25, mb: 0.5, "@media (min-width: 900px) and (max-height: 840px)": { fontSize: "1rem" } }}>{feature.title}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: "0.875rem", lineHeight: 1.5, "@media (min-width: 900px) and (max-height: 840px)": { fontSize: "0.8125rem", lineHeight: 1.45 } }}>{feature.description}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Card sx={{ width: "100%", maxWidth: { xs: 520, md: "none" }, justifySelf: "center", minWidth: 0, display: "flex" }}>
              <CardContent sx={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--landing-content-gap)", p: "var(--landing-card-padding)", "&:last-child": { pb: "var(--landing-card-padding)" } }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.6875rem", lineHeight: 1.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>Example listing</Typography>
                    <Typography variant="h5" sx={{ fontSize: { xs: "1.4rem", md: "1.6rem" }, lineHeight: 1.2, overflowWrap: "anywhere", my: 0.5 }}>Oakley Garage Storage</Typography>
                    <Typography variant="body2" color="text.secondary">Oakley, Cincinnati, OH</Typography>
                  </Box>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: "secondary.main", flexShrink: 0 }}><WarehouseRoundedIcon /></Avatar>
                </Stack>

                <Box component="img" src={exampleGaragePhoto}
                  alt="Example garage interior with open storage space, shelves, boxes, and a bicycle"
                  width={1728} height={912}
                  sx={{ display: "block", width: "100%", height: { xs: 220, md: 0 }, minHeight: { md: "var(--landing-photo-min)" }, flex: { md: "1 1 0px" }, objectFit: "cover", borderRadius: "20px" }}
                />

                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip label="Indoor garage" size="small" variant="outlined" />
                    <Chip label="120 sq ft" size="small" variant="outlined" />
                    <Chip label="By appointment" size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    A dry, private garage for seasonal boxes, bikes, and small furniture, with easy driveway access.
                  </Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "center", pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Available rates</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.125rem", lineHeight: 1.3 }}>$10/day</Typography>
                    <Typography variant="body2" color="text.secondary">$85/month</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Alex M.</Typography>
                    <Typography variant="caption" color="text.secondary">Sample host · 18 reviews</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end", mt: 0.25 }}>
                      <StarRoundedIcon sx={{ color: "rating.main", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>4.9 / 5</Typography>
                    </Stack>
                  </Box>
                </Box>
                <Button component={RouterLink} to={APP_ROUTES.explore} variant="contained" fullWidth sx={{ minHeight: 38 }}>View listings</Button>
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;
