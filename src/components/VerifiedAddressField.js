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
  getTypedAddressUnit,
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
  const [searchIsActive, setSearchIsActive] = useState(false);

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
    // Only search while the user is editing an unverified street address.
    // Selecting a result updates the input too, but must not start another lookup.
    if (!hasToken || disabled || !searchIsActive || isVerified) {
      setAddressOptions([]);
      setIsSearching(false);
      setShowOptions(false);
      return undefined;
    }

    const trimmedQuery = addressSearchValue.trim();

    if (trimmedQuery.length < 3) {
      setShowOptions(false);
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
  }, [addressSearchValue, disabled, hasToken, searchIsActive, isVerified]);

  const selectedAddressLabel = useMemo(() => {
    return address?.formattedAddress || address?.addressLine1 || "";
  }, [address?.addressLine1, address?.formattedAddress]);

  function handleAddressInputChange(nextValue) {
    setAddressSearchValue(nextValue);
    setAddressOptions([]);
    setSearchIsActive(true);
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
    nextAddress.addressLine2 = nextAddress.addressLine2 ||
      getTypedAddressUnit(addressSearchValue, nextAddress.addressLine1) || address?.addressLine2 || "";
    if (nextAddress.addressLine2) {
      nextAddress.formattedAddress = [nextAddress.addressLine1, nextAddress.addressLine2,
        nextAddress.city, [nextAddress.state, nextAddress.postalCode].filter(Boolean).join(" ")]
        .filter(Boolean).join(", ");
    }
    const nextSearchLabel = nextAddress.addressLine1 || getOptionLabel(selectedFeature);

    setSearchIsActive(false);
    setIsSearching(false);
    setAddressSearchValue(nextSearchLabel);
    setAddressOptions([]);
    setShowOptions(false);
    setSearchError("");

    onAddressSelected?.(nextAddress);
  }

  function handleEditableAddressFieldChange(fieldName, value) {
    const nextAddress = {
      ...address,
      [fieldName]: fieldName === "state" ? value.toUpperCase() : value,
    };

    if (fieldName === "city" || fieldName === "state" || !nextAddress.displayLocation) {
      nextAddress.displayLocation = buildDisplayLocation({
        city: nextAddress.city,
        state: nextAddress.state,
        country: nextAddress.country,
        fallback: nextAddress.displayLocation || nextAddress.location,
      });
    }

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

    setSearchIsActive(!isVerified);
    if (!isVerified && addressOptions.length > 0) {
      setShowOptions(true);
    }
  }

  function handleAddressFieldBlur() {
    hideOptionsTimer.current = window.setTimeout(() => {
      setSearchIsActive(false);
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
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchIsActive(false);
              setShowOptions(false);
              event.stopPropagation();
            }
          }}
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

        {searchIsActive && !isVerified && showOptions && addressOptions.length > 0 && !disabled && (
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
        helperText="Check any unit copied from your street address. You can edit or clear it here."
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

      <Chip
        icon={isVerified ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}
        label={isVerified ? "Address verified with Mapbox" : "Address not verified yet"}
        color={isVerified ? "success" : "warning"}
        variant={isVerified ? "filled" : "outlined"}
        sx={{ alignSelf: "flex-start", maxWidth: "100%", fontWeight: 800, height: "auto", py: 0.5,
          "& .MuiChip-label": { whiteSpace: "normal" } }}
      />

      <Box component="section" aria-label="Public location preview"
        sx={{ p: { xs: 2, sm: 2.5 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "action.hover" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box sx={{ display: "grid", placeItems: "center", width: 38, height: 38, flexShrink: 0,
            borderRadius: 2, bgcolor: "background.paper", color: "primary.main" }}>
            <PlaceRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 800 }}>Public location preview</Typography>
            <Typography variant={isVerified ? "h6" : "body2"} color={isVerified ? "text.primary" : "text.secondary"}
              sx={{ mt: 0.5, fontWeight: isVerified ? 800 : 400, overflowWrap: "anywhere" }}>
              {isVerified ? address?.displayLocation || buildDisplayLocation({ city: address?.city, state: address?.state, country: address?.country }) || "Location selected"
                : "Select an address to preview the area."}
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6 }}>
          Renters see this city or neighborhood when browsing your listing. It’s a general area label, separate from the street address and unit/access notes above.
        </Typography>
      </Box>
    </Stack>
  );
}

export default VerifiedAddressField;
