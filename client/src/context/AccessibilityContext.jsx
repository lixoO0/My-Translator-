import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AccessibilityContext = createContext(undefined);

const STORAGE_KEY = 'accessibility-settings';

const defaultSettings = {
  fontSize: 100,
  isDyslexicFont: false,
  isHighContrast: false,
};

export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  });

  // Застосування fontSize
  useEffect(() => {
    const scale = settings.fontSize / 100;
    document.documentElement.style.setProperty('--font-scale', scale.toString());
  }, [settings.fontSize]);

  // Застосування dyslexic font
  useEffect(() => {
    if (settings.isDyslexicFont) {
      document.body.classList.add('dyslexic-font');
    } else {
      document.body.classList.remove('dyslexic-font');
    }
  }, [settings.isDyslexicFont]);

  // Застосування high contrast
  useEffect(() => {
    if (settings.isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [settings.isHighContrast]);

  // Збереження в localStorage при зміні
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const value = {
    ...settings,
    updateSettings,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export default AccessibilityProvider;

