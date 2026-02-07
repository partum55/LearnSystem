import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { queryKeys } from '../api/queryClient';
import { User } from '../types';

/**
 * React Query hooks for user data.
 * Complements authStore for server-state user management.
 */

// ==================== USER QUERIES ====================

/**
 * Fetch current user profile
 */
export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: async () => {
      const response = await usersApi.getCurrentUser();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

/**
 * Fetch a user by ID
 */
export function useUserQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId || ''),
    queryFn: async () => {
      const response = await usersApi.getById(userId!);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all users (admin only)
 */
export function useUsersListQuery(params?: { role?: string; search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.users.list(), params],
    queryFn: async () => {
      const response = await usersApi.getAll(params);
      return response.data?.content || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Search users by email or name
 */
export function useSearchUsersQuery(searchTerm: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.users.all, 'search', searchTerm],
    queryFn: async () => {
      const response = await usersApi.search(searchTerm);
      return response.data || [];
    },
    enabled: options?.enabled !== false && searchTerm.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// ==================== USER MUTATIONS ====================

/**
 * Update user profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await usersApi.updateProfile(data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Update current user cache
      queryClient.setQueryData(queryKeys.users.current(), updatedUser);

      // Update detail cache if exists
      if (updatedUser.id) {
        queryClient.setQueryData(
          queryKeys.users.detail(updatedUser.id),
          updatedUser
        );
      }
    },
  });
}

/**
 * Update user avatar
 */
export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      await usersApi.updateAvatar(file);
      return null;
    },
    onSuccess: () => {
      // Invalidate current user to refetch with new avatar
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    },
  });
}

/**
 * Change password
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await usersApi.changePassword(currentPassword, newPassword);
      return response.data;
    },
  });
}

/**
 * Admin: Create a new user
 */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      password?: string;
    }) => {
      const response = await usersApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}

/**
 * Admin: Update a user
 */
export function useAdminUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await usersApi.adminUpdate(id, data);
      return response.data;
    },
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData(queryKeys.users.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}

/**
 * Admin: Delete a user
 */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: (_, userId) => {
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}
