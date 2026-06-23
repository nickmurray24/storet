import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

import {
  buildDisplayLocation,
  hasVerifiedCoordinates,
  mapMapboxAddressFeatureToListingAddress,
} from "../utils/addressUtils";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || "";
const CINCINNATI_PROXIMITY = "-84.512,39.103";

function buildMapboxSearchUrl(query) {
  const searchParams = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country: "us",
    types: "address",
    autocomplete: "true",
    limit: "6",
    proximity: CINCINNATI_PROXIMITY,
  });

  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?${searchParams.toString()}`;
}

function getOptionLabel(option = {}) {
  if (typeof option === "string") {
    return option;
  }

  return option.place_name || option.properties?.full_address || option.text || "";
}

function VerifiedAddressField({
  address = {},
  onAddressInputChange,
  onAddressSelected,
  disabled,
}) {
  const hasToken = Boolean(MAPBOX_TOKEN);
  const hideOptionsTimer = useRef(null);

  const isVerified = hasVerifiedCoordinates(address);

  const [addressSearchValue, setAddressSearchValue] = useState(
    address?.addressLine1 || ""
  );
  const [addressOptions, setAddressOptions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setAddressSearchValue(address?.addressLine1 || "");
  }, [address?.addressLine1]);

  useEffect(() => {
    return () => {
      if (hideOptionsTimer.current) {
        window.clearTimeout(hideOptionsTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasToken || disabled) {
      setAddressOptions([]);
      setIsSearching(false);
      return undefined;
    }

    const trimmedQuery = addressSearchValue.trim();

    if (trimmedQuery.length < 3) {
      setAddressOptions([]);
      setIsSearching(false);
      setSearchError("");
      return undefined;
    }

    let ignoreResult = false;
    const controller = new AbortController();

    const debounceTimer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");

      try {
        const response = await fetch(buildMapboxSearchUrl(trimmedQuery), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Address search failed.");
        }

        const data = await response.json();

        if (!ignoreResult) {
          const nextOptions = Array.isArray(data.features) ? data.features : [];
          setAddressOptions(nextOptions);
          setShowOptions(nextOptions.length > 0);
        }
      } catch (error) {
        if (!ignoreResult && error.name !== "AbortError") {
          setAddressOptions([]);
          setSearchError("Address search is unavailable. Please try again.");
        }
      } finally {
        if (!ignoreResult) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      ignoreResult = true;
      controller.abort();
      window.clearTimeout(debounceTimer);
    };
  }, [addressSearchValue, disabled, hasToken]);

  const selectedAddressLabel = useMemo(() => {
    return address?.formattedAddress || address?.addressLine1 || "";
  }, [address?.addressLine1, address?.formattedAddress]);

  function handleAddressInputChange(nextValue) {
    setAddressSearchValue(nextValue);
    setShowOptions(true);

    // Typing a new street address means the selected Mapbox result no longer
    // represents the current street value. City/state/ZIP edits below preserve
    // verification, but changing the main street field requires selecting a
    // suggestion again.
    onAddressInputChange?.("addressLine1", nextValue);
  }

  function handleAddressSelected(selectedFeature) {
    if (!selectedFeature) {
      return;
    }

    const nextAddress = mapMapboxAddressFeatureToListingAddress(selectedFeature);
    const nextSearchLabel = nextAddress.addressLine1 || getOptionLabel(selectedFeature);

    setAddressSearchValue(nextSearchLabel);
    setAddressOptions([]);
    setShowOptions(false);
    setSearchError("");

    onAddressSelected?.({
      ...nextAddress,
      addressLine2: address?.addressLine2 || nextAddress.addressLine2 || "",
    });
  }

  function handleEditableAddressFieldChange(fieldName, value) {
    const nextAddress = {
      ...address,
      [fieldName]: fieldName === "state" ? value.toUpperCase() : value,
    };

    nextAddress.displayLocation = buildDisplayLocation({
      city: nextAddress.city,
      state: nextAddress.state,
      country: nextAddress.country,
      fallback: nextAddress.displayLocation || nextAddress.location,
    });

    const formattedParts = [
      nextAddress.addressLine1,
      nextAddress.addressLine2,
      nextAddress.city,
      [nextAddress.state, nextAddress.postalCode].filter(Boolean).join(" "),
    ].filter(Boolean);

    nextAddress.formattedAddress = formattedParts.join(", ");

    onAddressSelected?.(nextAddress);
  }

  function handleAddressFieldFocus() {
    if (hideOptionsTimer.current) {
      window.clearTimeout(hideOptionsTimer.current);
    }

    if (addressOptions.length > 0) {
      setShowOptions(true);
    }
  }

  function handleAddressFieldBlur() {
    hideOptionsTimer.current = window.setTimeout(() => {
      setShowOptions(false);
    }, 160);
  }

  return (
    <Stack spacing={2}>
      {!hasToken && (
        <Alert severity="warning">
          Mapbox is not configured yet. Add your public Mapbox token to <strong>.env.local</strong>, restart the app, then choose a verified address.
        </Alert>
      )}

      <Box sx={{ position: "relative" }}>
        <TextField
          label="Verified street address"
          name="addressLine1"
          value={addressSearchValue}
          onChange={(event) => handleAddressInputChange(event.target.value)}
          onFocus={handleAddressFieldFocus}
          onBlur={handleAddressFieldBlur}
          placeholder="Start typing the storage address"
          fullWidth
          disabled={disabled || !hasToken}
          error={Boolean(searchError)}
          helperText={
            searchError ||
            (hasToken
              ? isVerified
                ? `Verified from Mapbox: ${selectedAddressLabel}`
                : "Start typing, then choose one of the Mapbox suggestions to verify this address."
              : "Add REACT_APP_MAPBOX_TOKEN to .env.local to enable verified address search.")
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PlaceRoundedIcon />
              </InputAdornment>
            ),
            endAdornment: isSearching ? (
              <InputAdornment position="end">
                <CircularProgress color="inherit" size={20} />
              </InputAdornment>
            ) : null,
          }}
          inputProps={{ autoComplete: "off" }}
        />

        {showOptions && addressOptions.length > 0 && !disabled && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              right: 0,
              top: "calc(100% - 18px)",
              overflow: "hidden",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <List disablePadding>
              {addressOptions.map((option, index) => (
                <React.Fragment key={option.id || option.place_name || index}>
                  <ListItemButton
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleAddressSelected(option)}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemText
                      primary={option.text || getOptionLabel(option)}
                      secondary={option.place_name}
                      primaryTypographyProps={{ fontWeight: 800 }}
                      secondaryTypographyProps={{ color: "text.secondary" }}
                    />
                  </ListItemButton>
                  {index < addressOptions.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      <TextField
        label="Unit, suite, or access note (optional)"
        name="addressLine2"
        value={address?.addressLine2 || ""}
        onChange={(event) =>
          handleEditableAddressFieldChange("addressLine2", event.target.value)
        }
        placeholder="Example: Garage behind house, Unit B, west door"
        fullWidth
        disabled={disabled}
        inputProps={{ autoComplete: "shipping address-line2" }}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1.3fr 0.7fr 0.8fr" },
          gap: 2,
        }}
      >
        <TextField
          label="City"
          value={address?.city || ""}
          onChange={(event) =>
            handleEditableAddressFieldChange("city", event.target.value)
          }
          placeholder="City"
          disabled={disabled}
          inputProps={{ autoComplete: "shipping address-level2" }}
          fullWidth
        />
        <TextField
          label="State"
          value={address?.state || ""}
          onChange={(event) =>
            handleEditableAddressFieldChange("state", event.target.value)
          }
          placeholder="State"
          disabled={disabled}
          inputProps={{ autoComplete: "shipping address-level1", maxLength: 2 }}
          fullWidth
        />
        <TextField
          label="ZIP"
          value={address?.postalCode || ""}
          onChange={(event) =>
            handleEditableAddressFieldChange("postalCode", event.target.value)
          }
          placeholder="ZIP"
          disabled={disabled}
          inputProps={{ autoComplete: "shipping postal-code", inputMode: "numeric" }}
          fullWidth
        />
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          icon={isVerified ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
          label={isVerified ? "Address verified with Mapbox" : "Address not verified yet"}
          color={isVerified ? "success" : "warning"}
          variant={isVerified ? "filled" : "outlined"}
          sx={{ fontWeight: 800 }}
        />

        {isVerified && (
          <Typography variant="body2" color="text.secondary">
            Public location preview: {address?.displayLocation || "Location selected"}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

export default VerifiedAddressField;
