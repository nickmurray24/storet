import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

const DEFAULT_CENTER = [39.9612, -82.9988];

function hasCoordinates(listing) {
  return (
    typeof listing.latitude === 'number' &&
    Number.isFinite(listing.latitude) &&
    typeof listing.longitude === 'number' &&
    Number.isFinite(listing.longitude)
  );
}

function hasSearchCenter(searchCenter) {
  return (
    searchCenter &&
    typeof searchCenter.latitude === 'number' &&
    Number.isFinite(searchCenter.latitude) &&
    typeof searchCenter.longitude === 'number' &&
    Number.isFinite(searchCenter.longitude)
  );
}

function MapViewportController({ listings, selectedListingId, searchCenter }) {
  const map = useMap();

  useEffect(() => {
    const validListingPoints = listings
      .filter(hasCoordinates)
      .map((listing) => [listing.latitude, listing.longitude]);

    const hasCenter = hasSearchCenter(searchCenter);

    if (validListingPoints.length === 0 && !hasCenter) {
      map.setView(DEFAULT_CENTER, 11);
      return;
    }

    const selectedListing = listings.find(
      (listing) => listing.id === selectedListingId && hasCoordinates(listing)
    );

    if (selectedListing) {
      map.flyTo(
        [selectedListing.latitude, selectedListing.longitude],
        Math.max(map.getZoom(), 13),
        {
          duration: 0.8,
        }
      );
      return;
    }

    if (validListingPoints.length === 0 && hasCenter) {
      map.setView([searchCenter.latitude, searchCenter.longitude], 12);
      return;
    }

    const allPoints = hasCenter
      ? [
          ...validListingPoints,
          [searchCenter.latitude, searchCenter.longitude],
        ]
      : validListingPoints;

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 13);
      return;
    }

    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [listings, selectedListingId, searchCenter, map]);

  return null;
}

function MapPlaceholder({
  listings,
  selectedListingId,
  onSelectListing,
  searchCenter,
  radiusMiles,
}) {
  const mappedListings = useMemo(
    () => listings.filter(hasCoordinates),
    [listings]
  );

  const selectedListing =
    listings.find((listing) => listing.id === selectedListingId) || null;

  const hiddenCount = listings.length - mappedListings.length;
  const showMap = mappedListings.length > 0 || hasSearchCenter(searchCenter);

  return (
    <section className="real-map-section">
      <div className="real-map-shell">
        <div className="map-overlay-card real-map-overlay">
          <p className="map-label">Live Map</p>
          <h2>{selectedListing ? selectedListing.title : 'Browse nearby storage'}</h2>
          <p>
            {selectedListing
              ? `${selectedListing.location} • ${selectedListing.price} • ${selectedListing.type}`
              : 'Select a listing card or click a marker to connect the map and results.'}
          </p>
        </div>

        {showMap ? (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={11}
            scrollWheelZoom={true}
            className="leaflet-storage-map"
            style={{ height: '460px', width: '100%', borderRadius: '22px' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewportController
              listings={mappedListings}
              selectedListingId={selectedListingId}
              searchCenter={searchCenter}
            />

            {hasSearchCenter(searchCenter) && (
              <>
                <Circle
                  center={[searchCenter.latitude, searchCenter.longitude]}
                  radius={radiusMiles * 1609.34}
                  pathOptions={{
                    color: '#f97316',
                    fillColor: '#fdba74',
                    fillOpacity: 0.12,
                    weight: 2,
                  }}
                />

                <CircleMarker
                  center={[searchCenter.latitude, searchCenter.longitude]}
                  radius={8}
                  pathOptions={{
                    color: '#ea580c',
                    fillColor: '#f97316',
                    fillOpacity: 0.95,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="map-popup-card">
                      <h3>Search Center</h3>
                      <p className="map-popup-meta">
                        {searchCenter.label || 'Chosen renter search point'}
                      </p>
                      <p className="map-popup-copy">
                        Showing listings within {radiusMiles} miles.
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              </>
            )}

            {mappedListings.map((listing) => {
              const isSelected = listing.id === selectedListingId;

              return (
                <CircleMarker
                  key={listing.id}
                  center={[listing.latitude, listing.longitude]}
                  radius={isSelected ? 12 : 9}
                  pathOptions={{
                    color: isSelected ? '#0f172a' : '#2563eb',
                    fillColor: isSelected ? '#0f172a' : '#2563eb',
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onSelectListing(listing.id),
                  }}
                >
                  <Popup>
                    <div className="map-popup-card">
                      <h3>{listing.title}</h3>
                      <p className="map-popup-meta">
                        {listing.location} • {listing.price}
                      </p>
                      {listing.distanceMiles !== null &&
                        listing.distanceMiles !== undefined && (
                          <p className="map-popup-meta">
                            {listing.distanceMiles.toFixed(1)} miles away
                          </p>
                        )}
                      <p className="map-popup-copy">{listing.description}</p>
                      <Link
                        to={`/listing/${listing.id}`}
                        className="secondary-button map-popup-link"
                      >
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="map-empty-state">
            <h3>No mapped listings yet</h3>
            <p>
              Search near an address or add coordinates to listings to place
              them on the live map.
            </p>
          </div>
        )}
      </div>

      {hiddenCount > 0 && (
        <p className="results-subtext map-hidden-note">
          {hiddenCount} listing{hiddenCount !== 1 ? 's are' : ' is'} currently
          hidden from the map because coordinates have not been added yet.
        </p>
      )}
    </section>
  );
}

export default MapPlaceholder;