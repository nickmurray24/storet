import { Link, NavLink } from 'react-router-dom';

function Navbar({
  currentUser,
  onLogout,
  unreadNotificationsCount = 0,
}) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          Storet
        </Link>

        <nav className="navbar-links">
          <NavLink to="/" end className="navbar-link">
            Home
          </NavLink>

          <NavLink to="/explore" className="navbar-link">
            Explore
          </NavLink>

          {currentUser.isAuthenticated && (
            <>
              <NavLink to="/notifications" className="navbar-link notifications-link">
                Notifications
                {unreadNotificationsCount > 0 && (
                  <span className="notifications-badge">
                    {unreadNotificationsCount}
                  </span>
                )}
              </NavLink>

              <NavLink to="/profile" className="navbar-link">
                Profile
              </NavLink>
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {currentUser.isAuthenticated ? (
            <>
              <span className="nav-user-chip">
                {currentUser.fullName} • {currentUser.role}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={onLogout}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link to="/auth" className="primary-button">
              Log In / Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;