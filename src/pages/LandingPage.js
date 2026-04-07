import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-tag">Storage marketplace</span>
          <h1>Find storage nearby or rent out extra space.</h1>
          <p>
            Storet helps people discover storage options from commercial
            facilities and local hosts with unused garages, basements, and
            spare rooms.
          </p>

          <div className="hero-actions">
            <Link to="/explore" className="primary-button">
              Explore Storage
            </Link>
            <Link to="/create-listing" className="secondary-button">
              Offer Your Space
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <h3>Popular use cases</h3>
          <ul>
            <li>Students between leases</li>
            <li>Short-term moving storage</li>
            <li>Long-term household storage</li>
            <li>Peer-to-peer unused space rentals</li>
          </ul>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Search nearby options</h3>
          <p>Browse storage on an interactive map with filters and listing cards.</p>
        </div>

        <div className="feature-card">
          <h3>Choose your fit</h3>
          <p>Compare big-name storage facilities and private host listings in one place.</p>
        </div>

        <div className="feature-card">
          <h3>Earn from unused space</h3>
          <p>Turn an empty garage, basement, or spare room into extra income.</p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;