export const EMPTY_VERIFIED_ADDRESS = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  formattedAddress: "",
  displayLocation: "",
  latitude: null,
  longitude: null,
  addressVerified: false,
  addressPlaceId: "",
  addressAccuracy: "",
};

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function firstValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function cleanStateCode(value = "") {
  return String(value || "")
    .replace(/^US-/i, "")
    .trim()
    .toUpperCase();
}

function getContextItem(context, keys = []) {
  if (!context) {
    return null;
  }

  if (Array.isArray(context)) {
    return (
      context.find((item = {}) =>
        keys.some((key) => String(item.id || "").startsWith(`${key}.`))
      ) || null
    );
  }

  if (typeof context === "object") {
    for (const key of keys) {
      if (context[key]) {
        return context[key];
      }
    }
  }

  return null;
}

function getContextText(context, keys = []) {
  const item = getContextItem(context, keys);

  if (typeof item === "string") {
    return item;
  }

  return firstText(
    item?.name,
    item?.text,
    item?.value,
    item?.region_code,
    item?.short_code?.replace(/^US-/i, "")
  );
}

function getContextStateCode(context) {
  const item = getContextItem(context, ["region", "address_level1"]);

  if (typeof item === "string") {
    return cleanStateCode(item);
  }

  return cleanStateCode(
    firstText(item?.region_code, item?.short_code, item?.name, item?.text)
  );
}

function getFeatureCoordinates(feature = {}) {
  const properties = feature.properties || {};
  const coordinates = properties.coordinates || {};
  const geometryCoordinates = Array.isArray(feature.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  const centerCoordinates = Array.isArray(feature.center) ? feature.center : [];

  const longitude = normalizeCoordinate(
    firstValue(
      coordinates.longitude,
      coordinates.lng,
      coordinates[0],
      geometryCoordinates[0],
      centerCoordinates[0]
    )
  );

  const latitude = normalizeCoordinate(
    firstValue(
      coordinates.latitude,
      coordinates.lat,
      coordinates[1],
      geometryCoordinates[1],
      centerCoordinates[1]
    )
  );

  return { latitude, longitude };
}

function buildAddressLine1(feature = {}, properties = {}) {
  const context = properties.context || feature.context || {};
  const contextAddress = getContextItem(context, ["address"]);
  const contextStreet = getContextItem(context, ["street"]);

  const streetNumber = firstText(
    properties.address_number,
    contextAddress?.address_number,
    contextAddress?.name,
    contextAddress?.text,
    feature.address
  );

  const streetName = firstText(
    properties.street,
    properties.street_name,
    contextStreet?.name,
    contextStreet?.text,
    feature.text
  );

  const combinedStreet = [streetNumber, streetName].filter(Boolean).join(" ");

  return firstText(
    properties.address_line1,
    combinedStreet,
    properties.name,
    properties.feature_name,
    properties.full_address?.split(",")?.[0],
    feature.place_name?.split(",")?.[0],
    properties.place_name?.split(",")?.[0]
  );
}

// Copy only explicit unit markers, and only when the selected street matches.
// A trailing unlabelled number could be a ZIP/house number and is never guessed.
const STREET_WORDS = {
  st: "street", rd: "road", ave: "avenue", av: "avenue", ln: "lane", dr: "drive",
  blvd: "boulevard", ct: "court", pl: "place", cir: "circle", ter: "terrace",
  pkwy: "parkway", hwy: "highway", n: "north", s: "south", e: "east", w: "west",
  ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest",
};

function normalizedStreet(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9/-]+/g, " ").trim()
    .split(/\s+/).map(word => STREET_WORDS[word] || word).join(" ");
}

export function getTypedAddressUnit(searchValue, selectedStreet) {
  const input = String(searchValue || "");
  const pattern = /(?:^|[\s,])((?:apt\.?|apartment|suite|ste\.?|unit)\s+#?\s*([a-z0-9][a-z0-9/-]*)|#\s*([a-z0-9][a-z0-9/-]*))(?=,|\s|$)/gi;
  const chosenStreet = normalizedStreet(selectedStreet);
  if (!chosenStreet) return "";
  for (const match of input.matchAll(pattern)) {
    const withoutUnit = `${input.slice(0, match.index)} ${input.slice(match.index + match[0].length)}`;
    const queryStreet = normalizedStreet(withoutUnit);
    if (queryStreet === chosenStreet || queryStreet.startsWith(`${chosenStreet} `)) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }
  return "";
}

export function buildDisplayLocation({ city, neighborhood, state, country, fallback } = {}) {
  const primaryArea = firstText(neighborhood, city);
  const primary = [primaryArea, state].filter(Boolean).join(", ");

  if (primary) {
    return primary;
  }

  return fallback || country || "";
}

export function mapMapboxAddressFeatureToListingAddress(feature = {}) {
  const properties = feature.properties || {};
  const context = properties.context || feature.context || {};
  const { latitude, longitude } = getFeatureCoordinates(feature);

  const city = firstText(
    properties.address_level2,
    properties.place,
    properties.locality,
    properties.city,
    getContextText(context, ["place", "locality", "district", "address_level2"])
  );

  const neighborhood = firstText(
    properties.neighborhood,
    getContextText(context, ["neighborhood"])
  );

  const state = firstText(
    cleanStateCode(properties.address_level1),
    cleanStateCode(properties.region_code),
    cleanStateCode(properties.region),
    getContextStateCode(context)
  );

  const postalCode = firstText(
    properties.postcode,
    properties.postal_code,
    getContextText(context, ["postcode", "postal_code"])
  );

  const country = firstText(
    properties.country_code?.toUpperCase(),
    properties.country?.toUpperCase?.(),
    getContextText(context, ["country"]),
    "US"
  );

  const addressLine1 = buildAddressLine1(feature, properties);
  const secondaryAddress = properties.secondary_address || getContextItem(context, ["secondary_address"]);
  const addressLine2 = firstText(
    properties.address_line2,
    typeof secondaryAddress === "string" ? secondaryAddress : "",
    secondaryAddress?.name,
    secondaryAddress?.identifier ? [secondaryAddress.designator || "Unit", secondaryAddress.identifier].join(" ") : ""
  );
  const formattedAddress = firstText(
    properties.full_address,
    feature.place_name,
    properties.place_name,
    properties.matching_place_name,
    [addressLine1, city, [state, postalCode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ")
  );

  const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  const addressPlaceId = firstText(
    properties.mapbox_id,
    properties.id,
    feature.id,
    formattedAddress
  );

  return {
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    formattedAddress,
    displayLocation: buildDisplayLocation({
      neighborhood,
      city,
      state,
      country,
      fallback: properties.description || feature.place_name,
    }),
    latitude,
    longitude,
    addressVerified: Boolean(addressPlaceId && addressLine1 && hasCoordinates),
    addressPlaceId,
    addressAccuracy: firstText(
      properties.accuracy,
      properties.match_code?.confidence,
      properties.coordinates?.accuracy,
      feature.relevance ? String(feature.relevance) : "selected-mapbox-suggestion"
    ),
  };
}

export function hasVerifiedCoordinates(address = {}) {
  return (
    Boolean(address.addressVerified) &&
    Number.isFinite(Number(address.latitude)) &&
    Number.isFinite(Number(address.longitude))
  );
}
