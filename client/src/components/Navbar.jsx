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
      <Link to={isAuthenticated ? '/translate' : '/'} className="navbar__brand whitespace-nowrap shrink-0">
        PAIT
      </Link>

      <nav
        className={`navbar__links ${
          isAuthenticated
            ? 'flex flex-row flex-1 min-w-0 items-center justify-between gap-1 md:gap-2'
            : ''
        }`}
      >
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
            <NavLink
              to="/notebook"
              className={({ isActive }) =>
                `navbar__link navbar__tab ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              Notebook
            </NavLink>
            <button 
              type="button" 
              onClick={() => setIsHistoryOpen(true)} 
              className="navbar__history navbar__link"
              aria-label="View history"
            >
              History
            </button>
            <span className="navbar__greeting hidden md:block">Hello, {user?.username}</span>
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

