import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

const SettingsBar: React.FC = () => {
  const { t } = useTranslation();
  const { theme, language, size, toggleTheme, setLanguage, setSize } = useUIStore();
  const { isAuthenticated, updateUserPreferences } = useAuthStore();

  const onLangChange = (lang: 'en' | 'uk') => {
    setLanguage(lang);
    if (isAuthenticated) {
      try { updateUserPreferences(lang, undefined); } catch { /* no-op */ }
    }
  };

  const onToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    if (isAuthenticated) {
      try { updateUserPreferences(undefined, next); } catch { /* no-op */ }
    }
  };

  return (
    <header role="banner" className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="sr-only">{t('settings.appControls', 'Application controls')}</span>
          <strong className="font-semibold">{t('settings.title', 'Settings')}</strong>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm" htmlFor="lang-select">
            <span className="sr-only">{t('settings.language', 'Language')}</span>
            <select
              id="lang-select"
              aria-label={t('settings.language', 'Language')}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={language}
              onChange={(e) => onLangChange(e.target.value as 'en' | 'uk')}
            >
              <option value="uk">{t('settings.lang_uk', 'Ukrainian')}</option>
              <option value="en">{t('settings.lang_en', 'English')}</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm" htmlFor="size-select">
            <span>{t('settings.size', 'Size')}</span>
            <select
              id="size-select"
              aria-label={t('settings.size', 'Size')}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={size}
              onChange={(e) => setSize(e.target.value as 'sm' | 'md' | 'lg')}
            >
              <option value="sm">{t('settings.size_sm', 'Compact')}</option>
              <option value="md">{t('settings.size_md', 'Comfortable')}</option>
              <option value="lg">{t('settings.size_lg', 'Large')}</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? t('settings.switchToLight', 'Switch to light mode') : t('settings.switchToDark', 'Switch to dark mode')}
            title={theme === 'dark' ? t('settings.switchToLight', 'Switch to light mode') : t('settings.switchToDark', 'Switch to dark mode')}
          >
            <span aria-hidden>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="hidden sm:inline">{theme === 'dark' ? t('settings.dark', 'Dark') : t('settings.light', 'Light')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default SettingsBar;
