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

          // Apply user preferences centrally via the UI store
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
        // First, clear all local state IMMEDIATELY
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear token from memory and localStorage
        setAccessToken(null);
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('access_token');

        // Clear cookies manually with all possible variations
        const cookieOptions = [
          'path=/',
          'path=/; domain=' + window.location.hostname,
          'path=/; domain=.' + window.location.hostname,
        ];

        cookieOptions.forEach(options => {
          document.cookie = `access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${options}`;
          document.cookie = `refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${options}`;
        });

        try {
          // Call backend logout to clear server-side cookies and blacklist token
          await apiClient.post('/auth/logout/');
        } catch (e) {
          console.error('Logout API error:', e);
          // Continue with logout even if API call fails
        }

        // Small delay to ensure state is cleared before redirect
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force hard reload to clear any remaining state
        window.location.replace('/login');
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

          // Apply user preferences centrally via the UI store
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
