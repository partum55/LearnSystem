import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

const SettingsBar: React.FC = () => {
  const { t } = useTranslation();
  const { language, size, setLanguage, setSize } = useUIStore();
  const { isAuthenticated, updateUserPreferences } = useAuthStore();

  const onLangChange = (lang: 'en' | 'uk') => {
    setLanguage(lang);
    if (isAuthenticated) {
      try { updateUserPreferences(lang, undefined); } catch { /* no-op */ }
    }
  };

  return (
    <header
      role="banner"
      className="w-full backdrop-blur sticky top-0 z-40"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="sr-only">{t('settings.appControls', 'Application controls')}</span>
          <strong className="font-medium" style={{ fontFamily: 'var(--font-display)' }}>{t('settings.title', 'Settings')}</strong>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm" htmlFor="lang-select">
            <span className="sr-only">{t('settings.language', 'Language')}</span>
            <select
              id="lang-select"
              aria-label={t('settings.language', 'Language')}
              className="input text-xs py-1 px-2"
              value={language}
              onChange={(e) => onLangChange(e.target.value as 'en' | 'uk')}
            >
              <option value="uk">{t('settings.lang_uk', 'Ukrainian')}</option>
              <option value="en">{t('settings.lang_en', 'English')}</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm" htmlFor="size-select">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings.size', 'Size')}</span>
            <select
              id="size-select"
              aria-label={t('settings.size', 'Size')}
              className="input text-xs py-1 px-2"
              value={size}
              onChange={(e) => setSize(e.target.value as 'sm' | 'md' | 'lg')}
            >
              <option value="sm">{t('settings.size_sm', 'Compact')}</option>
              <option value="md">{t('settings.size_md', 'Comfortable')}</option>
              <option value="lg">{t('settings.size_lg', 'Large')}</option>
            </select>
          </label>
        </div>
      </div>
    </header>
  );
};

export default SettingsBar;
