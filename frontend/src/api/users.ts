import apiClient from './client';
import { User } from '../types';

interface ApiUser {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  role: 'SUPERADMIN' | 'TEACHER' | 'STUDENT' | 'TA';
  locale?: 'UK' | 'EN';
  theme?: 'light' | 'dark';
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const mapApiUserToFrontend = (u: ApiUser): User => ({
  id: u.id,
  email: u.email,
  display_name: u.displayName || '',
  first_name: u.firstName,
  last_name: u.lastName,
  student_id: u.studentId,
  role: u.role,
  locale: (u.locale?.toLowerCase() as 'uk' | 'en') || 'uk',
  theme: u.theme === 'dark' ? 'dark' : 'light',
  avatar: u.avatarUrl,
  bio: u.bio,
  created_at: u.createdAt || '',
  updated_at: u.updatedAt || '',
});

const mapFrontendUpdateToApi = (data: Partial<User>) => ({
  displayName: data.display_name,
  firstName: data.first_name,
  lastName: data.last_name,
  bio: data.bio,
  locale: data.locale ? data.locale.toUpperCase() : undefined,
  theme: data.theme,
  avatarUrl: data.avatar,
});

/**
 * Users API endpoints
 */
export const usersApi = {
  /**
   * Get current authenticated user profile
   */
  getCurrentUser: async () => {
    const response = await apiClient.get<ApiUser>('/users/me');
    return { ...response, data: mapApiUserToFrontend(response.data) };
  },

  /**
   * Get a user by ID
   */
  getById: async (id: string) => {
    const response = await apiClient.get<ApiUser>(`/users/${id}`);
    return { ...response, data: mapApiUserToFrontend(response.data) };
  },

  /**
   * Get all users (admin/teacher)
   */
  getAll: async (params?: { role?: string; search?: string; page?: number; size?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.search) searchParams.append('query', params.search);
    searchParams.append('page', String(params?.page ?? 0));
    searchParams.append('size', String(params?.size ?? 20));

    const response = await apiClient.get<PageResponse<ApiUser>>(`/users?${searchParams.toString()}`);
    return {
      ...response,
      data: {
        ...response.data,
        content: response.data.content.map(mapApiUserToFrontend),
      },
    };
  },

  /**
   * Search users by email or name
   */
  search: async (searchTerm: string) => {
    const response = await apiClient.get<PageResponse<ApiUser>>(
      `/users?query=${encodeURIComponent(searchTerm)}&size=20`
    );
    return {
      ...response,
      data: response.data.content.map(mapApiUserToFrontend),
    };
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.put<ApiUser>('/users/me', mapFrontendUpdateToApi(data));
    return { ...response, data: mapApiUserToFrontend(response.data) };
  },

  /**
   * Update user avatar
   */
  updateAvatar: async (file: File) => {
    void file;
    throw new Error('Avatar upload endpoint is not implemented in backend.');
  },

  /**
   * Change password
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/users/me/change-password', {
      currentPassword,
      newPassword,
    }),

  /**
   * Admin: Create a new user
   */
  create: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password?: string;
  }) => {
    const response = await apiClient.post<ApiUser>('/auth/register', {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      locale: 'UK',
    });
    return { ...response, data: mapApiUserToFrontend(response.data) };
  },

  /**
   * Admin: Update a user
   */
  adminUpdate: async (id: string, data: Partial<User>) => {
    const response = await apiClient.put<ApiUser>(`/users/${id}`, mapFrontendUpdateToApi(data));
    return { ...response, data: mapApiUserToFrontend(response.data) };
  },

  /**
   * Admin: Delete a user
   */
  delete: (userId: string) => apiClient.delete(`/users/${userId}`),
};
