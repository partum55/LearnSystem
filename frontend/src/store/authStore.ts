import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';
import apiClient from '../api/client';
import { clearStoredTokens, getAccessToken, setAccessToken, setRefreshToken } from '../api/token';
import { useUIStore, type ThemeMode } from './uiStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateUserPreferences: (locale?: 'uk' | 'en', theme?: ThemeMode) => Promise<void>;
  /** Dev-only: set a mock user without hitting the backend */
  setUser: (user: User) => void;
}

interface ApiUser {
  id: string;
  email: string;
  displayName?: string;
  display_name?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  studentId?: string;
  student_id?: string;
  role: string;
  locale?: string;
  theme?: string;
  avatarUrl?: string;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

// Helper to map backend (camelCase, enum values) -> frontend User (snake_case, lowercase locale)
function mapApiUserToFrontend(u: ApiUser | null | undefined): User | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    display_name: u.displayName ?? u.display_name ?? '',
    first_name: u.firstName ?? u.first_name,
    last_name: u.lastName ?? u.last_name,
    student_id: u.studentId ?? u.student_id,
    role: u.role as UserRole,
    // Backend returns 'UK'|'EN'; normalize to 'uk'|'en'
    locale: (typeof u.locale === 'string' ? u.locale.toLowerCase() : u.locale) as 'uk' | 'en',
    theme: u.theme === 'dark' || u.theme === 'obsidian' ? 'dark' : 'light',
    avatar: u.avatarUrl ?? u.avatar,
    bio: u.bio,
    created_at: u.createdAt ?? u.created_at ?? '',
    updated_at: u.updatedAt ?? u.updated_at ?? '',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Spring backend: POST /api/auth/login (no trailing slash)
          const response = await apiClient.post<{ accessToken?: string; refreshToken?: string; user?: ApiUser }>(
            '/auth/login',
            { email, password }
          );

          // Set JWT tokens from Spring field names
          const token = response.data.accessToken;
          const refreshToken = response.data.refreshToken;
          if (token) {
            setAccessToken(token);
          }
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }

          const mappedUser = mapApiUserToFrontend(response.data.user);

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
            ui.setTheme(mappedUser.theme === 'dark' ? 'obsidian' : 'parchment');
          }
        } catch (err: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = err as any;
          clearStoredTokens();
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
        const tokenToRevoke = getAccessToken();

        // First, clear all local state IMMEDIATELY
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear tokens from memory and localStorage
        clearStoredTokens();
        localStorage.removeItem('auth-storage');

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
          // Optional: call backend logout if access token exists; ignore failures
          if (tokenToRevoke) {
            await apiClient.post('/auth/logout', null, {
              headers: {
                Authorization: `Bearer ${tokenToRevoke}`,
              },
            });
          }
        } catch {
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
          const response = await apiClient.get<ApiUser>('/users/me');
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
            ui.setTheme(mappedUser.theme === 'dark' ? 'obsidian' : 'parchment');
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUserPreferences: async (locale?: 'uk' | 'en', theme?: ThemeMode) => {
        try {
          // Spring expects UpdateUserRequest with camelCase and locale enum in upper-case
          const payload: Record<string, unknown> = {};
          if (locale) payload.locale = (locale === 'uk' ? 'UK' : 'EN');
          // Backend stores 'dark'/'light'; map named themes
          if (theme) payload.theme = theme === 'obsidian' ? 'dark' : 'light';
          const response = await apiClient.put<ApiUser>('/users/me', payload);
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
