import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";

import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";

import { APP_ROUTES } from "../routes/appRoutes";

function NotFoundPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Container maxWidth="md" sx={{ py: { xs: 7, md: 10 } }}>
        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 5,
            textAlign: "center",
          }}
        >
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Stack spacing={2.5} alignItems="center">
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  bgcolor: "primary.50",
                  color: "primary.main",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <SearchOffRoundedIcon fontSize="large" />
              </Box>

              <Box>
                <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "2.6rem" } }}>
                  Page not found
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
                  This Storet page may have moved, or the link may be outdated. Head back to Explore to keep browsing storage spaces.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  component={RouterLink}
                  to={APP_ROUTES.explore}
                  variant="contained"
                  startIcon={<ExploreRoundedIcon />}
                >
                  Explore spaces
                </Button>
                <Button
                  component={RouterLink}
                  to={APP_ROUTES.home}
                  variant="outlined"
                  startIcon={<ArrowBackRoundedIcon />}
                >
                  Back home
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default NotFoundPage;
