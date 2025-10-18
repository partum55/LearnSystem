import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
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

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
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
    set({ isLoading: true });
    try {
      const response = await apiClient.get<User>('/auth/me/');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
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
}));
