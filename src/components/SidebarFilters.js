function SidebarFilters({ filters, onChange, onReset }) {
    return (
      <aside className="filters-panel">
        <div className="filters-header">
          <h2>Search Filters</h2>
          <button type="button" className="text-button" onClick={onReset}>
            Reset
          </button>
        </div>
  
        <div className="filter-group">
          <label htmlFor="location">Location or Keyword</label>
          <input
            id="location"
            name="location"
            type="text"
            value={filters.location}
            onChange={onChange}
            placeholder="City, zip, title, or keyword"
          />
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