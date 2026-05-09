import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AccessibilityMenu from './AccessibilityMenu';

export const Navbar = ({ onOpenHistory }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
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

  const tabClass = ({ isActive }) =>
    `pait-nav-tab ${isActive ? 'pait-nav-tab--active' : ''}`;

  const langLabel = language === 'uk' ? t('lang.uk_short') : t('lang.en_short');

  return (
    <header className="pait-header">
      <div className="pait-header-inner">
        <Link
          to={isAuthenticated ? '/translate' : '/'}
          className="pait-brand"
        >
          PAIT
        </Link>

        <nav ref={navRef} className="pait-nav-row scrollbar-hide">
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={tabClass}>
                {t('nav.login')}
              </NavLink>
              <NavLink to="/register" className={tabClass}>
                {t('nav.register')}
              </NavLink>
              <div className="pait-nav-actions">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="pait-nav-lang-btn"
                  aria-label={language === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
                  title={language === 'uk' ? 'English' : 'Українська'}
                >
                  {langLabel}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="pait-nav-icon-btn"
                  aria-label={theme === 'dark' ? t('nav.theme_to_light') : t('nav.theme_to_dark')}
                  title={theme === 'dark' ? t('nav.theme_light') : t('nav.theme_dark')}
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
              <NavLink to="/translate" className={tabClass}>
                {t('nav.translate')}
              </NavLink>
              <NavLink to="/summarize" className={tabClass}>
                {t('nav.summarize')}
              </NavLink>
              <NavLink to="/notebook" className={tabClass}>
                {t('nav.notebook')}
              </NavLink>
              <button type="button" onClick={() => onOpenHistory?.()} className="pait-nav-tab">
                {t('nav.history')}
              </button>
              <span className="pait-nav-greeting">
                {t('nav.hello')},{' '}
                <strong>{user?.username}</strong>
              </span>
              <div className="pait-nav-actions">
                <AccessibilityMenu />
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="pait-nav-lang-btn"
                  aria-label={language === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
                  title={language === 'uk' ? 'English' : 'Українська'}
                >
                  {langLabel}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="pait-nav-icon-btn"
                  aria-label={theme === 'dark' ? t('nav.theme_to_light') : t('nav.theme_to_dark')}
                  title={theme === 'dark' ? t('nav.theme_light') : t('nav.theme_dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 shrink-0" />
                  )}
                </button>
                <button type="button" onClick={logout} className="pait-nav-tab">
                  {t('nav.logout')}
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
