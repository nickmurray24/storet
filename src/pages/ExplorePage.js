import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SidebarFilters from '../components/SidebarFilters';
import MapPlaceholder from '../components/MapPlaceholder';
import ListingCard from '../components/ListingCard';
import SelectedListingPanel from '../components/SelectedListingPanel';
import HostDashboardPanel from '../components/HostDashboardPanel';

const defaultFilters = {
  location: '',
  listingType: 'All',
  duration: 'Any',
  size: 'Any',
  climateControlled: false,
  alwaysAccess: false,
  availableNowOnly: false,
};

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
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(getInitialModeFromRole(currentUser.role));
  const [filters, setFilters] = useState(defaultFilters);
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedListingId, setSelectedListingId] = useState(
    listings.length > 0 ? listings[0].id : null
  );

  useEffect(() => {
    setMode(getInitialModeFromRole(currentUser.role));
  }, [currentUser.role]);

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
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
  }

  const filteredListings = useMemo(() => {
    const results = listings.filter((listing) => {
      const searchValue = filters.location.trim().toLowerCase();

      const matchesSearch =
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

      return (
        matchesSearch &&
        matchesType &&
        matchesDuration &&
        matchesSize &&
        matchesClimate &&
        matchesAccess &&
        matchesAvailability
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

    return results;
  }, [filters, listings, sortBy]);

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
    filters.location,
    filters.listingType !== 'All',
    filters.duration !== 'Any',
    filters.size !== 'Any',
    filters.climateControlled,
    filters.alwaysAccess,
    filters.availableNowOnly,
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
          />

          <div className="explore-main">
            <MapPlaceholder
              listings={filteredListings}
              selectedListingId={selectedListingId}
              onSelectListing={setSelectedListingId}
            />

            <SelectedListingPanel
              listing={selectedListing}
              isSaved={
                selectedListing
                  ? savedListingIds.includes(selectedListing.id)
                  : false
              }
              onToggleSave={handleProtectedSave}
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
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state-card">
                  <h3>No listings match these filters</h3>
                  <p>
                    Try clearing a few filters or changing the location/keyword
                    search.
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
        />
      )}
    </div>
  );
}

export default ExplorePage;