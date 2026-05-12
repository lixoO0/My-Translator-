import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  FileText,
  History,
  Languages,
  LogIn,
  LogOut,
  Moon,
  Sun,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AccessibilityMenu from './AccessibilityMenu';

export const Navbar = ({ onOpenHistory }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const navRef = useRef(null);
  const [showNavScrollFade, setShowNavScrollFade] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    const updateScrollFade = () => {
      const overflow = el.scrollWidth > el.clientWidth + 2;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      setShowNavScrollFade(overflow && !atEnd);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', updateScrollFade, { passive: true });
    const ro = new ResizeObserver(updateScrollFade);
    ro.observe(el);
    updateScrollFade();

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', updateScrollFade);
      ro.disconnect();
    };
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

        <div
          className={[
            'pait-nav-scroll-wrap',
            showNavScrollFade ? 'pait-nav-scroll-wrap--fade-right' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <nav ref={navRef} className="pait-nav-row pait-nav-scroll">
          {!isAuthenticated ? (
            <>
              <NavLink
                to="/login"
                className={tabClass}
                title={t('nav.login')}
                aria-label={t('nav.login')}
              >
                <LogIn className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.login')}</span>
              </NavLink>
              <NavLink
                to="/register"
                className={tabClass}
                title={t('nav.register')}
                aria-label={t('nav.register')}
              >
                <UserPlus className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.register')}</span>
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
              <NavLink
                to="/translate"
                className={tabClass}
                title={t('nav.translate')}
                aria-label={t('nav.translate')}
              >
                <Languages className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.translate')}</span>
              </NavLink>
              <NavLink
                to="/summarize"
                className={tabClass}
                title={t('nav.summarize')}
                aria-label={t('nav.summarize')}
              >
                <FileText className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.summarize')}</span>
              </NavLink>
              <NavLink
                to="/notebook"
                className={tabClass}
                title={t('nav.notebook')}
                aria-label={t('nav.notebook')}
              >
                <BookOpen className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.notebook')}</span>
              </NavLink>
              <button
                type="button"
                onClick={() => onOpenHistory?.()}
                className="pait-nav-tab"
                title={t('nav.history')}
                aria-label={t('nav.history')}
              >
                <History className="pait-nav-tab-icon shrink-0" aria-hidden />
                <span className="nav-text">{t('nav.history')}</span>
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
                <button
                  type="button"
                  onClick={logout}
                  className="pait-nav-tab"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <LogOut className="pait-nav-tab-icon shrink-0" aria-hidden />
                  <span className="nav-text">{t('nav.logout')}</span>
                </button>
              </div>
            </>
          )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
