import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import AddHomeWorkRoundedIcon from "@mui/icons-material/AddHomeWorkRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";

const USER_LISTINGS_KEY = "STORET_USER_LISTINGS";
const CURRENT_USER_KEY = "storet_current_user";

const storageTypes = [
  "Garage",
  "Basement",
  "Spare room",
  "Storage unit",
  "Shed",
  "Warehouse",
  "Other",
];

const accessOptions = [
  "By appointment",
  "Weekly access",
  "Daily access",
  "Limited access",
  "Flexible access",
];

const amenityOptions = [
  "Indoor space",
  "Climate friendly",
  "Private access",
  "Residential space",
  "Commercial partner",
  "Good for boxes",
  "Good for furniture",
  "Student friendly",
  "Short-term friendly",
  "Long-term friendly",
];

function safeReadJson(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function parseNumber(value, fallbackValue) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    const parsedValue = Number(cleanedValue);

    if (!Number.isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return fallbackValue;
}

function CreateListingPage({ currentUser, onAddListing }) {
  const navigate = useNavigate();

  const storedUser = useMemo(
    () =>
      safeReadJson(CURRENT_USER_KEY, {
        fullName: "Demo Host",
        role: "Host",
      }),
    []
  );

  const activeUser = currentUser || storedUser;

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    storageType: "Garage",
    listingType: "Private host",
    price: "",
    sqft: "",
    access: "By appointment",
    bookingType: "instant",
    description: "",
    customTags: "",
  });

  const [selectedAmenities, setSelectedAmenities] = useState([
    "Indoor space",
    "Private access",
    "Good for boxes",
  ]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const previewListing = useMemo(() => {
    const price = parseNumber(formData.price, 85);
    const sqft = parseNumber(formData.sqft, 100);

    return {
      title: formData.title.trim() || "Your storage space",
      location: formData.location.trim() || "Cincinnati, OH",
      storageType: formData.storageType,
      listingType: formData.listingType,
      price,
      sqft,
      access: formData.access,
      instantBook: formData.bookingType === "instant",
      waitlist: formData.bookingType === "waitlist",
      description:
        formData.description.trim() ||
        "A flexible local storage option for renters looking for extra space.",
    };
  }, [formData]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleBookingTypeChange(event, nextValue) {
    if (nextValue) {
      setFormData((currentData) => ({
        ...currentData,
        bookingType: nextValue,
      }));
    }
  }

  function handleAmenityToggle(amenity) {
    setSelectedAmenities((currentAmenities) => {
      if (currentAmenities.includes(amenity)) {
        return currentAmenities.filter((item) => item !== amenity);
      }

      return [...currentAmenities, amenity];
    });
  }

  function buildTags() {
    const customTags = formData.customTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const automaticTags = [
      formData.storageType,
      formData.listingType,
      formData.bookingType === "instant"
        ? "Instant book"
        : formData.bookingType === "waitlist"
        ? "Waitlist"
        : "Request-based",
    ];

    return Array.from(new Set([...automaticTags, ...customTags]));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const title = formData.title.trim();
    const location = formData.location.trim();
    const description = formData.description.trim();
    const price = parseNumber(formData.price, null);
    const sqft = parseNumber(formData.sqft, null);

    if (!title) {
      setError("Please enter a listing title.");
      return;
    }

    if (!location) {
      setError("Please enter a location.");
      return;
    }

    if (!price) {
      setError("Please enter a valid monthly price.");
      return;
    }

    if (!sqft) {
      setError("Please enter a valid square footage.");
      return;
    }

    if (!description) {
      setError("Please add a short description for the space.");
      return;
    }

    const newListing = {
      id: `user-${Date.now()}`,
      title,
      location,
      distance: "New listing",
      price,
      sqft,
      storageType: formData.storageType,
      listingType: formData.listingType,
      access: formData.access,
      rating: 4.8,
      reviews: 0,
      instantBook: formData.bookingType === "instant",
      waitlist: formData.bookingType === "waitlist",
      host: activeUser?.fullName || "Storet Host",
      description,
      tags: buildTags(),
      amenities:
        selectedAmenities.length > 0
          ? selectedAmenities
          : ["Flexible rental", "Local storage", "Host managed"],
      createdAt: new Date().toISOString(),
    };

    const existingListings = safeReadJson(USER_LISTINGS_KEY, []);
    const safeExistingListings = Array.isArray(existingListings)
      ? existingListings
      : [];

    const updatedListings = [newListing, ...safeExistingListings];

    localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(updatedListings));

    if (onAddListing) {
      onAddListing(newListing);
    }

    setSuccessMessage("Listing created successfully!");

    setTimeout(() => {
      navigate(`/listing/${newListing.id}`);
    }, 650);
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Button
              onClick={() => navigate("/explore")}
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              Back to Explore
            </Button>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1.5}>
                <Chip
                  icon={<AddHomeWorkRoundedIcon />}
                  label="Host setup"
                  color="primary"
                  variant="outlined"
                  sx={{ width: "fit-content", fontWeight: 700 }}
                />

                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: "2.25rem", md: "3.35rem" },
                      lineHeight: 1,
                    }}
                  >
                    List your storage space
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1, maxWidth: 680, fontSize: "1.05rem" }}
                  >
                    Add the basic details renters need to understand your space,
                    pricing, access, and booking style.
                  </Typography>
                </Box>
              </Stack>

              <Card sx={{ minWidth: { xs: "100%", md: 260 } }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "secondary.light", color: "secondary.dark" }}>
                      <HomeWorkRoundedIcon />
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800}>
                        {activeUser?.fullName || "Demo Host"}
                      </Typography>
                      <Typography color="text.secondary">Listing as host</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Stack spacing={1}>
                      <Typography variant="h5">Listing basics</Typography>
                      <Typography color="text.secondary">
                        Start with a clear title, location, and storage type.
                      </Typography>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}
                    {successMessage && (
                      <Alert severity="success">{successMessage}</Alert>
                    )}

                    <TextField
                      label="Listing title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Example: Oakley Garage Space"
                      fullWidth
                    />

                    <TextField
                      label="Location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Example: Oakley, Cincinnati, OH"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PlaceRoundedIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Storage type</InputLabel>
                        <Select
                          name="storageType"
                          value={formData.storageType}
                          label="Storage type"
                          onChange={handleInputChange}
                        >
                          {storageTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Listing type</InputLabel>
                        <Select
                          name="listingType"
                          value={formData.listingType}
                          label="Listing type"
                          onChange={handleInputChange}
                        >
                          <MenuItem value="Private host">Private host</MenuItem>
                          <MenuItem value="Commercial">Commercial</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Pricing and size</Typography>
                      <Typography color="text.secondary">
                        Keep the monthly rate and square footage easy to compare.
                      </Typography>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Monthly price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="85"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Square footage"
                        name="sqft"
                        value={formData.sqft}
                        onChange={handleInputChange}
                        placeholder="120"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <StraightenRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>

                    <FormControl fullWidth>
                      <InputLabel>Access style</InputLabel>
                      <Select
                        name="access"
                        value={formData.access}
                        label="Access style"
                        onChange={handleInputChange}
                      >
                        {accessOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Booking style</Typography>
                      <Typography color="text.secondary">
                        Choose how renters should reserve or request the space.
                      </Typography>
                    </Stack>

                    <ToggleButtonGroup
                      value={formData.bookingType}
                      exclusive
                      onChange={handleBookingTypeChange}
                      color="primary"
                      fullWidth
                      sx={{
                        "& .MuiToggleButton-root": {
                          py: 1.25,
                          fontWeight: 700,
                          textTransform: "none",
                        },
                      }}
                    >
                      <ToggleButton value="instant">Instant book</ToggleButton>
                      <ToggleButton value="request">Request</ToggleButton>
                      <ToggleButton value="waitlist">Waitlist</ToggleButton>
                    </ToggleButtonGroup>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="h5">Description and amenities</Typography>
                      <Typography color="text.secondary">
                        Help renters understand what the space is best for.
                      </Typography>
                    </Stack>

                    <TextField
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe the space, what fits well, and any access details."
                      fullWidth
                      multiline
                      minRows={4}
                    />

                    <TextField
                      label="Custom tags"
                      name="customTags"
                      value={formData.customTags}
                      onChange={handleInputChange}
                      placeholder="Example: Indoor, Student friendly, Flexible"
                      helperText="Separate tags with commas."
                      fullWidth
                    />

                    <Box>
                      <Typography fontWeight={800} sx={{ mb: 1 }}>
                        Amenities
                      </Typography>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                          },
                          gap: 1,
                        }}
                      >
                        {amenityOptions.map((amenity) => (
                          <FormControlLabel
                            key={amenity}
                            control={
                              <Checkbox
                                checked={selectedAmenities.includes(amenity)}
                                onChange={() => handleAmenityToggle(amenity)}
                              />
                            }
                            label={amenity}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Divider />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      justifyContent="flex-end"
                    >
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => navigate("/explore")}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={<AddHomeWorkRoundedIcon />}
                      >
                        Create listing
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ width: { xs: "100%", lg: 360 } }}>
            <Card
              sx={{
                position: { lg: "sticky" },
                top: { lg: 96 },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Listing preview</Typography>
                    <Typography color="text.secondary">
                      This is how your space will start appearing in Storet.
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: 4,
                      minHeight: 180,
                      background:
                        previewListing.listingType === "Commercial"
                          ? "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(37, 99, 235, 0.74))"
                          : "linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78))",
                      color: "white",
                      p: 2.5,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Chip
                      label={previewListing.listingType}
                      sx={{
                        width: "fit-content",
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: "text.primary",
                        fontWeight: 700,
                      }}
                    />

                    <Box>
                      <Typography variant="h5">{previewListing.title}</Typography>
                      <Typography sx={{ opacity: 0.9 }}>
                        Hosted by {activeUser?.fullName || "Storet Host"}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1.5}>
                    <PreviewRow
                      icon={<PlaceRoundedIcon />}
                      label="Location"
                      value={previewListing.location}
                    />
                    <PreviewRow
                      icon={<WarehouseRoundedIcon />}
                      label="Type"
                      value={previewListing.storageType}
                    />
                    <PreviewRow
                      icon={<PaymentsRoundedIcon />}
                      label="Monthly price"
                      value={`$${previewListing.price}/mo`}
                    />
                    <PreviewRow
                      icon={<StraightenRoundedIcon />}
                      label="Size"
                      value={`${previewListing.sqft} sq ft`}
                    />
                    <PreviewRow
                      icon={<EventAvailableRoundedIcon />}
                      label="Booking"
                      value={
                        previewListing.instantBook
                          ? "Instant book"
                          : previewListing.waitlist
                          ? "Waitlist"
                          : "Request-based"
                      }
                    />
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {previewListing.description}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {buildTags().map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Stack>

                  <Alert severity="info">
                    Created listings are saved locally for now and will appear on
                    Explore and Listing Details.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function PreviewRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: "primary.light",
          color: "primary.dark",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography fontWeight={800} noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default CreateListingPage;