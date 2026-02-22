import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { updateUserPreferences, isAuthenticated } = useAuthStore();

  const changeLanguage = async (lng: 'en' | 'uk') => {
    await i18n.changeLanguage(lng);
    if (isAuthenticated) {
      await updateUserPreferences(lng, undefined);
    } else {
      localStorage.setItem('language', lng);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {(['en', 'uk'] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => changeLanguage(lng)}
          className="px-2.5 py-1 text-xs rounded-md transition-colors"
          style={{
            background: i18n.language === lng ? 'var(--bg-active)' : 'transparent',
            color: i18n.language === lng ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {lng === 'en' ? 'EN' : 'УКР'}
        </button>
      ))}
    </div>
  );
};
