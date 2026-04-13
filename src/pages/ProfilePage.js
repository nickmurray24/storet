import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ProfilePage({
  currentUser,
  savedListings,
  myListings,
  savedListingIds,
  onToggleSave,
  bookingRequests = [],
  hostMessages = [],
  onDeleteListing,
  onToggleListingStatus,
}) {
  function handleDelete(listing) {
    const shouldDelete = window.confirm(
      `Delete "${listing.title}"? This will remove it from your listings.`
    );

    if (!shouldDelete) {
      return;
    }

    onDeleteListing(listing.id);
  }

  return (
    <div className="profile-page">
      <div className="page-header-block">
        <h1>My Profile</h1>
        <p>Manage your account, saved spaces, listings, and activity.</p>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <h3>Account</h3>
          <p>Name: {currentUser.fullName}</p>
          <p>Email: {currentUser.email}</p>
          <p>Role: {currentUser.role}</p>
          <p>Status: {currentUser.isAuthenticated ? 'Signed in' : 'Guest'}</p>
        </div>

        <div className="profile-card">
          <h3>Quick Stats</h3>
          <p>Saved Listings: {savedListings.length}</p>
          <p>My Listings: {myListings.length}</p>
          <p>Requests Sent: {bookingRequests.length}</p>
          <p>Messages Sent: {hostMessages.length}</p>
        </div>
      </div>

      <section className="profile-section">
        <div className="section-header">
          <h2>Reservation Requests</h2>
          <span>{bookingRequests.length}</span>
        </div>

        {bookingRequests.length > 0 ? (
          <div className="listings-grid">
            {bookingRequests.map((request) => (
              <div key={request.id} className="empty-state-card">
                <div className="section-header">
                  <h3>{request.listingTitle}</h3>
                  <span className="booking-success-tag">{request.status}</span>
                </div>

                <div className="booking-summary">
                  <p><strong>Submitted:</strong> {formatDateTime(request.submittedAt)}</p>
                  <p><strong>Host:</strong> {request.hostName}</p>
                  <p><strong>Move-in date:</strong> {request.moveInDate}</p>
                  <p><strong>Duration:</strong> {request.duration}</p>
                  {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
                </div>

                <Link
                  to={`/listing/${request.listingId}`}
                  className="secondary-button"
                >
                  View Listing
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No reservation requests yet</h3>
            <p>Reserve a space from a listing page and it will show up here.</p>
            <Link to="/explore" className="secondary-button">
              Explore Listings
            </Link>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>Messages Sent</h2>
          <span>{hostMessages.length}</span>
        </div>

        {hostMessages.length > 0 ? (
          <div className="listings-grid">
            {hostMessages.map((message) => (
              <div key={message.id} className="empty-state-card">
                <div className="section-header">
                  <h3>{message.listingTitle}</h3>
                  <span className="user-role-pill">{message.status}</span>
                </div>

                <div className="booking-summary">
                  <p><strong>Submitted:</strong> {formatDateTime(message.submittedAt)}</p>
                  <p><strong>Host:</strong> {message.hostName}</p>
                  <p><strong>Email used:</strong> {message.senderEmail}</p>
                  <p>{message.message}</p>
                </div>

                <Link
                  to={`/listing/${message.listingId}`}
                  className="secondary-button"
                >
                  Open Listing
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No messages sent yet</h3>
            <p>Contact a host from a listing page and the message will appear here.</p>
            <Link to="/explore" className="secondary-button">
              Browse Listings
            </Link>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>Saved Listings</h2>
          <span>{savedListings.length}</span>
        </div>

        {savedListings.length > 0 ? (
          <div className="listings-grid">
            {savedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedListingIds.includes(listing.id)}
                onToggleSave={onToggleSave}
                isSelected={false}
                onSelectListing={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No saved listings yet</h3>
            <p>Save a listing from Explore or from a listing details page.</p>
            <Link to="/explore" className="secondary-button">
              Browse Listings
            </Link>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>My Listings</h2>
          <span>{myListings.length}</span>
        </div>

        {myListings.length > 0 ? (
          <div className="listings-grid">
            {myListings.map((listing) => (
              <div key={listing.id} className="my-listing-card">
                <div className="my-listing-top">
                  <div>
                    <h3>{listing.title}</h3>
                    <p className="listing-location">{listing.location}</p>
                  </div>

                  <span
                    className={`status-pill ${
                      listing.status === 'paused' ? 'paused' : 'active'
                    }`}
                  >
                    {listing.status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                </div>

                <p className="listing-size">Size: {listing.size}</p>
                <p className="listing-description">{listing.description}</p>

                <div className="management-actions">
                  <Link
                    to={`/listing/${listing.id}`}
                    className="secondary-button"
                  >
                    View
                  </Link>

                  <Link
                    to={`/edit-listing/${listing.id}`}
                    className="primary-button"
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onToggleListingStatus(listing.id)}
                  >
                    {listing.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(listing)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>You have not created any listings yet</h3>
            <p>Create your first listing and it will show up here automatically.</p>
            <Link to="/create-listing" className="primary-button">
              Create Listing
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;