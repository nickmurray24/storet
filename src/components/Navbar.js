import { NavLink } from 'react-router-dom';

function Navbar({ currentUser }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <NavLink to="/" className="brand-link">
          Storet
        </NavLink>
      </div>

      <nav className="navbar-links">
        <NavLink to="/explore" className="nav-link">
          Explore
        </NavLink>
        <NavLink to="/create-listing" className="nav-link">
          Create Listing
        </NavLink>
        <NavLink to="/profile" className="nav-link">
          Profile
        </NavLink>

        {currentUser.isAuthenticated ? (
          <NavLink to="/profile" className="nav-link nav-button">
            {currentUser.fullName.split(' ')[0]}
          </NavLink>
        ) : (
          <NavLink to="/auth" className="nav-link nav-button">
            Log In
          </NavLink>
        )}
      </nav>
    </header>
  );
}

export default Navbar;