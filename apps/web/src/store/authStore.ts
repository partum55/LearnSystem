import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';
import apiClient from '../api/client';
import { useUIStore, type ThemeMode } from './uiStore';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';

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
    displayName: u.displayName ?? u.display_name ?? '',
    firstName: u.firstName ?? u.first_name,
    lastName: u.lastName ?? u.last_name,
    studentId: u.studentId ?? u.student_id,
    role: (u.role as UserRole) || 'STUDENT',
    // Backend returns 'UK'|'EN'; normalize to 'uk'|'en'
    locale: (typeof u.locale === 'string' ? u.locale.toLowerCase() : u.locale) as 'uk' | 'en',
    theme: u.theme === 'dark' || u.theme === 'obsidian' ? 'dark' : 'light',
    avatar: u.avatarUrl ?? u.avatar,
    bio: u.bio,
    createdAt: u.createdAt ?? u.created_at ?? '',
    updatedAt: u.updatedAt ?? u.updated_at ?? '',
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
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (!data.user) throw new Error('Login failed');

          // Fetch additional profile data from Gateway
          const response = await apiClient.get<ApiUser>('/users/me');
          const mappedUser = mapApiUserToFrontend(response.data);

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
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.signOut();
        } catch {
          // ignore failures
        } finally {
          // First, clear all local state IMMEDIATELY
          set({
            user: null,
            isAuthenticated: false,
            error: null,
            isLoading: false,
          });

          localStorage.removeItem('auth-storage');
          
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }
      },

      fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const supabase = getSupabaseBrowserClient();
          const { data: { user: sbUser } } = await supabase.auth.getUser();

          if (!sbUser) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Spring backend: GET /api/users/me
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
          // Fallback: If Gateway profile fails but Supabase session exists,
          // we might still be "partially" authenticated. For now, require both.
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUserPreferences: async (locale?: 'uk' | 'en', theme?: ThemeMode) => {
        try {
          const payload: Record<string, unknown> = {};
          if (locale) payload.locale = (locale === 'uk' ? 'UK' : 'EN');
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
