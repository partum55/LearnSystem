import apiClient from '@/api/client';
import type { PageResponse } from '@/features/users/api/users.types';
import type {
  CourseModuleDto,
  CourseModulesResponse,
  CourseOverviewDto,
  CourseSummaryDto,
  AdminCourseDto,
  CourseMemberDto,
  CourseMemberRequest,
  CourseMembersResponse,
  CreateCourseRequest,
  ModuleRequest,
} from './canonical.types';

export const canonicalCoursesApi = {
  getMyActive: () =>
    apiClient.request<CourseSummaryDto[]>({ url: '/v1/courses/my-active' }),

  getMyTeaching: () =>
    apiClient.request<CourseSummaryDto[]>({ url: '/v1/courses/my-teaching' }),

  createCourse: (request: CreateCourseRequest) =>
    apiClient.request<AdminCourseDto>({ method: 'POST', url: '/v1/courses', data: request }),

  getAdminCourses: (params?: { page?: number; size?: number }) =>
    apiClient.request<PageResponse<AdminCourseDto>>({
      url: '/v1/admin/courses',
      params,
    }),

  getOverview: (courseId: string) =>
    apiClient.request<CourseOverviewDto>({ url: `/v1/courses/${courseId}/overview` }),

  getModules: (courseId: string) =>
    apiClient.request<CourseModulesResponse>({ url: `/v1/courses/${courseId}/modules` }),

  createModule: (courseId: string, request: ModuleRequest) =>
    apiClient.request<CourseModuleDto>({ method: 'POST', url: `/v1/courses/${courseId}/modules`, data: request }),

  updateModule: (moduleId: string, request: Partial<ModuleRequest>) =>
    apiClient.request<CourseModuleDto>({ method: 'PATCH', url: `/v1/modules/${moduleId}`, data: request }),

  deleteModule: (moduleId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/modules/${moduleId}` }),

  getMembers: (courseId: string, params?: { role?: string; page?: number; size?: number }) =>
    apiClient.request<CourseMembersResponse>({
      url: `/v1/courses/${courseId}/members`,
      params,
    }),

  addMember: (courseId: string, request: CourseMemberRequest) =>
    apiClient.request<CourseMemberDto>({
      method: 'POST',
      url: `/v1/courses/${courseId}/members`,
      data: request,
    }),

  updateMember: (courseId: string, userId: string, request: CourseMemberRequest) =>
    apiClient.request<CourseMemberDto>({
      method: 'PATCH',
      url: `/v1/courses/${courseId}/members/${userId}`,
      data: request,
    }),

  removeMember: (courseId: string, userId: string) =>
    apiClient.request<void>({
      method: 'DELETE',
      url: `/v1/courses/${courseId}/members/${userId}`,
    }),
};
