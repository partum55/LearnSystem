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
    lng: 'uk', // Default to 'uk', will be updated on client by RootInitializer/UIStore
    fallbackLng: 'uk',
    interpolation: {
      escapeValue: false,
    },
  });
export default i18n;
