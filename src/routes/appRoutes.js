export const APP_ROUTES = {
  home: "/",
  auth: "/auth",
  explore: "/explore",
  createListing: "/create-listing",
  profile: "/profile",
  notifications: "/notifications",
  hostDashboard: "/host-dashboard",
  listingDetails: "/listing/:id",
  checkout: "/checkout/:requestId",
};

export const NAV_ITEMS = [
  { label: "Home", to: APP_ROUTES.home },
  { label: "Explore", to: APP_ROUTES.explore },
  { label: "Notifications", to: APP_ROUTES.notifications, requiresAuth: true },
  { label: "Host", to: APP_ROUTES.hostDashboard, requiresAuth: true },
  { label: "Profile", to: APP_ROUTES.profile, requiresAuth: true },
];

export const HIDDEN_GLOBAL_NAV_ROUTES = [APP_ROUTES.home, APP_ROUTES.auth];

export function buildListingPath(listingId) {
  return `/listing/${listingId}`;
}

export function buildCheckoutPath(requestId) {
  return `/checkout/${requestId}`;
}

export function getRouteIsHiddenFromGlobalNav(pathname) {
  return HIDDEN_GLOBAL_NAV_ROUTES.includes(pathname);
}

export function getSafeRedirectPath(value, fallback = APP_ROUTES.explore) {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
