import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
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

function MapViewportController({ listings, selectedListingId }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) {
      map.setView(DEFAULT_CENTER, 11);
      return;
    }

    const selectedListing = listings.find(
      (listing) => listing.id === selectedListingId
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

    if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 13);
      return;
    }

    const validPoints = listings
      .filter(hasCoordinates)
      .map((listing) => [listing.latitude, listing.longitude]);

    if (validPoints.length === 0) {
      map.setView(DEFAULT_CENTER, 11);
      return;
    }

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 13);
      return;
    }

    const bounds = L.latLngBounds(validPoints);

    map.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [listings, selectedListingId, map]);

  return null;
}

function MapPlaceholder({ listings, selectedListingId, onSelectListing }) {
  const mappedListings = useMemo(
    () => listings.filter(hasCoordinates),
    [listings]
  );

  const selectedListing =
    listings.find((listing) => listing.id === selectedListingId) || null;

  const hiddenCount = listings.length - mappedListings.length;

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

        {mappedListings.length > 0 ? (
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
            />

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
              Add latitude and longitude to listings to place them on the live
              map.
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