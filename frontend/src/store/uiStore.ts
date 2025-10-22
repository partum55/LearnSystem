import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/config';

export type ThemeMode = 'light' | 'dark';
export type UILang = 'en' | 'uk';
export type UISize = 'sm' | 'md' | 'lg';

interface UIState {
  theme: ThemeMode;
  language: UILang;
  size: UISize;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: UILang) => void;
  setSize: (size: UISize) => void;
}

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
};

const applyLanguage = (lang: UILang) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';
  localStorage.setItem('language', lang);
  try { i18n.changeLanguage(lang); } catch { /* i18n may not be ready yet */ }
};

const applySize = (size: UISize) => {
  const root = document.documentElement;
  root.classList.remove('ui-sm', 'ui-md', 'ui-lg');
  root.classList.add(`ui-${size}`);
  root.setAttribute('data-ui-size', size);
  localStorage.setItem('uiSize', size);
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: (localStorage.getItem('theme') as ThemeMode) || 'light',
      language: (localStorage.getItem('language') as UILang) || 'uk',
      size: (localStorage.getItem('uiSize') as UISize) || 'md',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },

      setLanguage: (lang) => {
        applyLanguage(lang);
        set({ language: lang });
      },

      setSize: (size) => {
        applySize(size);
        set({ size });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (s) => ({ theme: s.theme, language: s.language, size: s.size }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Re-apply on load
        try {
          applyTheme(state.theme);
          applyLanguage(state.language);
          applySize(state.size);
        } catch { /* no-op */ }
      },
    }
  )
);
