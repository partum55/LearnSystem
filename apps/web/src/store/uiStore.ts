'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type UILang = 'en' | 'uk';
export type UISize = 'sm' | 'md' | 'lg';

interface UIState {
  theme: ThemeMode;
  language: UILang;
  size: UISize;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => ThemeMode;
  setLanguage: (language: UILang) => void;
  setSize: (size: UISize) => void;
  applyStoredPreferences: () => void;
}

const isBrowser = () => typeof window !== 'undefined';

export function normalizeTheme(value: unknown): ThemeMode {
  if (value === 'parchment' || value === 'light') return 'light';
  return 'dark';
}

export function themeToApi(theme: ThemeMode): 'dark' | 'light' {
  return theme;
}

const readLocal = <T extends string>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  return (window.localStorage.getItem(key) as T | null) ?? fallback;
};

const applyTheme = (theme: ThemeMode) => {
  if (!isBrowser()) return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'parchment');
    root.classList.remove('dark');
  } else {
    root.removeAttribute('data-theme');
    root.classList.add('dark');
  }
  window.localStorage.setItem('theme', theme);
};

const applyLanguage = (language: UILang) => {
  if (!isBrowser()) return;
  document.documentElement.lang = language;
  document.documentElement.dir = 'ltr';
  window.localStorage.setItem('language', language);
};

const applySize = (size: UISize) => {
  if (!isBrowser()) return;
  const root = document.documentElement;
  root.classList.remove('ui-sm', 'ui-md', 'ui-lg');
  root.classList.add(`ui-${size}`);
  root.setAttribute('data-ui-size', size);
  window.localStorage.setItem('uiSize', size);
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: normalizeTheme(readLocal('theme', 'dark')),
      language: readLocal<UILang>('language', 'uk'),
      size: readLocal<UISize>('uiSize', 'md'),

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
        return next;
      },

      setLanguage: (language) => {
        applyLanguage(language);
        set({ language });
      },

      setSize: (size) => {
        applySize(size);
        set({ size });
      },

      applyStoredPreferences: () => {
        const state = get();
        applyTheme(state.theme);
        applyLanguage(state.language);
        applySize(state.size);
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        size: state.size,
      }),
      onRehydrateStorage: () => (state) => {
        state?.applyStoredPreferences();
      },
    },
  ),
);
