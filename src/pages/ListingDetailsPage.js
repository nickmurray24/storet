import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BookingRequestForm from '../components/BookingRequestForm';
import ContactHostForm from '../components/ContactHostForm';

function ListingDetailsPage({ listings, savedListingIds, onToggleSave }) {
  const { id } = useParams();
  const [sidebarMode, setSidebarMode] = useState('default');

  const listing = listings.find((item) => item.id === Number(id));

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

  return (
    <div className="listing-details-page">
      <div className="listing-details-header">
        <div>
          <p className="details-eyebrow">{listing.type} Listing</p>
          <h1>{listing.title}</h1>
          <p className="details-location">{listing.location}</p>
        </div>

        <div className="details-price-box">
          <span className="details-price">{listing.price}</span>
          <span className="details-availability">{listing.availability}</span>
        </div>
      </div>

      <div className="listing-details-layout">
        <section className="listing-main-card">
          <div className="listing-image-placeholder">
            <span>Listing Photos Placeholder</span>
          </div>

          <div className="listing-info-grid">
            <div className="info-block">
              <h3>Description</h3>
              <p>{listing.description}</p>
            </div>

            <div className="info-block">
              <h3>Storage Details</h3>
              <p><strong>Size:</strong> {listing.size}</p>
              <p><strong>Access:</strong> {listing.access}</p>
              <p><strong>Host:</strong> {listing.hostName}</p>
            </div>

            <div className="info-block">
              <h3>Features</h3>
              <ul className="features-list">
                {listing.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside className="listing-sidebar-card">
          {sidebarMode === 'default' && (
            <>
              <h3>Reserve, Contact, or Save</h3>
              <p>
                Choose the next step for this space. This is now connected to a
                booking request flow, host message flow, and saved listings flow.
              </p>

              <div className="listing-sidebar-actions">
                <button
                  className="primary-button full-width"
                  onClick={() => setSidebarMode('booking')}
                >
                  Reserve Space
                </button>

                <button
                  className="secondary-button full-width"
                  onClick={() => setSidebarMode('contact')}
                >
                  Contact Host
                </button>

                <button
                  className={`save-button full-width detail-save-button ${
                    isSaved ? 'active' : ''
                  }`}
                  onClick={() => onToggleSave(listing.id)}
                >
                  {isSaved ? 'Saved to Profile' : 'Save Listing'}
                </button>
              </div>

              <div className="sidebar-meta">
                <p><strong>Type:</strong> {listing.type}</p>
                <p><strong>Availability:</strong> {listing.availability}</p>
                <p><strong>Price:</strong> {listing.price}</p>
              </div>

              <Link to="/explore" className="text-button back-link">
                ← Back to Explore
              </Link>
            </>
          )}

          {sidebarMode === 'booking' && (
            <>
              <BookingRequestForm listingTitle={listing.title} />
              <button
                className="text-button back-link"
                onClick={() => setSidebarMode('default')}
              >
                ← Back to actions
              </button>
            </>
          )}

          {sidebarMode === 'contact' && (
            <>
              <ContactHostForm
                hostName={listing.hostName}
                listingTitle={listing.title}
              />
              <button
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