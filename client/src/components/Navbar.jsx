import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        PAIT
      </Link>

      <nav className="navbar__links">
        {!isAuthenticated ? (
          <>
            <Link to="/login">Login</Link>  
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <span className="navbar__greeting">Hello, {user?.username}</span>
            <button type="button" onClick={logout} className="navbar__logout">
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
};

export default Navbar;

