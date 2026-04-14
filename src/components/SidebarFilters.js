function SidebarFilters({
  filters,
  onChange,
  onReset,
  onFindNearLocation,
  onClearNearLocation,
  onUseMyLocation,
  onChooseRecentSearch,
  recentSearches,
  isGeocoding,
  isLocating,
  geocodeError,
  geocodeSuccess,
  searchCenter,
}) {
  return (
    <aside className="filters-panel">
      <div className="filters-header">
        <h2>Search Filters</h2>
        <button type="button" className="text-button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="filter-group">
        <label htmlFor="keyword">Keyword Search</label>
        <input
          id="keyword"
          name="keyword"
          type="text"
          value={filters.keyword}
          onChange={onChange}
          placeholder="City, title, host, or keyword"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="nearLocation">Near Address / Place</label>

        <div className="location-geocode-row">
          <input
            id="nearLocation"
            name="nearLocation"
            type="text"
            value={filters.nearLocation}
            onChange={onChange}
            placeholder="Columbus, OH or a street address"
          />

          <div className="location-action-buttons">
            <button
              type="button"
              className="secondary-button geocode-button"
              onClick={onFindNearLocation}
              disabled={isGeocoding}
            >
              {isGeocoding ? 'Finding...' : 'Find Near'}
            </button>

            <button
              type="button"
              className="secondary-button geocode-button"
              onClick={onUseMyLocation}
              disabled={isLocating}
            >
              {isLocating ? 'Locating...' : 'Use My Location'}
            </button>
          </div>
        </div>

        {geocodeError && <span className="geocode-status error">{geocodeError}</span>}
        {!geocodeError && geocodeSuccess && (
          <span className="geocode-status success">{geocodeSuccess}</span>
        )}

        {searchCenter && (
          <div className="near-search-summary">
            <p className="results-subtext">
              Distance search is active around the selected search point.
            </p>

            <button
              type="button"
              className="text-button"
              onClick={onClearNearLocation}
            >
              Clear near search
            </button>
          </div>
        )}

        {recentSearches.length > 0 && (
          <div className="recent-searches-block">
            <p className="recent-searches-title">Recent location searches</p>

            <div className="recent-searches-list">
              {recentSearches.map((search) => (
                <button
                  key={search.id}
                  type="button"
                  className="recent-search-chip"
                  onClick={() => onChooseRecentSearch(search)}
                >
                  {search.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="radiusMiles">Search Radius</label>
        <select
          id="radiusMiles"
          name="radiusMiles"
          value={filters.radiusMiles}
          onChange={onChange}
        >
          <option value="5">Within 5 miles</option>
          <option value="10">Within 10 miles</option>
          <option value="25">Within 25 miles</option>
          <option value="50">Within 50 miles</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="listingType">Listing Type</label>
        <select
          id="listingType"
          name="listingType"
          value={filters.listingType}
          onChange={onChange}
        >
          <option value="All">All</option>
          <option value="Commercial">Commercial</option>
          <option value="Private">Private</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="duration">Rental Length</label>
        <select
          id="duration"
          name="duration"
          value={filters.duration}
          onChange={onChange}
        >
          <option value="Any">Any</option>
          <option value="Short-term">Short-term</option>
          <option value="Long-term">Long-term</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="size">Storage Size</label>
        <select
          id="size"
          name="size"
          value={filters.size}
          onChange={onChange}
        >
          <option value="Any">Any</option>
          <option value="Small">Small</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large</option>
        </select>
      </div>

      <div className="checkbox-group">
        <label>
          <input
            name="climateControlled"
            type="checkbox"
            checked={filters.climateControlled}
            onChange={onChange}
          />
          Climate controlled
        </label>

        <label>
          <input
            name="alwaysAccess"
            type="checkbox"
            checked={filters.alwaysAccess}
            onChange={onChange}
          />
          24/7 access
        </label>

        <label>
          <input
            name="availableNowOnly"
            type="checkbox"
            checked={filters.availableNowOnly}
            onChange={onChange}
          />
          Available now only
        </label>
      </div>
    </aside>
  );
}

export default SidebarFilters;