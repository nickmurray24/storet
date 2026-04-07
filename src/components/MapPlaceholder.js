function MapPlaceholder({ listings, selectedListingId, onSelectListing }) {
    const markerPositions = [
      { top: '18%', left: '68%' },
      { top: '62%', left: '58%' },
      { top: '42%', left: '78%' },
      { top: '70%', left: '28%' },
      { top: '28%', left: '38%' },
      { top: '52%', left: '18%' },
      { top: '20%', left: '82%' },
      { top: '76%', left: '72%' },
    ];
  
    const selectedListing =
      listings.find((listing) => listing.id === selectedListingId) || null;
  
    return (
      <section className="map-placeholder">
        <div className="map-overlay-card">
          <p className="map-label">Interactive Map</p>
          <h2>{selectedListing ? selectedListing.title : 'Browse nearby storage'}</h2>
          <p>
            {selectedListing
              ? `${selectedListing.location} • ${selectedListing.price} • ${selectedListing.type}`
              : 'Select a listing card or a marker to connect the map and results.'}
          </p>
        </div>
  
        {listings.map((listing, index) => {
          const position = markerPositions[index % markerPositions.length];
          const isSelected = listing.id === selectedListingId;
  
          return (
            <button
              key={listing.id}
              type="button"
              className={`fake-marker ${isSelected ? 'selected' : ''}`}
              style={position}
              onClick={() => onSelectListing(listing.id)}
              aria-label={`Select ${listing.title}`}
            >
              {index + 1}
            </button>
          );
        })}
      </section>
    );
  }
  
  export default MapPlaceholder;