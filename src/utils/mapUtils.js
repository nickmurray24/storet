const CINCINNATI_CENTER = [39.1031, -84.512];
const DEFAULT_MAP_ZOOM = 11;
const SEARCH_RESULT_LIMIT = 5;

export function getMapboxToken() {
  return process.env.REACT_APP_MAPBOX_TOKEN || "";
}

export function getDefaultMapCenter() {
  return CINCINNATI_CENTER;
}

export function getDefaultMapZoom() {
  return DEFAULT_MAP_ZOOM;
}

export function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCoordinateFromArray(value, index) {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  return parseCoordinate(value[index]);
}

export function getListingCoordinates(listing = {}) {
  const coordinates = listing.coordinates || listing.coords || listing.geoCoordinates;
  const geoJsonCoordinates = listing.geometry?.coordinates;

  const latitude = parseCoordinate(
    listing.latitude ??
      listing.lat ??
      listing.addressLatitude ??
      listing.address_latitude ??
      coordinates?.latitude ??
      coordinates?.lat ??
      getCoordinateFromArray(coordinates, 0) ??
      getCoordinateFromArray(geoJsonCoordinates, 1)
  );

  const longitude = parseCoordinate(
    listing.longitude ??
      listing.lng ??
      listing.lon ??
      listing.addressLongitude ??
      listing.address_longitude ??
      coordinates?.longitude ??
      coordinates?.lng ??
      coordinates?.lon ??
      getCoordinateFromArray(coordinates, 1) ??
      getCoordinateFromArray(geoJsonCoordinates, 0)
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return [latitude, longitude];
}

export function listingHasCoordinates(listing = {}) {
  return Boolean(getListingCoordinates(listing));
}

export function getMapCenterForListings(listings = []) {
  const firstListingWithCoordinates = listings.find((listing) =>
    listingHasCoordinates(listing)
  );

  return getListingCoordinates(firstListingWithCoordinates) || CINCINNATI_CENTER;
}

export function getMapBoundsForListings(listings = []) {
  const coordinates = listings
    .map((listing) => getListingCoordinates(listing))
    .filter(Boolean);

  if (coordinates.length === 0) {
    return null;
  }

  return coordinates;
}

export function getPublicListingLocation(listing = {}) {
  return (
    listing.displayLocation ||
    listing.location ||
    [listing.city, listing.state].filter(Boolean).join(", ") ||
    "Location available after booking"
  );
}

export function getListingPreviewImage(listing = {}) {
  return (
    listing.coverImageUrl ||
    listing.imageUrl ||
    (Array.isArray(listing.images) ? listing.images[0] : "") ||
    ""
  );
}

export function getMapboxTileLayer() {
  const token = getMapboxToken();

  if (!token) {
    return {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      detectRetina: true,
      maxZoom: 19,
    };
  }

  return {
    // Request high-DPI 512px imagery for each 256px Leaflet tile. This keeps
    // labels and streets sharper than stretching standard-resolution tiles.
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 22,
    detectRetina: false,
  };
}

function mapMapboxFeatureToPlace(feature = {}) {
  const center = Array.isArray(feature.center)
    ? feature.center
    : Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry.coordinates
      : null;

  if (!center || center.length < 2) {
    return null;
  }

  const longitude = parseCoordinate(center[0]);
  const latitude = parseCoordinate(center[1]);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    id: feature.id || feature.place_name || `${latitude}-${longitude}`,
    label: feature.place_name || feature.text || "Map location",
    shortLabel: feature.text || feature.place_name || "Map location",
    center: [latitude, longitude],
    longitude,
    latitude,
  };
}

export async function searchMapboxPlaces(query, options = {}) {
  const token = getMapboxToken();
  const trimmedQuery = query.trim();

  if (!token || trimmedQuery.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: String(options.limit || SEARCH_RESULT_LIMIT),
    country: options.country || "us",
    types: options.types || "place,locality,neighborhood,address,postcode",
  });

  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    trimmedQuery
  )}.json?${params.toString()}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("Unable to search map locations right now.");
  }

  const data = await response.json();
  return (data.features || [])
    .map((feature) => mapMapboxFeatureToPlace(feature))
    .filter(Boolean);
}
