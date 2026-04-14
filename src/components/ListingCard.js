import { Link } from 'react-router-dom';

function ListingCard({
  listing,
  isSaved,
  onToggleSave,
  isSelected,
  onSelectListing,
}) {
  return (
    <div className={`listing-card ${isSelected ? 'selected' : ''}`}>
      <div className="listing-card-image">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} />
        ) : (
          <div className="listing-image-fallback">
            <span>No Photo Yet</span>
          </div>
        )}
      </div>

      <div className="listing-card-top">
        <span className={`listing-badge ${listing.type.toLowerCase()}`}>
          {listing.type}
        </span>
        <span className="listing-price">{listing.price}</span>
      </div>

      <h3>{listing.title}</h3>
      <p className="listing-location">{listing.location}</p>
      <p className="listing-size">Size: {listing.size}</p>
      <p className="listing-description">{listing.description}</p>

      <div className="listing-card-actions">
        <button
          type="button"
          className={`secondary-button card-select-button ${
            isSelected ? 'active' : ''
          }`}
          onClick={() => onSelectListing(listing.id)}
        >
          {isSelected ? 'Selected on Map' : 'Show on Map'}
        </button>

        <Link to={`/listing/${listing.id}`} className="secondary-button details-link">
          View Details
        </Link>

        <button
          type="button"
          className={`save-button ${isSaved ? 'active' : ''}`}
          onClick={() => onToggleSave(listing.id)}
        >
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ListingCard;