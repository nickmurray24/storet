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

function getPriceValue(price) {
  const numeric = Number(String(price).replace(/[^0-9.]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value) {
  return `$${value.toFixed(0)}`;
}

function formatPercent(value) {
  return `${value.toFixed(0)}%`;
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
  const waitlistedCount = bookingRequests.filter(
    (request) => request.status === 'Waitlisted'
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

  const approvedLikeCount = bookingRequests.filter((request) =>
    ['Approved', 'Confirmed', 'Active', 'Completed'].includes(request.status)
  ).length;

  const conversionRate =
    bookingRequests.length > 0
      ? (approvedLikeCount / bookingRequests.length) * 100
      : 0;

  const bookedVolumeEstimate = bookingRequests.reduce((total, request) => {
    if (!['Confirmed', 'Active', 'Completed'].includes(request.status)) {
      return total;
    }

    return total + getPriceValue(request.listingPrice);
  }, 0);

  const listingAnalytics = myListings
    .map((listing) => {
      const listingRequests = bookingRequests.filter(
        (request) => request.listingId === listing.id
      );
      const listingMessages = hostMessages.filter(
        (message) => message.listingId === listing.id
      );

      const pending = listingRequests.filter(
        (request) => request.status === 'Pending'
      ).length;

      const waitlisted = listingRequests.filter(
        (request) => request.status === 'Waitlisted'
      ).length;

      const approved = listingRequests.filter((request) =>
        ['Approved', 'Confirmed', 'Active', 'Completed'].includes(request.status)
      ).length;

      const confirmed = listingRequests.filter((request) =>
        ['Confirmed', 'Active', 'Completed'].includes(request.status)
      ).length;

      const completed = listingRequests.filter(
        (request) => request.status === 'Completed'
      ).length;

      const unreadMessages = listingMessages.filter(
        (message) => message.status === 'Unread'
      ).length;

      const bookedEstimate = confirmed * getPriceValue(listing.price);

      return {
        ...listing,
        totalRequests: listingRequests.length,
        pending,
        waitlisted,
        approved,
        confirmed,
        completed,
        unreadMessages,
        messageCount: listingMessages.length,
        bookedEstimate,
      };
    })
    .sort((a, b) => {
      if (b.confirmed !== a.confirmed) {
        return b.confirmed - a.confirmed;
      }

      if (b.totalRequests !== a.totalRequests) {
        return b.totalRequests - a.totalRequests;
      }

      return b.averageRating - a.averageRating;
    });

  const attentionListings = listingAnalytics.filter(
    (listing) =>
      listing.pending > 0 ||
      listing.waitlisted > 0 ||
      listing.unreadMessages > 0 ||
      listing.status === 'paused'
  );

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
            Review booking activity, track listing performance, and spot where
            host attention is needed most.
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
          <h3>{waitlistedCount}</h3>
          <p>Waitlisted</p>
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

      <section className="host-analytics-grid">
        <div className="analytics-card">
          <p className="analytics-label">Booking Conversion</p>
          <h3>{formatPercent(conversionRate)}</h3>
          <p className="results-subtext">
            Based on approved, confirmed, active, and completed bookings.
          </p>
        </div>

        <div className="analytics-card">
          <p className="analytics-label">Booked Volume Estimate</p>
          <h3>{formatMoney(bookedVolumeEstimate)}</h3>
          <p className="results-subtext">
            Based on confirmed, active, and completed booking totals.
          </p>
        </div>

        <div className="analytics-card">
          <p className="analytics-label">Average Listing Rating</p>
          <h3>
            {myListings.length > 0
              ? (
                  myListings.reduce(
                    (sum, listing) => sum + (listing.averageRating || 0),
                    0
                  ) / myListings.length
                ).toFixed(1)
              : '0.0'}
          </h3>
          <p className="results-subtext">
            Includes listings with no reviews as zero-rated.
          </p>
        </div>
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Needs Attention</h2>
            <p className="results-subtext">
              Listings with pending requests, waitlisted renters, unread messages, or paused status.
            </p>
          </div>
        </div>

        {attentionListings.length > 0 ? (
          <div className="analytics-list">
            {attentionListings.map((listing) => (
              <div key={listing.id} className="analytics-list-item">
                <div>
                  <h3>{listing.title}</h3>
                  <p className="results-subtext">{listing.location}</p>
                </div>

                <div className="attention-badges">
                  {listing.pending > 0 && (
                    <span className="analytics-badge pending">
                      {listing.pending} pending
                    </span>
                  )}
                  {listing.waitlisted > 0 && (
                    <span className="analytics-badge waitlisted">
                      {listing.waitlisted} waitlisted
                    </span>
                  )}
                  {listing.unreadMessages > 0 && (
                    <span className="analytics-badge unread">
                      {listing.unreadMessages} unread
                    </span>
                  )}
                  {listing.status === 'paused' && (
                    <span className="analytics-badge paused">
                      paused
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No urgent host items right now</h3>
            <p>Your listings currently look caught up.</p>
          </div>
        )}
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Listing Performance</h2>
            <p className="results-subtext">
              Per-listing request volume, bookings, messages, and review performance.
            </p>
          </div>
        </div>

        {listingAnalytics.length > 0 ? (
          <div className="analytics-performance-grid">
            {listingAnalytics.map((listing) => (
              <div key={listing.id} className="analytics-performance-card">
                <div className="analytics-performance-top">
                  <div>
                    <h3>{listing.title}</h3>
                    <p className="results-subtext">{listing.location}</p>
                  </div>

                  <span className="rating-summary">
                    {listing.reviewCount > 0
                      ? `⭐ ${listing.averageRating.toFixed(1)} (${listing.reviewCount})`
                      : 'No reviews'}
                  </span>
                </div>

                <div className="analytics-metrics-grid">
                  <p><strong>Requests:</strong> {listing.totalRequests}</p>
                  <p><strong>Approved+:</strong> {listing.approved}</p>
                  <p><strong>Confirmed+:</strong> {listing.confirmed}</p>
                  <p><strong>Completed:</strong> {listing.completed}</p>
                  <p><strong>Messages:</strong> {listing.messageCount}</p>
                  <p><strong>Unread:</strong> {listing.unreadMessages}</p>
                  <p><strong>Waitlisted:</strong> {listing.waitlisted}</p>
                  <p><strong>Booked est.:</strong> {formatMoney(listing.bookedEstimate)}</p>
                </div>

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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No listing analytics yet</h3>
            <p>Create listings and collect activity to populate analytics.</p>
          </div>
        )}
      </section>

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>Reservation Requests & Bookings</h2>
            <p className="results-subtext">
              Approve, decline, waitlist, activate, complete, or cancel bookings.
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
                  <p><strong>Move-out:</strong> {request.moveOutDate}</p>
                  <p><strong>Duration:</strong> {request.duration}</p>
                </div>

                {request.waitlistReason && (
                  <p className="activity-note">
                    <strong>Waitlist reason:</strong> {request.waitlistReason}
                  </p>
                )}

                {request.notes && (
                  <p className="activity-note">
                    <strong>Notes:</strong> {request.notes}
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
                        className="secondary-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Waitlisted')
                        }
                      >
                        Waitlist
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

                  {request.status === 'Waitlisted' && (
                    <>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Approved')
                        }
                      >
                        Approve from Waitlist
                      </button>

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
                        Cancel Waitlist
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
                        className="secondary-button"
                        onClick={() =>
                          onUpdateBookingRequestStatus(request.id, 'Waitlisted')
                        }
                      >
                        Move to Waitlist
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
                <p>Price: {listing.price}</p>
                <p>
                  <strong>Booking:</strong>{' '}
                  {listing.bookingMode === 'instant' ? 'Instant Book' : 'Request Approval'}
                </p>
                <p>
                  <strong>Waitlist:</strong> {listing.allowWaitlist ? 'Enabled' : 'Disabled'}
                </p>

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