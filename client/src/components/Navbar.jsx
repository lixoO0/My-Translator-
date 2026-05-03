import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AccessibilityMenu from './AccessibilityMenu';

const tabBase =
  'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200';
const tabActive =
  'bg-emerald-500/10 text-emerald-700 shadow-sm ring-1 ring-emerald-500/40 dark:text-emerald-400 dark:ring-emerald-500/50 dark:shadow-sm';
const tabInactive =
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200';

const pillButton =
  'shrink-0 rounded-full border border-slate-300/90 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-800/60 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-500 dark:hover:bg-slate-800';

const iconPillButton = `${pillButton} flex h-9 w-9 items-center justify-center p-0`;

export const Navbar = ({ onOpenHistory }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navRef = useRef(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isAuthenticated]);

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="flex min-w-0 items-stretch gap-0 sm:gap-2">
        <Link
          to={isAuthenticated ? '/translate' : '/'}
          className="flex shrink-0 items-center px-3 py-3 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-900 no-underline dark:text-slate-100"
        >
          PAIT
        </Link>

        <nav
          ref={navRef}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap border-slate-200/60 bg-transparent p-3 scrollbar-hide sm:border-l dark:border-slate-700/40"
        >
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
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={iconPillButton}
                  aria-label={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
                  title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 shrink-0" />
                  )}
                </button>
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
                onClick={() => onOpenHistory?.()}
                className={pillButton}
                aria-label="View history"
              >
                History
              </button>
              <span className="hidden shrink-0 text-sm text-slate-500 dark:text-slate-500 md:inline">
                Hello,{' '}
                <span className="font-medium text-slate-800 dark:text-slate-300">{user?.username}</span>
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                <AccessibilityMenu />
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={iconPillButton}
                  aria-label={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
                  title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 shrink-0" />
                  )}
                </button>
                <button type="button" onClick={logout} className={pillButton}>
                  Logout
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
