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
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'uk',
    fallbackLng: 'uk',
    interpolation: {
      escapeValue: false,
    },
  });
export default i18n;
