import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HistoryModal from './HistoryModal';
import AccessibilityMenu from './AccessibilityMenu';

const tabBase =
  'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200';
const tabActive = 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50';
const tabInactive = 'text-slate-400 hover:bg-slate-800 hover:text-slate-200';

const pillButton =
  'shrink-0 rounded-full border border-slate-600/80 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <header className="shrink-0 border-b border-slate-800 bg-slate-950">
      <div className="flex min-w-0 items-stretch gap-0 sm:gap-2">
        <Link
          to={isAuthenticated ? '/translate' : '/'}
          className="flex shrink-0 items-center px-3 py-3 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-100 no-underline"
        >
          PAIT
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap border-slate-800 bg-slate-900/80 p-3 shadow-sm backdrop-blur-md scrollbar-hide sm:border-l">
          {!isAuthenticated ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
              >
                Register
              </NavLink>
              <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                <AccessibilityMenu />
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/translate"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
              >
                Translate
              </NavLink>
              <NavLink
                to="/summarize"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
              >
                Summarize
              </NavLink>
              <NavLink
                to="/notebook"
                className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
              >
                Notebook
              </NavLink>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className={pillButton}
                aria-label="View history"
              >
                History
              </button>
              <span className="hidden shrink-0 text-sm text-slate-500 md:inline">
                Hello, <span className="font-medium text-slate-300">{user?.username}</span>
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                <AccessibilityMenu />
                <button type="button" onClick={logout} className={pillButton}>
                  Logout
                </button>
              </div>
            </>
          )}
        </nav>
      </div>

      {isAuthenticated && (
        <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      )}
    </header>
  );
};

export default Navbar;
