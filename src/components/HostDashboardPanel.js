import { Link } from 'react-router-dom';

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusClass(status) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function HostDashboardPanel({
  myListings,
  bookingRequests = [],
  hostMessages = [],
  onDeleteListing,
  onToggleListingStatus,
  onUpdateBookingRequestStatus,
  onUpdateBookingLifecycle,
  onUpdateHostMessageStatus,
}) {
  const activeCount = myListings.filter((listing) => listing.status !== 'paused').length;
  const pausedCount = myListings.filter((listing) => listing.status === 'paused').length;
  const pendingRequestCount = bookingRequests.filter(
    (request) => request.status === 'Pending'
  ).length;
  const unreadMessageCount = hostMessages.filter(
    (message) => message.status === 'Unread'
  ).length;
  const confirmedCount = bookingRequests.filter(
    (request) => request.status === 'Confirmed'
  ).length;
  const activeBookingCount = bookingRequests.filter(
    (request) => request.status === 'Active'
  ).length;
  const completedCount = bookingRequests.filter(
    (request) => request.status === 'Completed'
  ).length;

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
          <h2>Manage the full booking lifecycle.</h2>
          <p className="host-copy">
            Review incoming activity, approve requests, track paid bookings, and
            move rentals through active and completed stages.
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
          <h3>{pendingRequestCount}</h3>
          <p>Pending Requests</p>
        </div>

        <div className="host-stat-card">
          <h3>{confirmedCount}</h3>
          <p>Confirmed Bookings</p>
        </div>

        <div className="host-stat-card">
          <h3>{activeBookingCount}</h3>
          <p>Active Rentals</p>
        </div>

        <div className="host-stat-card">
          <h3>{completedCount}</h3>
          <p>Completed Rentals</p>
        </div>

        <div className="host-stat-card">
          <h3>{unreadMessageCount}</h3>
          <p>Unread Messages</p>
        </div>

        <div className="host-stat-card">
          <h3>{pausedCount}</h3>
          <p>Paused Listings</p>
        </div>
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Reservation Requests & Bookings</h2>
            <p className="results-subtext">
              Approve, decline, activate, complete, or cancel bookings.
            </p>
          </div>
        </div>

        {bookingRequests.length > 0 ? (
          <div className="host-listings-grid">
            {bookingRequests.map((request) => (
              <div key={request.id} className="host-listing-preview">
                <div className="activity-card-header">
                  <span className={`activity-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                  <span className="results-subtext">
                    {formatDateTime(request.submittedAt)}
                  </span>
                </div>

                <h3>{request.listingTitle}</h3>

                <div className="activity-meta-grid">
                  <p><strong>From:</strong> {request.requesterName}</p>
                  <p><strong>Email:</strong> {request.requesterEmail}</p>
                  <p><strong>Move-in:</strong> {request.moveInDate}</p>
                  <p><strong>Duration:</strong> {request.duration}</p>
                </div>

                {request.notes && (
                  <p className="activity-note">
                    <strong>Notes:</strong> {request.notes}
                  </p>
                )}

                {request.confirmedAt && (
                  <p className="results-subtext">
                    Paid: {formatDateTime(request.confirmedAt)}
                  </p>
                )}

                {request.activatedAt && (
                  <p className="results-subtext">
                    Activated: {formatDateTime(request.activatedAt)}
                  </p>
                )}

                {request.completedAt && (
                  <p className="results-subtext">
                    Completed: {formatDateTime(request.completedAt)}
                  </p>
                )}

                {request.cancelledAt && (
                  <p className="results-subtext">
                    Cancelled: {formatDateTime(request.cancelledAt)}
                  </p>
                )}

                <div className="activity-action-row">
                  {request.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Approved')
                        }
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Declined')
                        }
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {request.status === 'Approved' && (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Pending')
                        }
                      >
                        Mark Pending
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          onUpdateBookingLifecycle(request.id, 'Cancelled')
                        }
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}

                  {request.status === 'Confirmed' && (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          onUpdateBookingLifecycle(request.id, 'Active')
                        }
                      >
                        Mark Active
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          onUpdateBookingLifecycle(request.id, 'Cancelled')
                        }
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}

                  {request.status === 'Active' && (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          onUpdateBookingLifecycle(request.id, 'Completed')
                        }
                      >
                        Mark Completed
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          onUpdateBookingLifecycle(request.id, 'Cancelled')
                        }
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}

                  <Link
                    to={`/listing/${request.listingId}`}
                    className="secondary-button"
                  >
                    View Listing
                  </Link>
                </div>
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
              Mark messages read or unread as you work through renter questions.
            </p>
          </div>
        </div>

        {hostMessages.length > 0 ? (
          <div className="host-listings-grid">
            {hostMessages.map((message) => (
              <div key={message.id} className="host-listing-preview">
                <div className="activity-card-header">
                  <span className={`activity-status ${getStatusClass(message.status)}`}>
                    {message.status}
                  </span>
                  <span className="results-subtext">
                    {formatDateTime(message.submittedAt)}
                  </span>
                </div>

                <h3>{message.listingTitle}</h3>

                <div className="activity-meta-grid">
                  <p><strong>From:</strong> {message.senderName}</p>
                  <p><strong>Email:</strong> {message.senderEmail}</p>
                </div>

                <p className="activity-note">{message.message}</p>

                {message.readAt && (
                  <p className="results-subtext">
                    Marked read: {formatDateTime(message.readAt)}
                  </p>
                )}

                <div className="activity-action-row">
                  {message.status !== 'Read' ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        onUpdateHostMessageStatus(message.id, 'Read')
                      }
                    >
                      Mark Read
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        onUpdateHostMessageStatus(message.id, 'Unread')
                      }
                    >
                      Mark Unread
                    </button>
                  )}

                  <Link
                    to={`/listing/${message.listingId}`}
                    className="secondary-button"
                  >
                    Open Listing
                  </Link>
                </div>
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
    </div>
  );
}

export default HostDashboardPanel;