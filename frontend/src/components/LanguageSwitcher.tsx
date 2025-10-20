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
    <div className="flex items-center space-x-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          i18n.language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('uk')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          i18n.language === 'uk'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        УКР
      </button>
    </div>
  );
};

