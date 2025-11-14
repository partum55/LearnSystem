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

// Helper to map backend (camelCase, enum values) -> frontend User (snake_case, lowercase locale)
function mapApiUserToFrontend(u: any): User {
  if (!u) return u;
  return {
    id: u.id,
    email: u.email,
    display_name: u.displayName ?? u.display_name ?? '',
    first_name: u.firstName ?? u.first_name,
    last_name: u.lastName ?? u.last_name,
    student_id: u.studentId ?? u.student_id,
    role: u.role,
    // Backend returns 'UK'|'EN'; normalize to 'uk'|'en'
    locale: (typeof u.locale === 'string' ? u.locale.toLowerCase() : u.locale) as 'uk' | 'en',
    theme: u.theme === 'dark' ? 'dark' : 'light',
    avatar: u.avatarUrl ?? u.avatar,
    bio: u.bio,
    created_at: u.createdAt ?? u.created_at,
    updated_at: u.updatedAt ?? u.updated_at,
  };
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
          // Spring backend: POST /api/auth/login (no trailing slash)
          const response = await apiClient.post<{ accessToken?: string; user?: any }>(
            '/auth/login',
            { email, password }
          );

          // Set JWT from Spring field name
          const token = (response.data as any).accessToken;
          if (token) {
            setAccessToken(token);
          }

          const mappedUser = mapApiUserToFrontend((response.data as any).user);

          set({
            user: mappedUser || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Apply user preferences centrally via the UI store
          const ui = useUIStore.getState();
          if (mappedUser?.locale) {
            ui.setLanguage(mappedUser.locale as 'uk' | 'en');
          }
          if (mappedUser?.theme) {
            ui.setTheme(mappedUser.theme as 'light' | 'dark');
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
          // Optional: call backend if endpoint exists; ignore failures
          await apiClient.post('/auth/logout');
        } catch (e) {
          // no-op
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
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
          // Spring backend: GET /api/users/me (no /auth prefix)
          const response = await apiClient.get<any>('/users/me');
          const mappedUser = mapApiUserToFrontend(response.data);
          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
          });

          const ui = useUIStore.getState();
          if (mappedUser?.locale) {
            ui.setLanguage(mappedUser.locale as 'uk' | 'en');
          }
          if (mappedUser?.theme) {
            ui.setTheme(mappedUser.theme as 'light' | 'dark');
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUserPreferences: async (locale?: 'uk' | 'en', theme?: 'light' | 'dark') => {
        try {
          // Spring expects UpdateUserRequest with camelCase and locale enum in upper-case
          const payload: any = {};
          if (locale) payload.locale = (locale === 'uk' ? 'UK' : 'EN');
          if (theme) payload.theme = theme;
          const response = await apiClient.put<any>('/users/me', payload);
          const mappedUser = mapApiUserToFrontend(response.data);
          set({ user: mappedUser });

          const ui = useUIStore.getState();
          if (locale) ui.setLanguage(locale);
          if (theme) ui.setTheme(theme);
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
