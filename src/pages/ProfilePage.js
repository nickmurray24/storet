import { Link, useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

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

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function ProfilePage({
  currentUser,
  savedListings,
  myListings,
  savedListingIds,
  onToggleSave,
  bookingRequests = [],
  hostMessages = [],
  paymentRecords = [],
  reviews = [],
  onDeleteListing,
  onToggleListingStatus,
  onUpdateBookingLifecycle,
  onUpdateRole,
  onLogout,
}) {
  const navigate = useNavigate();

  const pendingCount = bookingRequests.filter(
    (request) => request.status === 'Pending'
  ).length;
  const waitlistedCount = bookingRequests.filter(
    (request) => request.status === 'Waitlisted'
  ).length;
  const approvedCount = bookingRequests.filter(
    (request) => request.status === 'Approved'
  ).length;
  const confirmedCount = bookingRequests.filter(
    (request) => request.status === 'Confirmed'
  ).length;
  const activeRentalCount = bookingRequests.filter(
    (request) => request.status === 'Active'
  ).length;
  const completedCount = bookingRequests.filter(
    (request) => request.status === 'Completed'
  ).length;
  const unreadSentMessages = hostMessages.filter(
    (message) => message.status === 'Unread'
  ).length;

  function handleDelete(listing) {
    const shouldDelete = window.confirm(
      `Delete "${listing.title}"? This will remove it from your listings.`
    );

    if (!shouldDelete) {
      return;
    }

    onDeleteListing(listing.id);
  }

  function handleLogoutClick() {
    onLogout();
    navigate('/');
  }

  return (
    <div className="profile-page">
      <div className="page-header-block">
        <h1>My Profile</h1>
        <p>Manage your account, role, listings, saved spaces, and activity.</p>
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
          <h3>Activity Snapshot</h3>
          <p>Saved Listings: {savedListings.length}</p>
          <p>My Listings: {myListings.length}</p>
          <p>Pending Requests: {pendingCount}</p>
          <p>Waitlisted: {waitlistedCount}</p>
          <p>Approved Requests: {approvedCount}</p>
          <p>Confirmed Bookings: {confirmedCount}</p>
          <p>Active Rentals: {activeRentalCount}</p>
          <p>Completed Rentals: {completedCount}</p>
          <p>Reviews Written: {reviews.length}</p>
          <p>Unread Message Threads: {unreadSentMessages}</p>
          <p>Payments Recorded: {paymentRecords.length}</p>
        </div>
      </div>

      <section className="profile-section">
        <div className="profile-card account-controls-card">
          <h3>Account Controls</h3>
          <p className="results-subtext">
            Switch the role for this demo account or log out.
          </p>

          <div className="role-switch-grid">
            {['Renter', 'Host', 'Both'].map((role) => (
              <button
                key={role}
                type="button"
                className={`role-switch-button ${
                  currentUser.role === role ? 'active' : ''
                }`}
                onClick={() => onUpdateRole(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="management-actions">
            <button
              type="button"
              className="danger-button"
              onClick={handleLogoutClick}
            >
              Log Out
            </button>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>Reservation Requests & Bookings</h2>
          <span>{bookingRequests.length}</span>
        </div>

        {bookingRequests.length > 0 ? (
          <div className="listings-grid">
            {bookingRequests.map((request) => (
              <div key={request.id} className="empty-state-card">
                <div className="activity-card-header">
                  <h3>{request.listingTitle}</h3>
                  <span className={`activity-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="booking-summary">
                  <p><strong>Submitted:</strong> {formatDateTime(request.submittedAt)}</p>
                  <p><strong>Host:</strong> {request.hostName}</p>
                  <p><strong>Move-in date:</strong> {request.moveInDate}</p>
                  <p><strong>Move-out date:</strong> {request.moveOutDate}</p>
                  <p><strong>Duration:</strong> {request.duration}</p>
                  {request.waitlistReason && (
                    <p><strong>Waitlist reason:</strong> {request.waitlistReason}</p>
                  )}
                  {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
                </div>

                <div className="activity-action-row">
                  {request.status === 'Approved' && (
                    <Link to={`/checkout/${request.id}`} className="primary-button">
                      Complete Checkout
                    </Link>
                  )}

                  {(request.status === 'Approved' ||
                    request.status === 'Confirmed' ||
                    request.status === 'Waitlisted') && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() =>
                        onUpdateBookingLifecycle(request.id, 'Cancelled')
                      }
                    >
                      Cancel
                    </button>
                  )}

                  {request.status === 'Waitlisted' && (
                    <span className="results-subtext">
                      Waiting for host availability
                    </span>
                  )}

                  {(request.status === 'Confirmed' ||
                    request.status === 'Active' ||
                    request.status === 'Completed' ||
                    request.status === 'Cancelled') && (
                    <Link to={`/checkout/${request.id}`} className="secondary-button">
                      View Receipt
                    </Link>
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
            <p>Reserve a space from a listing page and it will show up here.</p>
            <Link to="/explore" className="secondary-button">
              Explore Listings
            </Link>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>My Reviews</h2>
          <span>{reviews.length}</span>
        </div>

        {reviews.length > 0 ? (
          <div className="listings-grid">
            {reviews.map((review) => (
              <div key={review.id} className="empty-state-card">
                <div className="activity-card-header">
                  <h3>{review.listingTitle}</h3>
                  <span className="rating-summary">⭐ {review.rating}.0</span>
                </div>

                <div className="booking-summary">
                  <p><strong>Host:</strong> {review.hostName}</p>
                  <p><strong>Submitted:</strong> {formatDateTime(review.createdAt)}</p>
                  <p>{review.reviewText}</p>
                </div>

                <Link
                  to={`/listing/${review.listingId}`}
                  className="secondary-button"
                >
                  View Listing
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No reviews yet</h3>
            <p>Once you complete a rental, you can leave a verified review on that listing.</p>
          </div>
        )}
      </section>

      <section className="profile-section">
        <div className="section-header">
          <h2>Payment History</h2>
          <span>{paymentRecords.length}</span>
        </div>

        {paymentRecords.length > 0 ? (
          <div className="listings-grid">
            {paymentRecords.map((payment) => (
              <div key={payment.id} className="empty-state-card">
                <div className="activity-card-header">
                  <h3>{payment.listingTitle}</h3>
                  <span className="activity-status confirmed">Paid</span>
                </div>

                <div className="booking-summary">
                  <p><strong>Receipt:</strong> {payment.receiptNumber}</p>
                  <p><strong>Host:</strong> {payment.hostName}</p>
                  <p><strong>Paid at:</strong> {formatDateTime(payment.paidAt)}</p>
                  <p>
                    <strong>Card:</strong> {payment.cardBrand} ending in {payment.last4}
                  </p>
                  <p><strong>Total:</strong> {formatCurrency(payment.amount)}</p>
                </div>

                <Link
                  to={`/checkout/${payment.requestId}`}
                  className="secondary-button"
                >
                  View Receipt
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No payments yet</h3>
            <p>
              Once an approved request goes through checkout, the payment record
              will show up here.
            </p>
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
                <div className="activity-card-header">
                  <h3>{message.listingTitle}</h3>
                  <span className={`activity-status ${getStatusClass(message.status)}`}>
                    {message.status}
                  </span>
                </div>

                <div className="booking-summary">
                  <p><strong>Submitted:</strong> {formatDateTime(message.submittedAt)}</p>
                  <p><strong>Host:</strong> {message.hostName}</p>
                  <p><strong>Email used:</strong> {message.senderEmail}</p>
                  <p>{message.message}</p>
                  {message.readAt && (
                    <p><strong>Marked read:</strong> {formatDateTime(message.readAt)}</p>
                  )}
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
                isCompared={false}
                onToggleCompare={() => {}}
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
                    <div className="rating-row">
                      {listing.reviewCount > 0 ? (
                        <span className="rating-summary">
                          ⭐ {listing.averageRating.toFixed(1)} ({listing.reviewCount})
                        </span>
                      ) : (
                        <span className="rating-summary empty">No reviews yet</span>
                      )}
                    </div>
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
                <p>
                  <strong>Booking:</strong>{' '}
                  {listing.bookingMode === 'instant' ? 'Instant Book' : 'Request Approval'}
                </p>
                <p>
                  <strong>Waitlist:</strong> {listing.allowWaitlist ? 'Enabled' : 'Disabled'}
                </p>

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
            <p>
              Only listings created by this signed-in account appear here.
            </p>
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