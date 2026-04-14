import { Link } from 'react-router-dom';

function SelectedListingPanel({ listing, isSaved, onToggleSave }) {
  if (!listing) {
    return null;
  }

  return (
    <section className="selected-listing-panel">
      <div className="selected-listing-header">
        <div>
          <p className="selected-listing-eyebrow">Selected Listing</p>
          <h2>{listing.title}</h2>
          <p className="selected-listing-location">
            {listing.location} • {listing.type}
          </p>
        </div>

        <div className="selected-listing-price-box">
          <span className="selected-listing-price">{listing.price}</span>
          <span className="selected-listing-availability">
            {listing.availability}
          </span>
        </div>
      </div>

      <div className="selected-listing-body">
        <div className="selected-listing-main">
          <div className="selected-listing-visual">
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="selected-listing-image"
              />
            ) : (
              <div className="selected-listing-image-fallback">
                <span>No listing photo yet</span>
              </div>
            )}
          </div>

          <p className="selected-listing-description">{listing.description}</p>

          <div className="selected-listing-detail-grid">
            <div className="selected-listing-subsection">
              <h3>Storage Details</h3>
              <div className="selected-listing-meta">
                <p><strong>Size:</strong> {listing.size}</p>
                <p><strong>Duration:</strong> {listing.duration}</p>
                <p><strong>Access:</strong> {listing.access}</p>
                <p><strong>Host:</strong> {listing.hostName}</p>
              </div>
            </div>

            <div className="selected-listing-subsection">
              <h3>Security</h3>
              <p className="results-subtext">
                {listing.security || 'No extra security details were added.'}
              </p>
            </div>
          </div>

          {listing.restrictions.length > 0 && (
            <div className="selected-listing-subsection">
              <h3>Restrictions</h3>
              <div className="selected-listing-features">
                {listing.restrictions.map((restriction) => (
                  <span key={restriction} className="feature-pill">
                    {restriction}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="selected-listing-subsection">
            <h3>Features</h3>
            <div className="selected-listing-features">
              {listing.features.map((feature) => (
                <span key={feature} className="feature-pill">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="selected-listing-actions">
          <Link to={`/listing/${listing.id}`} className="primary-button full-width">
            View Details
          </Link>

          <Link
            to={`/listing/${listing.id}`}
            className="secondary-button full-width"
          >
            Reserve or Contact
          </Link>

          <button
            type="button"
            className={`save-button full-width ${isSaved ? 'active' : ''}`}
            onClick={() => onToggleSave(listing.id)}
          >
            {isSaved ? 'Saved to Profile' : 'Save Listing'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default SelectedListingPanel;