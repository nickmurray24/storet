import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import NoPhotographyRoundedIcon from "@mui/icons-material/NoPhotographyRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { buildListingPath } from "../routes/appRoutes";
import {
  getDefaultMapCenter,
  getDefaultMapZoom,
  getListingCoordinates,
  getListingPreviewImage,
  getMapBoundsForListings,
  getMapCenterForListings,
  getMapboxTileLayer,
  getMapboxToken,
  getPublicListingLocation,
  searchMapboxPlaces,
} from "../utils/mapUtils";

const listingMarkerIcon = L.divIcon({
  className: "storet-listing-marker",
  html: `
    <div style="
      width: 42px;
      height: 42px;
      border-radius: 999px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 16px 32px rgba(37, 99, 235, 0.34);
      border: 4px solid white;
      font-weight: 900;
      font-size: 16px;
      letter-spacing: -0.03em;
    ">$</div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -24],
});

function getClusterMarkerIcon(count) {
  const displayCount = count > 99 ? "99+" : String(count);
  const size = count >= 10 ? 50 : 46;

  return L.divIcon({
    className: "storet-listing-cluster-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 999px;
        background: linear-gradient(135deg, #1d4ed8, #0f766e);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 18px 42px rgba(37, 99, 235, 0.38);
        border: 4px solid white;
        font-weight: 950;
        font-size: 15px;
        letter-spacing: -0.03em;
      ">${displayCount}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildListingClusters(listings, map) {
  const zoom = map.getZoom();

  if (zoom >= 17) {
    return listings.map((listing) => ({
      type: "single",
      id: `single-${listing.id}`,
      listing,
    }));
  }

  const clusterRadius = zoom <= 10 ? 64 : zoom <= 12 ? 58 : zoom <= 14 ? 52 : 44;
  const clusters = [];

  listings.forEach((listing) => {
    const coordinates = getListingCoordinates(listing);

    if (!coordinates) {
      return;
    }

    const point = map.latLngToLayerPoint(L.latLng(coordinates[0], coordinates[1]));
    const nearbyCluster = clusters.find((cluster) => {
      if (cluster.type !== "cluster") {
        return false;
      }

      return point.distanceTo(cluster.point) <= clusterRadius;
    });

    if (nearbyCluster) {
      nearbyCluster.listings.push(listing);
      nearbyCluster.count += 1;
      nearbyCluster.latSum += coordinates[0];
      nearbyCluster.lngSum += coordinates[1];
      nearbyCluster.point = L.point(
        (nearbyCluster.point.x * (nearbyCluster.count - 1) + point.x) / nearbyCluster.count,
        (nearbyCluster.point.y * (nearbyCluster.count - 1) + point.y) / nearbyCluster.count
      );
      nearbyCluster.position = [
        nearbyCluster.latSum / nearbyCluster.count,
        nearbyCluster.lngSum / nearbyCluster.count,
      ];
      nearbyCluster.bounds.extend(L.latLng(coordinates[0], coordinates[1]));
      return;
    }

    const existingSingleIndex = clusters.findIndex((cluster) => {
      if (cluster.type !== "single") {
        return false;
      }

      return point.distanceTo(cluster.point) <= clusterRadius;
    });

    if (existingSingleIndex >= 0) {
      const existingSingle = clusters[existingSingleIndex];
      const existingCoordinates = getListingCoordinates(existingSingle.listing);
      const bounds = L.latLngBounds([
        L.latLng(existingCoordinates[0], existingCoordinates[1]),
        L.latLng(coordinates[0], coordinates[1]),
      ]);

      clusters[existingSingleIndex] = {
        type: "cluster",
        id: `cluster-${existingSingle.listing.id}-${listing.id}`,
        listings: [existingSingle.listing, listing],
        count: 2,
        latSum: existingCoordinates[0] + coordinates[0],
        lngSum: existingCoordinates[1] + coordinates[1],
        point: L.point((existingSingle.point.x + point.x) / 2, (existingSingle.point.y + point.y) / 2),
        position: [
          (existingCoordinates[0] + coordinates[0]) / 2,
          (existingCoordinates[1] + coordinates[1]) / 2,
        ],
        bounds,
      };
      return;
    }

    clusters.push({
      type: "single",
      id: `single-${listing.id}`,
      listing,
      point,
    });
  });

  return clusters;
}

function listingIsInsideBounds(listing, bounds) {
  const coordinates = getListingCoordinates(listing);

  if (!coordinates || !bounds) {
    return false;
  }

  return bounds.contains(L.latLng(coordinates[0], coordinates[1]));
}

function ListingImageArea({ listing, height = 92, fallbackText = "No images available" }) {
  const imageUrl = getListingPreviewImage(listing);

  return (
    <Box
      sx={{
        height,
        bgcolor: "primary.main",
        overflow: "hidden",
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={listing.title}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            color: "#ffffff",
            textAlign: "center",
            px: 2,
          }}
        >
          <NoPhotographyRoundedIcon
            sx={{
              fontSize: height > 100 ? 32 : 28,
              display: "block",
              opacity: 0.96,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {fallbackText}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function MapUpdater({ listings, selectedPlace }) {
  const map = useMap();
  const hasFitBounds = useRef(false);

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const firstTimer = window.setTimeout(invalidate, 100);
    const secondTimer = window.setTimeout(invalidate, 450);
    const thirdTimer = window.setTimeout(invalidate, 900);

    window.addEventListener("resize", invalidate);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      window.clearTimeout(thirdTimer);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);

  useEffect(() => {
    if (selectedPlace?.center) {
      map.flyTo(selectedPlace.center, 13, { duration: 0.8 });
      return;
    }

    if (hasFitBounds.current) {
      return;
    }

    const bounds = getMapBoundsForListings(listings);

    if (bounds?.length > 1) {
      map.fitBounds(bounds, {
        paddingTopLeft: [420, 90],
        paddingBottomRight: [90, 90],
        maxZoom: 13,
      });
      hasFitBounds.current = true;
      return;
    }

    if (bounds?.length === 1) {
      map.setView(bounds[0], 13);
      hasFitBounds.current = true;
    }
  }, [listings, map, selectedPlace]);

  return null;
}

function ListingPopup({
  listing,
  isSaved,
  isAuthenticated,
  onSaveClick,
  onPopupMouseEnter,
  onPopupMouseLeave,
}) {
  const listingPath = buildListingPath(listing.id);
  const rating = Number(listing.rating || listing.averageRating || 0);
  const location = getPublicListingLocation(listing);

  return (
    <Card
      elevation={10}
      onMouseEnter={onPopupMouseEnter}
      onMouseLeave={onPopupMouseLeave}
      sx={{
        width: 300,
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "0 22px 60px rgba(15, 23, 42, 0.22)",
      }}
    >
      <ListingImageArea listing={listing} height={92} />

      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.35}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              label={listing.storageType || "Storage"}
              size="small"
              sx={{ fontWeight: 900 }}
            />
            {listing.instantBook && (
              <Chip
                icon={<BoltRoundedIcon />}
                label="Instant"
                size="small"
                sx={{ fontWeight: 900 }}
              />
            )}
          </Stack>

          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={950}
              lineHeight={1.15}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {listing.title}
            </Typography>
            <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.75 }}>
              <PlaceRoundedIcon color="action" sx={{ fontSize: 17 }} />
              <Typography color="text.secondary" variant="body2" noWrap>
                {location}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              label={listing.startingPriceDisplay || "View rates"}
              size="small"
              color="primary"
              sx={{ fontWeight: 900 }}
            />
            {Number(listing.sqft) > 0 && (
              <Chip
                icon={<StraightenRoundedIcon />}
                label={`${Number(listing.sqft).toLocaleString()} sq ft`}
                size="small"
                sx={{ fontWeight: 900 }}
              />
            )}
            {rating > 0 && (
              <Stack direction="row" spacing={0.35} alignItems="center">
                <StarRoundedIcon fontSize="small" sx={{ color: "warning.main" }} />
                <Typography variant="body2" fontWeight={900}>
                  {rating.toFixed(1)}
                </Typography>
              </Stack>
            )}
          </Stack>

          {listing.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: "100%" }}
            >
              {listing.description}
            </Typography>
          )}

          <Divider />

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={RouterLink}
              to={listingPath}
              variant="contained"
              size="small"
              endIcon={<ArrowForwardRoundedIcon />}
              fullWidth
              sx={{
                borderRadius: 999,
                fontWeight: 900,
                py: 0.95,
                color: "#ffffff !important",
                '&:hover': {
                  color: "#ffffff !important",
                },
              }}
            >
              View listing
            </Button>
            <Button
              variant={isSaved ? "contained" : "outlined"}
              size="small"
              onClick={(event) => onSaveClick(event, listing.id)}
              aria-label={!isAuthenticated ? "Sign in to save" : isSaved ? "Saved" : "Save"}
              sx={{
                borderRadius: 999,
                minWidth: 42,
                width: 42,
                height: 38,
                p: 0,
              }}
            >
              {isSaved ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PlaceSearch({ onSelectPlace }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const mapboxToken = getMapboxToken();

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 3 || !mapboxToken) {
      setResults([]);
      setSearchError("");
      setIsSearching(false);
      return undefined;
    }

    let isActive = true;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const places = await searchMapboxPlaces(trimmedQuery);
        if (isActive) {
          setResults(places);
          setSearchError("");
        }
      } catch (error) {
        if (isActive) {
          setSearchError(error.message || "Unable to search places right now.");
          setResults([]);
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [mapboxToken, query]);

  function handleSelectPlace(place) {
    setQuery(place.label);
    setResults([]);
    onSelectPlace(place);
  }

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label="Search map area"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        fullWidth
        disabled={!mapboxToken}
        size="small"
        helperText={
          mapboxToken
            ? "Search a city, neighborhood, ZIP, or address."
            : "Add REACT_APP_MAPBOX_TOKEN to enable map search."
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon />
            </InputAdornment>
          ),
          endAdornment: isSearching ? (
            <InputAdornment position="end">
              <CircularProgress size={18} />
            </InputAdornment>
          ) : null,
        }}
      />

      {(results.length > 0 || searchError) && (
        <Paper
          elevation={12}
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% - 8px)",
            zIndex: 1700,
            overflow: "hidden",
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {searchError ? (
            <Box sx={{ p: 2 }}>
              <Typography color="error" variant="body2">
                {searchError}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {results.map((place) => (
                <ListItemButton key={place.id} onClick={() => handleSelectPlace(place)}>
                  <PlaceRoundedIcon fontSize="small" color="action" sx={{ mr: 1.5 }} />
                  <ListItemText
                    primary={place.shortLabel}
                    secondary={place.label}
                    primaryTypographyProps={{ fontWeight: 900 }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}


function MapViewportTracker({ onViewportChanged }) {
  const map = useMap();
  const hasSettledRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hasSettledRef.current = true;
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  function handleViewportChanged() {
    if (!hasSettledRef.current) {
      return;
    }

    onViewportChanged(map.getBounds().pad(0.15));
  }

  useMapEvent("dragend", handleViewportChanged);
  useMapEvent("zoomend", handleViewportChanged);

  return null;
}


function ListingMarker({
  listing,
  isSaved,
  isAuthenticated,
  onSaveClick,
  pinnedListingId,
  onPinListing,
  onUnpinListing,
}) {
  const markerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const coordinates = getListingCoordinates(listing);
  const markerId = String(listing.id);
  const isPinned = pinnedListingId === markerId;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPinned) {
      markerRef.current?.openPopup();
    }
  }, [isPinned]);

  if (!coordinates) {
    return null;
  }

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openHoverPopup() {
    clearCloseTimer();
    markerRef.current?.openPopup();
  }

  function closeHoverPopup() {
    if (isPinned) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      markerRef.current?.closePopup();
    }, 180);
  }

  function handlePopupMouseEnter() {
    clearCloseTimer();
  }

  function handlePopupMouseLeave() {
    if (!isPinned) {
      markerRef.current?.closePopup();
    }
  }

  return (
    <Marker
      ref={markerRef}
      position={coordinates}
      icon={listingMarkerIcon}
      eventHandlers={{
        mouseover: openHoverPopup,
        focus: openHoverPopup,
        mouseout: closeHoverPopup,
        click: (event) => {
          L.DomEvent.stopPropagation(event.originalEvent || event);
          clearCloseTimer();
          onPinListing(markerId);
          markerRef.current?.openPopup();
        },
      }}
    >
      <Popup
        className="storet-map-popup"
        closeButton={isPinned}
        autoPan
        keepInView
        autoPanPaddingTopLeft={[24, 96]}
        autoPanPaddingBottomRight={[24, 24]}
        eventHandlers={{
          remove: () => onUnpinListing(markerId),
        }}
      >
        <ListingPopup
          listing={listing}
          isSaved={isSaved}
          isAuthenticated={isAuthenticated}
          onSaveClick={onSaveClick}
          onPopupMouseEnter={handlePopupMouseEnter}
          onPopupMouseLeave={handlePopupMouseLeave}
        />
      </Popup>
    </Marker>
  );
}

function ClusteredListingMarkers({
  listings,
  savedIdSet,
  isAuthenticated,
  onSaveClick,
  pinnedListingId,
  onPinListing,
  onUnpinListing,
}) {
  const map = useMap();
  const [clusters, setClusters] = useState(() => []);

  useEffect(() => {
    let animationFrameId = null;

    function updateClusters() {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        setClusters(buildListingClusters(listings, map));
      });
    }

    updateClusters();
    map.on("moveend zoomend resize", updateClusters);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      map.off("moveend zoomend resize", updateClusters);
    };
  }, [listings, map]);

  return (
    <>
      {clusters.map((cluster, index) => {
        if (cluster.type === "cluster") {
          return (
            <Marker
              key={`${cluster.id}-${index}-${cluster.count}`}
              position={cluster.position}
              icon={getClusterMarkerIcon(cluster.count)}
              eventHandlers={{
                click: (event) => {
                  L.DomEvent.stopPropagation(event.originalEvent || event);
                  const nextZoom = Math.min(map.getZoom() + 2, 18);
                  const isCompactMap = map.getSize().x < 700;

                  map.fitBounds(cluster.bounds, {
                    paddingTopLeft: isCompactMap ? [60, 96] : [420, 96],
                    paddingBottomRight: [96, 96],
                    maxZoom: nextZoom,
                  });
                },
              }}
            />
          );
        }

        const isSaved = savedIdSet.has(String(cluster.listing.id));

        return (
          <ListingMarker
            key={cluster.listing.id}
            listing={cluster.listing}
            isSaved={isSaved}
            isAuthenticated={isAuthenticated}
            onSaveClick={onSaveClick}
            pinnedListingId={pinnedListingId}
            onPinListing={onPinListing}
            onUnpinListing={onUnpinListing}
          />
        );
      })}
    </>
  );
}

function MapClickHandler({ onMapClick }) {
  useMapEvent("click", onMapClick);
  return null;
}

function ExploreMapView({
  listings,
  filterPanel,
  savedIdSet,
  onSaveClick,
  isAuthenticated,
  viewToggle,
}) {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [pinnedListingId, setPinnedListingId] = useState(null);
  const [pendingAreaBounds, setPendingAreaBounds] = useState(null);
  const [activeAreaBounds, setActiveAreaBounds] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allMapListings = useMemo(
    () => listings.filter((listing) => Boolean(getListingCoordinates(listing))),
    [listings]
  );

  const mapListings = useMemo(() => {
    if (!activeAreaBounds) {
      return allMapListings;
    }

    return allMapListings.filter((listing) => listingIsInsideBounds(listing, activeAreaBounds));
  }, [activeAreaBounds, allMapListings]);


  const mapCenter = selectedPlace?.center || getMapCenterForListings(allMapListings);
  const tileLayer = getMapboxTileLayer();
  const hiddenPinCount = listings.length - allMapListings.length;

  function handleMapBackgroundClick() {
    setPinnedListingId(null);
  }

  function handlePinListing(listingId) {
    setPinnedListingId(listingId);
  }

  function handleUnpinListing(listingId) {
    setPinnedListingId((currentId) => (currentId === listingId ? null : currentId));
  }

  function closePinnedListing() {
    setPinnedListingId(null);
  }

  function handleSelectPlace(place) {
    setSelectedPlace(place);
    setPendingAreaBounds(null);
    setActiveAreaBounds(null);
    closePinnedListing();
  }

  function handleViewportChanged(nextBounds) {
    setPendingAreaBounds(nextBounds);
  }

  function handleSearchThisArea() {
    if (!pendingAreaBounds) {
      return;
    }

    setActiveAreaBounds(pendingAreaBounds);
    setPendingAreaBounds(null);
    closePinnedListing();
  }

  function handleClearAreaSearch() {
    setActiveAreaBounds(null);
    setPendingAreaBounds(null);
    closePinnedListing();
  }

  const filterPanelSx = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    px: 0.5,
    pt: 1.25,
    pr: 1.25,
    pb: 1,
    scrollbarGutter: "stable",
    "& .MuiStack-root": { gap: { xs: "12px", md: "12px" } },
    "& .MuiInputBase-root": { borderRadius: 2.5 },
    "& .MuiFormControl-root": { m: 0 },
    "& .MuiTypography-root": { lineHeight: 1.25 },
  };

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Box
        sx={{
          position: "relative",
          height: { xs: "calc(100vh - 78px)", md: "calc(100vh - 80px)" },
          minHeight: { xs: 560, md: 520 },
          width: "100%",
          bgcolor: "grey.100",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            "& .leaflet-container": {
              width: "100% !important",
              height: "100% !important",
              minHeight: "100%",
              fontFamily: "inherit",
              background: "#eef2f7",
            },
            "& .leaflet-tile": {
              imageRendering: "auto",
            },
            "& .leaflet-control-container .leaflet-top.leaflet-left": {
              top: { xs: 74, md: 20 },
              left: { xs: 16, md: 400 },
            },
            "& .storet-map-popup .leaflet-popup-content-wrapper": {
              borderRadius: "20px !important",
              padding: "0 !important",
              overflow: "visible",
              background: "transparent",
              boxShadow: "none",
            },
            "& .storet-map-popup .leaflet-popup-content": {
              width: "300px !important",
              margin: "0 !important",
            },
            "& .storet-map-popup .leaflet-popup-tip": {
              backgroundColor: "background.paper",
              boxShadow: "0 14px 32px rgba(15, 23, 42, 0.18)",
            },
            "& .storet-map-popup .leaflet-popup-close-button": {
              width: 28,
              height: 28,
              borderRadius: 999,
              top: 8,
              right: 8,
              bgcolor: "rgba(255,255,255,0.94)",
              color: "text.primary !important",
              boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        >
          <MapContainer
            center={mapCenter || getDefaultMapCenter()}
            zoom={getDefaultMapZoom()}
            scrollWheelZoom
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url={tileLayer.url}
              attribution={tileLayer.attribution}
              tileSize={tileLayer.tileSize}
              zoomOffset={tileLayer.zoomOffset}
              maxZoom={tileLayer.maxZoom}
              detectRetina={tileLayer.detectRetina}
            />
            <MapUpdater listings={allMapListings} selectedPlace={selectedPlace} />
            <MapClickHandler onMapClick={handleMapBackgroundClick} />
            <MapViewportTracker onViewportChanged={handleViewportChanged} />

            <ClusteredListingMarkers
              listings={mapListings}
              savedIdSet={savedIdSet}
              isAuthenticated={isAuthenticated}
              onSaveClick={onSaveClick}
              pinnedListingId={pinnedListingId}
              onPinListing={handlePinListing}
              onUnpinListing={handleUnpinListing}
            />
          </MapContainer>
        </Box>

        {viewToggle && (
          <Paper
            elevation={12}
            sx={{
              position: "absolute",
              zIndex: 1100,
              top: { xs: 14, md: 18 },
              right: { xs: 14, md: 22 },
              borderRadius: 999,
              bgcolor: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 18px 48px rgba(15, 23, 42, 0.18)",
            }}
          >
            {viewToggle}
          </Paper>
        )}

        <Button
          variant="contained"
          startIcon={<TuneRoundedIcon />}
          onClick={() => setMobileFiltersOpen(true)}
          sx={{
            position: "absolute",
            zIndex: 1100,
            top: 14,
            left: 14,
            display: { xs: "inline-flex", md: "none" },
            borderRadius: 999,
            px: 2,
            py: 1,
            fontWeight: 950,
            color: "#ffffff !important",
            boxShadow: "0 18px 48px rgba(37, 99, 235, 0.28)",
            '&:hover': { color: "#ffffff !important" },
          }}
        >
          Filters
        </Button>

        {pendingAreaBounds && (
          <Button
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            onClick={handleSearchThisArea}
            sx={{
              position: "absolute",
              zIndex: 1100,
              top: { xs: 74, md: 18 },
              left: "50%",
              transform: "translateX(-50%)",
              borderRadius: 999,
              px: 2.25,
              py: 1,
              fontWeight: 950,
              color: "#ffffff !important",
              boxShadow: "0 18px 48px rgba(37, 99, 235, 0.28)",
              whiteSpace: "nowrap",
              '&:hover': { color: "#ffffff !important" },
            }}
          >
            Search this area
          </Button>
        )}

        <Card
          sx={{
            position: "absolute",
            zIndex: 1000,
            top: { md: 18 },
            left: { md: 18 },
            width: { md: 354 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 22px 62px rgba(15, 23, 42, 0.20)",
            bgcolor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            maxHeight: { md: "calc(100% - 36px)" },
            overflow: "hidden",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
          }}
        >
          <CardContent
            sx={{
              p: { md: 2.15 },
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack spacing={1.55} sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <MapRoundedIcon color="primary" />
                <Box>
                  <Typography variant="h6" lineHeight={1.15}>
                    Map search
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Hover to preview. Click a pin to keep it open.
                  </Typography>
                </Box>
              </Stack>

              <PlaceSearch onSelectPlace={handleSelectPlace} />

              <Divider />

              <Stack direction="row" spacing={1} alignItems="center">
                <TuneRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={950}>
                  Filters
                </Typography>
              </Stack>

              <Box sx={filterPanelSx}>{filterPanel}</Box>
            </Stack>
          </CardContent>
        </Card>

        <Drawer
          anchor="bottom"
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "88vh",
              overflow: "hidden",
            },
          }}
        >
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", maxHeight: "88vh" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <MapRoundedIcon color="primary" />
                <Box>
                  <Typography variant="h6" lineHeight={1.1}>
                    Map search
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Search places and filter spaces.
                  </Typography>
                </Box>
              </Stack>
              <IconButton aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            <Box sx={{ overflowY: "auto", overflowX: "hidden", pr: 0.5, pb: 1 }}>
              <Stack spacing={2}>
                <PlaceSearch onSelectPlace={handleSelectPlace} />
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                  <TuneRoundedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={950}>
                    Filters
                  </Typography>
                </Stack>
                <Box sx={filterPanelSx}>{filterPanel}</Box>
              </Stack>
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={() => setMobileFiltersOpen(false)}
              sx={{
                mt: 1.5,
                borderRadius: 999,
                fontWeight: 950,
                color: "#ffffff !important",
                '&:hover': { color: "#ffffff !important" },
              }}
            >
              Apply filters
            </Button>
          </Box>
        </Drawer>

        <Paper
          elevation={10}
          sx={{
            position: "absolute",
            zIndex: 1000,
            right: { xs: 14, md: 22 },
            bottom: { xs: 14, md: 22 },
            borderRadius: 999,
            px: 1.75,
            py: 1,
            bgcolor: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <PlaceRoundedIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={900}>
              {activeAreaBounds ? `${mapListings.length} in this area` : `${mapListings.length} mapped spaces`}
            </Typography>
            {hiddenPinCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                · {hiddenPinCount} without pins
              </Typography>
            )}
            {activeAreaBounds && (
              <Button size="small" onClick={handleClearAreaSearch} sx={{ borderRadius: 999, fontWeight: 900 }}>
                Clear
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {listings.length > 0 && allMapListings.length === 0 && (
        <Alert severity="info" sx={{ mx: { xs: 2, md: 3 } }}>
          These listings match your filters, but none have verified coordinates yet. New listings created with verified addresses will appear on the map.
        </Alert>
      )}

      {activeAreaBounds && allMapListings.length > 0 && mapListings.length === 0 && (
        <Alert
          severity="info"
          sx={{ mx: { xs: 2, md: 3 } }}
          action={
            <Button color="inherit" size="small" onClick={handleClearAreaSearch}>
              Clear area
            </Button>
          }
        >
          No mapped spaces are inside this searched area. Pan the map and search again, or clear the area search.
        </Alert>
      )}
    </Stack>
  );
}

export default ExploreMapView;
