import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'pait_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'uk' || stored === 'en') return stored;
    } catch {
      /* ignore */
    }
    return 'uk';
  });

  useLayoutEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'uk' ? 'uk' : 'en';
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        chrome.storage.local.set({ pait_language: language });
      } catch {
        /* ignore */
      }
    }
  }, [language]);

  const setLanguage = useCallback((next) => {
    setLanguageState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      return value === 'en' || value === 'uk' ? value : prev;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'uk' ? 'en' : 'uk'));
  }, []);

  const t = useCallback(
    (key) => {
      const dict = translations[language];
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
        return dict[key];
      }
      const fallback = translations.en;
      if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) {
        return fallback[key];
      }
      return key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

export default LanguageProvider;
