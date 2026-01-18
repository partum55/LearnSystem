import apiClient from './client';
import { User } from '../types';

/**
 * Users API endpoints
 */
export const usersApi = {
  /**
   * Get current authenticated user profile
   */
  getCurrentUser: () => apiClient.get<User>('/users/me/'),

  /**
   * Get a user by ID
   */
  getById: (id: string) => apiClient.get<User>(`/users/${id}/`),

  /**
   * Get all users (admin only)
   */
  getAll: (params?: { role?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient.get<{ results: User[] }>(`/users/${query}`);
  },

  /**
   * Search users by email or name
   */
  search: (searchTerm: string) =>
    apiClient.get<{ results: User[] }>(`/users/search/?q=${encodeURIComponent(searchTerm)}`),

  /**
   * Update current user profile
   */
  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/users/me/', data),

  /**
   * Update user avatar
   */
  updateAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.patch<User>('/users/me/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Change password
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/users/me/change-password/', {
      current_password: currentPassword,
      new_password: newPassword
    }),

  /**
   * Admin: Create a new user
   */
  create: (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password?: string;
  }) => apiClient.post<User>('/users/', {
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    role: data.role,
    password: data.password
  }),

  /**
   * Admin: Update a user
   */
  adminUpdate: (id: string, data: Partial<User>) =>
    apiClient.patch<User>(`/users/${id}/`, data),

  /**
   * Admin: Delete a user
   */
  delete: (userId: string) =>
    apiClient.delete(`/users/${userId}/`),
};

