import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { usersApi } from '../api/users.api';
import type { AdminUpdateUserRequest, GlobalRole } from '../api/users.types';

export const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: usersApi.me,
  });

export const useAdminUsers = (params?: { query?: string; role?: GlobalRole; page?: number; size?: number }) =>
  useQuery({
    queryKey: queryKeys.users.adminList(params),
    queryFn: () => usersApi.listAdminUsers(params),
  });

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: AdminUpdateUserRequest }) =>
      usersApi.updateAdminUser(userId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};
