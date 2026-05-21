import mockListings from "./mockListings";
import { normalizeListingList } from "../utils/listingUtils";

export function getMockListings() {
  return normalizeListingList(mockListings);
}

export function getListingCatalog(userListings = []) {
  return normalizeListingList([...mockListings, ...userListings]);
}

export function getPageListings(listings = [], userListings = []) {
  if (Array.isArray(listings) && listings.length > 0) {
    return normalizeListingList(listings);
  }

  return getListingCatalog(userListings);
}
