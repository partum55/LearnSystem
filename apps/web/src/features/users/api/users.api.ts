import apiClient from '@/api/client';
import type {
  AdminUpdateUserRequest,
  GlobalRole,
  PageResponse,
  UpdateCurrentUserRequest,
  UserProfileDto,
} from './users.types';

export const usersApi = {
  me: () =>
    apiClient.request<UserProfileDto>({ url: '/v1/users/me' }),

  updateMe: (request: UpdateCurrentUserRequest) =>
    apiClient.request<UserProfileDto>({
      method: 'PUT',
      url: '/v1/users/me',
      data: request,
    }),

  listAdminUsers: (params?: { query?: string; role?: GlobalRole; page?: number; size?: number }) =>
    apiClient.request<PageResponse<UserProfileDto>>({
      url: '/v1/admin/users',
      params,
    }),

  getAdminUser: (userId: string) =>
    apiClient.request<UserProfileDto>({ url: `/v1/admin/users/${userId}` }),

  updateAdminUser: (userId: string, request: AdminUpdateUserRequest) =>
    apiClient.request<UserProfileDto>({
      method: 'PATCH',
      url: `/v1/admin/users/${userId}`,
      data: request,
    }),
};
