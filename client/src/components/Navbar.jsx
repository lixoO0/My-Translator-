import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HistoryModal from './HistoryModal';
import AccessibilityMenu from './AccessibilityMenu';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        PAIT
      </Link>

      <nav className="navbar__links">
        {!isAuthenticated ? (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `navbar__link ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                `navbar__link ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              Register
            </NavLink>
            <AccessibilityMenu />
          </>
        ) : (
          <>
            <NavLink
              to="/translate"
              className={({ isActive }) =>
                `navbar__link navbar__tab ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              Translate
            </NavLink>
            <NavLink
              to="/summarize"
              className={({ isActive }) =>
                `navbar__link navbar__tab ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              Summarize
            </NavLink>
            <button 
              type="button" 
              onClick={() => setIsHistoryOpen(true)} 
              className="navbar__history navbar__link"
              aria-label="View history"
            >
              History
            </button>
            <span className="navbar__greeting">Hello, {user?.username}</span>
            <AccessibilityMenu />
            <button type="button" onClick={logout} className="navbar__logout navbar__link">
              Logout
            </button>
          </>
        )}
      </nav>

      {isAuthenticated && (
        <HistoryModal 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
        />
      )}
    </header>
  );
};

export default Navbar;

