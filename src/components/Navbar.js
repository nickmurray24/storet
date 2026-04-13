import { NavLink, useNavigate } from 'react-router-dom';

function isHostRole(role) {
  return role === 'Host' || role === 'Both';
}

function Navbar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const canHost = currentUser.isAuthenticated && isHostRole(currentUser.role);

  function handleLogoutClick() {
    onLogout();
    navigate('/');
  }

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

        {canHost && (
          <NavLink to="/create-listing" className="nav-link">
            Create Listing
          </NavLink>
        )}

        {currentUser.isAuthenticated && (
          <NavLink to="/profile" className="nav-link">
            Profile
          </NavLink>
        )}

        {currentUser.isAuthenticated ? (
          <>
            <NavLink to="/profile" className="nav-link nav-button">
              {currentUser.fullName.split(' ')[0]}
            </NavLink>

            <button
              type="button"
              className="nav-link nav-logout-button"
              onClick={handleLogoutClick}
            >
              Log Out
            </button>
          </>
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