import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HistoryModal from './HistoryModal';

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
            <Link to="/login">Login</Link>  
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/translate">Translate</Link>
            <button 
              type="button" 
              onClick={() => setIsHistoryOpen(true)} 
              className="navbar__history"
              aria-label="View history"
            >
              History
            </button>
            <span className="navbar__greeting">Hello, {user?.username}</span>
            <button type="button" onClick={logout} className="navbar__logout">
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

