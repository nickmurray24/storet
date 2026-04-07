import { Link } from 'react-router-dom';

function HostDashboardPanel({ myListings }) {
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
          <h3>{myListings.length > 0 ? 'Active' : '—'}</h3>
          <p>Hosting Status</p>
        </div>

        <div className="host-stat-card">
          <h3>Fast</h3>
          <p>Start with one simple listing</p>
        </div>
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

      <section className="host-section-card">
        <div className="section-header">
          <div>
            <h2>My Listings Preview</h2>
            <p className="results-subtext">
              Your hosted spaces show up here so you can quickly jump into them.
            </p>
          </div>
        </div>

        {myListings.length > 0 ? (
          <div className="host-listings-grid">
            {myListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="host-listing-preview"
              >
                <div className="host-listing-top">
                  <span className={`listing-badge ${listing.type.toLowerCase()}`}>
                    {listing.type}
                  </span>
                  <span className="listing-price">{listing.price}</span>
                </div>

                <h3>{listing.title}</h3>
                <p>{listing.location}</p>
                <p>Size: {listing.size}</p>
                <p>Availability: {listing.availability}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No listings yet</h3>
            <p>
              Create your first storage listing to start the host side of the app.
            </p>
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