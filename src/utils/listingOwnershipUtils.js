// Account identity, rather than the active browsing mode, determines ownership.
export function isListingOwnedByUser(listing, user) {
  if (!listing || !user?.isAuthenticated) return false;
  const userId = String(user.id || user.userId || "").trim();
  const ownerId = String(listing.hostId || listing.host_id || listing.ownerId || listing.owner_id || listing.createdBy || listing.created_by || "").trim();
  if (ownerId && userId && !ownerId.includes("@")) return ownerId === userId;

  // Older local listings can identify their host by email instead of an account id.
  const ownerEmail = String(listing.hostEmail || listing.ownerEmail || (ownerId.includes("@") ? ownerId : "")).trim().toLowerCase();
  const userEmail = String(user.email || "").trim().toLowerCase();
  return Boolean(ownerEmail && userEmail && ownerEmail === userEmail);
}
