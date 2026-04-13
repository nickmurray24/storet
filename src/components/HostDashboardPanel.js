import { Link } from 'react-router-dom';

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HostDashboardPanel({
  myListings,
  bookingRequests = [],
  hostMessages = [],
  onDeleteListing,
  onToggleListingStatus,
}) {
  const activeCount = myListings.filter((listing) => listing.status !== 'paused').length;
  const pausedCount = myListings.filter((listing) => listing.status === 'paused').length;

  function handleDelete(listing) {
    const shouldDelete = window.confirm(
      `Delete "${listing.title}"? This will remove the listing and its related activity.`
    );

    if (!shouldDelete) {
      return;
    }

    onDeleteListing(listing.id);
  }

  return (
    <div className="host-dashboard">
      <section className="host-hero-card">
        <div>
          <p className="host-eyebrow">Host Mode</p>
          <h2>Turn unused space into income.</h2>
          <p className="host-copy">
            List your garage, basement, spare room, or commercial storage space
            and connect with people looking for short-term or long-term storage.
          </p>
        </div>

        <div className="host-hero-actions">
          <Link to="/create-listing" className="primary-button">
            Create Listing
          </Link>
          <Link to="/profile" className="secondary-button">
            View Profile
          </Link>
        </div>
      </section>

      <section className="host-stats-grid">
        <div className="host-stat-card">
          <h3>{myListings.length}</h3>
          <p>My Listings</p>
        </div>

        <div className="host-stat-card">
          <h3>{activeCount}</h3>
          <p>Active Listings</p>
        </div>

        <div className="host-stat-card">
          <h3>{pausedCount}</h3>
          <p>Paused Listings</p>
        </div>
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Recent Reservation Requests</h2>
            <p className="results-subtext">
              Requests sent for your hosted spaces.
            </p>
          </div>
        </div>

        {bookingRequests.length > 0 ? (
          <div className="host-listings-grid">
            {bookingRequests.slice(0, 4).map((request) => (
              <div key={request.id} className="host-listing-preview">
                <div className="host-listing-top">
                  <span className="booking-success-tag">{request.status}</span>
                  <span className="results-subtext">
                    {formatDateTime(request.submittedAt)}
                  </span>
                </div>

                <h3>{request.listingTitle}</h3>
                <p><strong>From:</strong> {request.requesterName}</p>
                <p><strong>Email:</strong> {request.requesterEmail}</p>
                <p><strong>Move-in:</strong> {request.moveInDate}</p>

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
            <p>When renters reserve your spaces, requests will show up here.</p>
          </div>
        )}
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Message Inbox</h2>
            <p className="results-subtext">
              Recent messages sent by renters.
            </p>
          </div>
        </div>

        {hostMessages.length > 0 ? (
          <div className="host-listings-grid">
            {hostMessages.slice(0, 4).map((message) => (
              <div key={message.id} className="host-listing-preview">
                <div className="host-listing-top">
                  <span className="user-role-pill">{message.status}</span>
                  <span className="results-subtext">
                    {formatDateTime(message.submittedAt)}
                  </span>
                </div>

                <h3>{message.listingTitle}</h3>
                <p><strong>From:</strong> {message.senderName}</p>
                <p><strong>Email:</strong> {message.senderEmail}</p>
                <p>{message.message}</p>

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
            <h3>No messages yet</h3>
            <p>When renters message you from listing pages, they will show up here.</p>
          </div>
        )}
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Manage My Listings</h2>
            <p className="results-subtext">
              Edit, pause, resume, or delete your storage spaces.
            </p>
          </div>
        </div>

        {myListings.length > 0 ? (
          <div className="host-listings-grid">
            {myListings.map((listing) => (
              <div key={listing.id} className="host-listing-preview">
                <div className="host-listing-top">
                  <span className={`listing-badge ${listing.type.toLowerCase()}`}>
                    {listing.type}
                  </span>

                  <span
                    className={`status-pill ${
                      listing.status === 'paused' ? 'paused' : 'active'
                    }`}
                  >
                    {listing.status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                </div>

                <h3>{listing.title}</h3>
                <p>{listing.location}</p>
                <p>Size: {listing.size}</p>
                <p>Price: {listing.price}</p>
                <p>Availability: {listing.availability}</p>

                <div className="host-listing-controls">
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
            <h3>No listings yet</h3>
            <p>Create your first storage listing to start the host side of the app.</p>
            <Link to="/create-listing" className="primary-button">
              Create My First Listing
            </Link>
          </div>
        )}
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Hosting Tips</h2>
            <p className="results-subtext">
              A few things that make listings more trustworthy and useful.
            </p>
          </div>
        </div>

        <div className="host-tips-grid">
          <div className="host-tip-card">
            <h3>Be specific</h3>
            <p>
              Mention exact size, storage type, access hours, and what the space
              is best suited for.
            </p>
          </div>

          <div className="host-tip-card">
            <h3>Build trust</h3>
            <p>
              Add security details like locks, cameras, gated access, or climate
              control when available.
            </p>
          </div>

          <div className="host-tip-card">
            <h3>Set expectations</h3>
            <p>
              Make restrictions clear, such as no furniture, no vehicle storage,
              or scheduled access only.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HostDashboardPanel;