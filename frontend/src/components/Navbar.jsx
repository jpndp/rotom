import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user && ['club_admin', 'website_admin'].includes(user.role);

  function handleLogout() {
    navigate('/login', { replace: true });
    logout();
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">Rotom</Link>
      <nav className="nav-links">
        <Link to="/clubs">Clubs</Link>
        <Link to="/events">Events</Link>
        {user && <Link to="/my-registrations">My Events</Link>}
        {isAdmin && <Link to="/admin">Admin</Link>}
      </nav>
      <div className="nav-auth">
        <button onClick={toggleTheme} className="btn btn-ghost theme-toggle" aria-label="Toggle dark mode">
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
        {loading ? null : user ? (
          <>
            <Link to="/profile" className="nav-user">{user.name}</Link>
            <button onClick={handleLogout} className="btn btn-ghost">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Log in</Link>
            <Link to="/signup" className="btn btn-primary">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;