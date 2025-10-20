import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import apiClient from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
          const response = await apiClient.post<{ access: string; refresh: string; user: User }>(
            '/auth/login/',
            { email, password }
          );

          localStorage.setItem('access_token', response.data.access);
          localStorage.setItem('refresh_token', response.data.refresh);

          // Immediately update the auth state synchronously
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Apply user preferences
          if (response.data.user.locale) {
            localStorage.setItem('language', response.data.user.locale);
            // i18n will be updated by the component
          }
          if (response.data.user.theme) {
            localStorage.setItem('theme', response.data.user.theme);
            if (response.data.user.theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
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

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchCurrentUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await apiClient.get<User>('/auth/me/');
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });

          // Apply user preferences
          if (response.data.locale) {
            localStorage.setItem('language', response.data.locale);
          }
          if (response.data.theme) {
            localStorage.setItem('theme', response.data.theme);
            if (response.data.theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        } catch (error) {
          // Token invalid, logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
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

          if (locale) {
            localStorage.setItem('language', locale);
          }
          if (theme) {
            localStorage.setItem('theme', theme);
            // Apply theme correctly
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
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
