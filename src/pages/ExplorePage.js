import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SidebarFilters from '../components/SidebarFilters';
import MapPlaceholder from '../components/MapPlaceholder';
import ListingCard from '../components/ListingCard';
import SelectedListingPanel from '../components/SelectedListingPanel';
import HostDashboardPanel from '../components/HostDashboardPanel';

const defaultFilters = {
  keyword: '',
  nearLocation: '',
  radiusMiles: '10',
  listingType: 'All',
  duration: 'Any',
  size: 'Any',
  climateControlled: false,
  alwaysAccess: false,
  availableNowOnly: false,
};

const RECENT_SEARCHES_KEY = 'storet_recent_location_searches';

function getSizeCategory(sizeValue) {
  const normalized = sizeValue.toLowerCase();

  if (normalized.includes('small')) {
    return 'Small';
  }

  if (normalized.includes('10x10') || normalized.includes('large')) {
    return 'Large';
  }

  if (
    normalized.includes('medium') ||
    normalized.includes('5x10') ||
    normalized.includes('small-medium')
  ) {
    return 'Medium';
  }

  return 'Medium';
}

function getInitialModeFromRole(role) {
  if (role === 'Host' || role === 'Both') {
    return 'host';
  }

  return 'renter';
}

function isHostRole(role) {
  return role === 'Host' || role === 'Both';
}

function getPriceValue(price) {
  const numeric = Number(String(price).replace(/[^0-9.]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function getNewestValue(listing) {
  if (listing.createdAt) {
    return new Date(listing.createdAt).getTime();
  }

  return listing.id || 0;
}

function hasCoordinates(listing) {
  return (
    typeof listing.latitude === 'number' &&
    Number.isFinite(listing.latitude) &&
    typeof listing.longitude === 'number' &&
    Number.isFinite(listing.longitude)
  );
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function readRecentSearches() {
  try {
    const storedValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function ExplorePage({
  listings,
  myListings,
  savedListingIds,
  onToggleSave,
  currentUser,
  bookingRequests,
  hostMessages,
  onDeleteListing,
  onToggleListingStatus,
  onUpdateBookingRequestStatus,
  onUpdateHostMessageStatus,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(getInitialModeFromRole(currentUser.role));
  const [filters, setFilters] = useState(defaultFilters);
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedListingId, setSelectedListingId] = useState(
    listings.length > 0 ? listings[0].id : null
  );
  const [searchCenter, setSearchCenter] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [geocodeSuccess, setGeocodeSuccess] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    return readRecentSearches();
  });

  useEffect(() => {
    setMode(getInitialModeFromRole(currentUser.role));
  }, [currentUser.role]);

  useEffect(() => {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recentSearches)
    );
  }, [recentSearches]);

  function redirectToAuth(message) {
    navigate('/auth', {
      state: {
        redirectTo: location.pathname,
        message,
      },
    });
  }

  function handleModeChange(nextMode) {
    if (nextMode === 'host' && !currentUser.isAuthenticated) {
      redirectToAuth('Log in with a Host or Both account to access host tools.');
      return;
    }

    if (nextMode === 'host' && !isHostRole(currentUser.role)) {
      navigate('/auth', {
        state: {
          redirectTo: '/explore',
          message:
            'Host tools require a Host or Both account. Update your role in Profile.',
        },
      });
      return;
    }

    setMode(nextMode);
  }

  function handleProtectedSave(listingId) {
    if (!currentUser.isAuthenticated) {
      redirectToAuth('Log in to save listings to your profile.');
      return;
    }

    onToggleSave(listingId);
  }

  function handleFilterChange(event) {
    const { name, value, type, checked } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'nearLocation') {
      setGeocodeError('');
      setGeocodeSuccess('');
    }
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
    setSearchCenter(null);
    setGeocodeError('');
    setGeocodeSuccess('');
    setSortBy('recommended');
  }

  function saveRecentSearch(search) {
    setRecentSearches((prev) => {
      const withoutDuplicate = prev.filter(
        (item) =>
          !(
            item.label === search.label &&
            item.latitude === search.latitude &&
            item.longitude === search.longitude
          )
      );

      return [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...search,
        },
        ...withoutDuplicate,
      ].slice(0, 6);
    });
  }

  function applySearchCenter(center, successMessage) {
    setSearchCenter(center);
    setFilters((prev) => ({
      ...prev,
      nearLocation: center.label || prev.nearLocation,
    }));
    setGeocodeError('');
    setGeocodeSuccess(successMessage);

    if (sortBy === 'recommended') {
      setSortBy('distance');
    }

    saveRecentSearch(center);
  }

  async function handleFindNearLocation() {
    const query = filters.nearLocation.trim();

    if (!query) {
      setGeocodeError('Enter a place or address first.');
      setGeocodeSuccess('');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError('');
    setGeocodeSuccess('');

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed.');
      }

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        setGeocodeError('No matching search point was found. Try a fuller address.');
        return;
      }

      const bestMatch = results[0];

      applySearchCenter(
        {
          label: bestMatch.display_name || query,
          latitude: Number(bestMatch.lat),
          longitude: Number(bestMatch.lon),
        },
        'Distance search point found.'
      );
    } catch (error) {
      setGeocodeError(
        'Unable to search this location right now. Try again in a moment.'
      );
    } finally {
      setIsGeocoding(false);
    }
  }

  async function reverseGeocode(latitude, longitude) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed.');
    }

    const result = await response.json();
    return result.display_name || 'Current location';
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeocodeError('Your browser does not support location access.');
      setGeocodeSuccess('');
      return;
    }

    setIsLocating(true);
    setGeocodeError('');
    setGeocodeSuccess('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const label = await reverseGeocode(latitude, longitude);

          applySearchCenter(
            {
              label,
              latitude,
              longitude,
            },
            'Using your current location for distance search.'
          );
        } catch (error) {
          applySearchCenter(
            {
              label: 'Current location',
              latitude,
              longitude,
            },
            'Using your current location for distance search.'
          );
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        if (error.code === 1) {
          setGeocodeError('Location permission was denied.');
        } else if (error.code === 2) {
          setGeocodeError('Your location could not be determined.');
        } else if (error.code === 3) {
          setGeocodeError('Location request timed out.');
        } else {
          setGeocodeError('Unable to use your current location.');
        }

        setGeocodeSuccess('');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  function handleChooseRecentSearch(search) {
    applySearchCenter(
      {
        label: search.label,
        latitude: search.latitude,
        longitude: search.longitude,
      },
      'Recent search restored.'
    );
  }

  function handleClearNearLocation() {
    setSearchCenter(null);
    setGeocodeError('');
    setGeocodeSuccess('');
    setFilters((prev) => ({
      ...prev,
      nearLocation: '',
    }));

    if (sortBy === 'distance') {
      setSortBy('recommended');
    }
  }

  const filteredListings = useMemo(() => {
    const radiusMiles = Number(filters.radiusMiles);

    const results = listings
      .map((listing) => {
        const distanceMiles =
          searchCenter && hasCoordinates(listing)
            ? haversineMiles(
                searchCenter.latitude,
                searchCenter.longitude,
                listing.latitude,
                listing.longitude
              )
            : null;

        return {
          ...listing,
          distanceMiles,
        };
      })
      .filter((listing) => {
        const searchValue = filters.keyword.trim().toLowerCase();

        const matchesKeyword =
          searchValue === '' ||
          listing.title.toLowerCase().includes(searchValue) ||
          listing.location.toLowerCase().includes(searchValue) ||
          listing.description.toLowerCase().includes(searchValue) ||
          listing.hostName.toLowerCase().includes(searchValue);

        const matchesType =
          filters.listingType === 'All' || listing.type === filters.listingType;

        const matchesDuration =
          filters.duration === 'Any' || listing.duration === filters.duration;

        const listingSizeCategory = getSizeCategory(listing.size);
        const matchesSize =
          filters.size === 'Any' || listingSizeCategory === filters.size;

        const matchesClimate =
          !filters.climateControlled ||
          listing.features.some((feature) =>
            feature.toLowerCase().includes('climate')
          );

        const matchesAccess =
          !filters.alwaysAccess ||
          listing.access.toLowerCase().includes('24/7');

        const matchesAvailability =
          !filters.availableNowOnly || listing.availability === 'Available now';

        const matchesDistance =
          !searchCenter ||
          (listing.distanceMiles !== null && listing.distanceMiles <= radiusMiles);

        return (
          matchesKeyword &&
          matchesType &&
          matchesDuration &&
          matchesSize &&
          matchesClimate &&
          matchesAccess &&
          matchesAvailability &&
          matchesDistance
        );
      });

    if (sortBy === 'price-low-high') {
      return results.sort((a, b) => getPriceValue(a.price) - getPriceValue(b.price));
    }

    if (sortBy === 'price-high-low') {
      return results.sort((a, b) => getPriceValue(b.price) - getPriceValue(a.price));
    }

    if (sortBy === 'newest') {
      return results.sort((a, b) => getNewestValue(b) - getNewestValue(a));
    }

    if (sortBy === 'alphabetical') {
      return results.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortBy === 'distance') {
      return results.sort(
        (a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity)
      );
    }

    return results;
  }, [filters, listings, searchCenter, sortBy]);

  useEffect(() => {
    if (filteredListings.length === 0) {
      setSelectedListingId(null);
      return;
    }

    const selectedStillVisible = filteredListings.some(
      (listing) => listing.id === selectedListingId
    );

    if (!selectedStillVisible) {
      setSelectedListingId(filteredListings[0].id);
    }
  }, [filteredListings, selectedListingId]);

  const activeFilterCount = [
    filters.keyword,
    filters.listingType !== 'All',
    filters.duration !== 'Any',
    filters.size !== 'Any',
    filters.climateControlled,
    filters.alwaysAccess,
    filters.availableNowOnly,
    Boolean(searchCenter),
  ].filter(Boolean).length;

  const selectedListing =
    filteredListings.find((listing) => listing.id === selectedListingId) || null;

  return (
    <div className="explore-page">
      <div className="explore-topbar">
        <div>
          <h1>{mode === 'renter' ? 'Explore Storage' : 'Host Dashboard'}</h1>
          <p>
            {mode === 'renter'
              ? 'Find commercial units and local spaces available near you.'
              : 'Manage the host side of Storet and create new storage listings.'}
          </p>
        </div>

        <div className="mode-toggle">
          <button
            type="button"
            className={`toggle-button ${mode === 'renter' ? 'active' : ''}`}
            onClick={() => handleModeChange('renter')}
          >
            I need storage
          </button>

          <button
            type="button"
            className={`toggle-button ${mode === 'host' ? 'active' : ''}`}
            onClick={() => handleModeChange('host')}
          >
            I have space
          </button>
        </div>
      </div>

      <div className="user-role-banner">
        <span className="user-role-pill">
          {currentUser.isAuthenticated
            ? `Signed in as ${currentUser.role}`
            : 'Browsing as Guest'}
        </span>
        <p className="results-subtext">
          {currentUser.role === 'Both'
            ? 'You can switch between renter and host views anytime.'
            : currentUser.role === 'Host'
            ? 'Host mode is prioritized for your account, but you can still browse listings.'
            : 'Renter mode is prioritized for your account.'}
        </p>
      </div>

      {mode === 'renter' ? (
        <div className="explore-layout">
          <SidebarFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
            onFindNearLocation={handleFindNearLocation}
            onClearNearLocation={handleClearNearLocation}
            onUseMyLocation={handleUseMyLocation}
            onChooseRecentSearch={handleChooseRecentSearch}
            recentSearches={recentSearches}
            isGeocoding={isGeocoding}
            isLocating={isLocating}
            geocodeError={geocodeError}
            geocodeSuccess={geocodeSuccess}
            searchCenter={searchCenter}
          />

          <div className="explore-main">
            <MapPlaceholder
              listings={filteredListings}
              selectedListingId={selectedListingId}
              onSelectListing={setSelectedListingId}
              searchCenter={searchCenter}
              radiusMiles={Number(filters.radiusMiles)}
            />

            <SelectedListingPanel
              listing={selectedListing}
              isSaved={
                selectedListing
                  ? savedListingIds.includes(selectedListing.id)
                  : false
              }
              onToggleSave={handleProtectedSave}
              distanceMiles={selectedListing?.distanceMiles ?? null}
            />

            <section className="listings-section">
              <div className="section-header results-toolbar">
                <div>
                  <h2>Available Listings</h2>
                  <p className="results-subtext">
                    {filteredListings.length} result
                    {filteredListings.length !== 1 ? 's' : ''}
                    {activeFilterCount > 0
                      ? ` • ${activeFilterCount} filter${
                          activeFilterCount !== 1 ? 's' : ''
                        } active`
                      : ''}
                  </p>
                </div>

                <div className="sort-control">
                  <label htmlFor="sortBy">Sort by</label>
                  <select
                    id="sortBy"
                    className="sort-select"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="recommended">Recommended</option>
                    {searchCenter && <option value="distance">Distance</option>}
                    <option value="newest">Newest</option>
                    <option value="price-low-high">Price: Low to High</option>
                    <option value="price-high-low">Price: High to Low</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>

              {filteredListings.length > 0 ? (
                <div className="listings-grid">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isSaved={savedListingIds.includes(listing.id)}
                      onToggleSave={handleProtectedSave}
                      isSelected={selectedListingId === listing.id}
                      onSelectListing={setSelectedListingId}
                      distanceMiles={listing.distanceMiles}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state-card">
                  <h3>No listings match these filters</h3>
                  <p>
                    Try changing the radius, clearing a few filters, or searching
                    near a different address.
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleResetFilters}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <HostDashboardPanel
          myListings={myListings}
          bookingRequests={bookingRequests}
          hostMessages={hostMessages}
          onDeleteListing={onDeleteListing}
          onToggleListingStatus={onToggleListingStatus}
          onUpdateBookingRequestStatus={onUpdateBookingRequestStatus}
          onUpdateHostMessageStatus={onUpdateHostMessageStatus}
        />
      )}
    </div>
  );
}

export default ExplorePage;