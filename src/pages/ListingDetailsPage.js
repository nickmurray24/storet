import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import BookingRequestForm from '../components/BookingRequestForm';
import ContactHostForm from '../components/ContactHostForm';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ReviewForm from '../components/ReviewForm';

function formatDateTime(value) {
  return new Date(value).toLocaleDateString();
}

function ListingDetailsPage({
  listings,
  bookingRequests,
  reviews,
  savedListingIds,
  onToggleSave,
  currentUser,
  onSubmitBookingRequest,
  onSubmitHostMessage,
  onSubmitReview,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarMode, setSidebarMode] = useState('default');

  const listing = listings.find((item) => item.id === Number(id));

  const bookingRanges = useMemo(() => {
    if (!listing) {
      return [];
    }

    return bookingRequests
      .filter(
        (request) =>
          request.listingId === listing.id &&
          ['Approved', 'Confirmed', 'Active'].includes(request.status)
      )
      .map((request) => ({
        startDate: request.moveInDate,
        endDate: request.moveOutDate,
      }));
  }, [bookingRequests, listing]);

  const listingReviews = useMemo(() => {
    if (!listing) {
      return [];
    }

    return reviews
      .filter((review) => review.listingId === listing.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reviews, listing]);

  const eligibleReviewRequest = useMemo(() => {
    if (!listing || !currentUser.isAuthenticated) {
      return null;
    }

    return bookingRequests.find(
      (request) =>
        request.listingId === listing.id &&
        request.submittedByAccountEmail === currentUser.email &&
        request.status === 'Completed' &&
        !reviews.some((review) => review.requestId === request.id)
    );
  }, [bookingRequests, reviews, listing, currentUser]);

  if (!listing) {
    return (
      <div className="listing-details-page">
        <div className="page-header-block">
          <h1>Listing not found</h1>
          <p>We couldn’t find that storage listing.</p>
          <Link to="/explore" className="primary-button">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const isSaved = savedListingIds.includes(listing.id);
  const isOwner =
    currentUser.isAuthenticated &&
    listing.createdByAccountEmail === currentUser.email;

  function redirectToAuth(message) {
    navigate('/auth', {
      state: {
        redirectTo: location.pathname,
        message,
      },
    });
  }

  function handleReserveClick() {
    if (!currentUser.isAuthenticated) {
      redirectToAuth('Log in to send a reservation request.');
      return;
    }

    setSidebarMode('booking');
  }

  function handleContactClick() {
    if (!currentUser.isAuthenticated) {
      redirectToAuth('Log in to contact the host.');
      return;
    }

    setSidebarMode('contact');
  }

  function handleSaveClick() {
    if (!currentUser.isAuthenticated) {
      redirectToAuth('Log in to save listings to your profile.');
      return;
    }

    onToggleSave(listing.id);
  }

  return (
    <div className="listing-details-page">
      <div className="listing-details-header">
        <div>
          <p className="details-eyebrow">{listing.type} Listing</p>
          <h1>{listing.title}</h1>
          <p className="details-location">{listing.location}</p>

          <div className="rating-row detail-rating-row">
            {listing.reviewCount > 0 ? (
              <span className="rating-summary large">
                ⭐ {listing.averageRating.toFixed(1)} ({listing.reviewCount} review
                {listing.reviewCount !== 1 ? 's' : ''})
              </span>
            ) : (
              <span className="rating-summary empty">No reviews yet</span>
            )}
          </div>

          <div className="detail-chip-row">
            <span className="detail-chip">{listing.size}</span>
            <span className="detail-chip">{listing.duration}</span>
            <span className="detail-chip">{listing.availability}</span>
          </div>
        </div>

        <div className="details-price-box">
          <span className="details-price">{listing.price}</span>
          <span className="details-availability">{listing.availability}</span>
        </div>
      </div>

      <div className="listing-details-layout">
        <section className="listing-main-card">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="listing-detail-image"
            />
          ) : (
            <div className="listing-image-placeholder">
              <span>Listing Photo Placeholder</span>
            </div>
          )}

          <div className="listing-info-grid">
            <div className="info-block">
              <h3>Overview</h3>
              <p>{listing.description}</p>
            </div>

            <div className="listing-detail-subgrid">
              <div className="info-block">
                <h3>Storage Details</h3>
                <p><strong>Size:</strong> {listing.size}</p>
                <p><strong>Access:</strong> {listing.access}</p>
                <p><strong>Host:</strong> {listing.hostName}</p>
                <p><strong>Type:</strong> {listing.type}</p>
              </div>

              <div className="info-block">
                <h3>Security</h3>
                <p>
                  {listing.security || 'The host has not added extra security details yet.'}
                </p>
              </div>
            </div>

            <div className="info-block">
              <h3>Features</h3>
              <ul className="features-list">
                {listing.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="info-block">
              <h3>Restrictions</h3>
              {listing.restrictions.length > 0 ? (
                <ul className="listing-note-list">
                  {listing.restrictions.map((restriction) => (
                    <li key={restriction}>{restriction}</li>
                  ))}
                </ul>
              ) : (
                <p>No special restrictions were added for this listing.</p>
              )}
            </div>

            <div className="info-block">
              <h3>Availability Calendar</h3>
              <AvailabilityCalendar
                blackoutRanges={listing.blackoutRanges || []}
                bookingRanges={bookingRanges}
              />
            </div>

            <div className="info-block">
              <h3>Guest Reviews</h3>

              {eligibleReviewRequest && (
                <div className="review-form-wrap">
                  <ReviewForm
                    eligibleRequest={eligibleReviewRequest}
                    onSubmitReview={onSubmitReview}
                  />
                </div>
              )}

              {listingReviews.length > 0 ? (
                <div className="review-list">
                  {listingReviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-card-top">
                        <strong>{review.reviewerName}</strong>
                        <span className="rating-summary">⭐ {review.rating}.0</span>
                      </div>
                      <p className="results-subtext">
                        Verified stay • {formatDateTime(review.createdAt)}
                      </p>
                      <p>{review.reviewText}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No reviews have been submitted for this listing yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="listing-sidebar-card">
          {sidebarMode === 'default' && (
            <>
              {isOwner ? (
                <>
                  <h3>Manage Your Listing</h3>
                  <p>
                    You created this listing, so you’re seeing owner controls
                    instead of renter actions.
                  </p>

                  <div className="listing-sidebar-actions">
                    <Link
                      to={`/edit-listing/${listing.id}`}
                      className="primary-button full-width"
                    >
                      Edit Listing
                    </Link>

                    <Link
                      to="/profile"
                      className="secondary-button full-width"
                    >
                      View My Listings
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h3>Reserve, Contact, or Save</h3>
                  <p>
                    Choose the next step for this space. Signing in is required for
                    reservation requests, host messages, and saved listings.
                  </p>

                  <div className="listing-sidebar-actions">
                    <button
                      type="button"
                      className="primary-button full-width"
                      onClick={handleReserveClick}
                    >
                      Reserve Space
                    </button>

                    <button
                      type="button"
                      className="secondary-button full-width"
                      onClick={handleContactClick}
                    >
                      Contact Host
                    </button>

                    <button
                      type="button"
                      className={`save-button full-width detail-save-button ${
                        isSaved ? 'active' : ''
                      }`}
                      onClick={handleSaveClick}
                    >
                      {isSaved ? 'Saved to Profile' : 'Save Listing'}
                    </button>
                  </div>
                </>
              )}

              <div className="sidebar-meta">
                <p><strong>Type:</strong> {listing.type}</p>
                <p><strong>Availability:</strong> {listing.availability}</p>
                <p><strong>Price:</strong> {listing.price}</p>
                <p><strong>Security:</strong> {listing.security || 'Not specified'}</p>
              </div>

              <Link to="/explore" className="text-button back-link">
                ← Back to Explore
              </Link>
            </>
          )}

          {!isOwner && sidebarMode === 'booking' && (
            <>
              <BookingRequestForm
                listingTitle={listing.title}
                currentUser={currentUser}
                onSubmitRequest={(formData) =>
                  onSubmitBookingRequest(listing, formData)
                }
              />

              <button
                type="button"
                className="text-button back-link"
                onClick={() => setSidebarMode('default')}
              >
                ← Back to actions
              </button>
            </>
          )}

          {!isOwner && sidebarMode === 'contact' && (
            <>
              <ContactHostForm
                hostName={listing.hostName}
                listingTitle={listing.title}
                currentUser={currentUser}
                onSubmitMessage={(formData) =>
                  onSubmitHostMessage(listing, formData)
                }
              />

              <button
                type="button"
                className="text-button back-link"
                onClick={() => setSidebarMode('default')}
              >
                ← Back to actions
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ListingDetailsPage;