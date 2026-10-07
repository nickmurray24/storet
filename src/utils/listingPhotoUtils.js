// Move the original File or URL; never resize or re-encode the photo.
export function moveListingPhoto(items, fromIndex, toIndex) {
  if (!Array.isArray(items) || fromIndex < 0 || fromIndex >= items.length ||
      toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return items;
  const nextItems = [...items];
  const [photo] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, photo);
  return nextItems;
}

export function getOrderedListingPhotos(listing = {}) {
  return Array.from(new Set([
    ...(Array.isArray(listing.images) ? listing.images : []),
    listing.imageUrl || listing.coverImageUrl,
  ].filter(Boolean)));
}
