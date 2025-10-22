import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import apiClient from '../api/client';
import { setAccessToken, getAccessToken } from '../api/token';
import { useUIStore } from './uiStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateUserPreferences: (locale?: 'uk' | 'en', theme?: 'light' | 'dark') => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{ access?: string; user: User }>(
            '/auth/login/',
            { email, password }
          );

          if (response.data.access) {
            setAccessToken(response.data.access);
          }

          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Apply user preferences centrally via UI store
          const ui = useUIStore.getState();
          if (response.data.user.locale) {
            ui.setLanguage(response.data.user.locale as 'uk' | 'en');
          }
          if (response.data.user.theme) {
            ui.setTheme(response.data.user.theme as 'light' | 'dark');
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        try { await apiClient.post('/auth/logout/'); } catch (e) { /* ignore */ }
        setAccessToken(null);
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const token = getAccessToken();
          if (!token) {
            // No token: assume logged out without hitting the API
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
          const response = await apiClient.get<User>('/auth/me/');
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });

          // Apply user preferences centrally via UI store
          const ui = useUIStore.getState();
          if (response.data.locale) {
            ui.setLanguage(response.data.locale as 'uk' | 'en');
          }
          if (response.data.theme) {
            ui.setTheme(response.data.theme as 'light' | 'dark');
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updateUserPreferences: async (locale?: 'uk' | 'en', theme?: 'light' | 'dark') => {
        try {
          const response = await apiClient.patch<User>('/auth/me/', {
            locale,
            theme,
          });
          set({ user: response.data });

          const ui = useUIStore.getState();
          if (locale) {
            ui.setLanguage(locale);
          }
          if (theme) {
            ui.setTheme(theme);
          }
        } catch (error) {
          console.error('Failed to update preferences', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
