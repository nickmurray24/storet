import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

function ProfilePage({
  currentUser,
  savedListings,
  myListings,
  savedListingIds,
  onToggleSave,
}) {
  return (
    <div className="profile-page">
      <div className="page-header-block">
        <h1>My Profile</h1>
        <p>Manage your account, saved spaces, and listings you created.</p>
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
          <p>Bookings: 0</p>
        </div>
      </div>

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