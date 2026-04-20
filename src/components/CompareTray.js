import { Link } from 'react-router-dom';

function CompareTray({ listings, onToggleCompare, onClearCompare }) {
  return (
    <section className="compare-tray">
      <div className="compare-tray-header">
        <div>
          <h2>Compare Listings</h2>
          <p className="results-subtext">
            Compare up to 3 listings side by side.
          </p>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={onClearCompare}
        >
          Clear all
        </button>
      </div>

      <div className="compare-grid">
        {listings.map((listing) => (
          <div key={listing.id} className="compare-card">
            <div className="compare-card-top">
              <h3>{listing.title}</h3>
              <button
                type="button"
                className="text-button"
                onClick={() => onToggleCompare(listing.id)}
              >
                Remove
              </button>
            </div>

            <div className="compare-card-body">
              <p><strong>Price:</strong> {listing.price}</p>
              <p><strong>Type:</strong> {listing.type}</p>
              <p><strong>Size:</strong> {listing.size}</p>
              <p><strong>Location:</strong> {listing.location}</p>
              <p><strong>Access:</strong> {listing.access}</p>
              <p><strong>Availability:</strong> {listing.availability}</p>
              <p>
                <strong>Rating:</strong>{' '}
                {listing.reviewCount > 0
                  ? `${listing.averageRating.toFixed(1)} (${listing.reviewCount})`
                  : 'No reviews yet'}
              </p>
            </div>

            <Link to={`/listing/${listing.id}`} className="secondary-button">
              Open Details
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CompareTray;