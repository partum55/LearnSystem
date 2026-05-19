import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import ukTranslations from './locales/uk.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  uk: {
    translation: ukTranslations,
  },
};

const initialLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('language') || 'uk' : 'uk';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'uk',
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
