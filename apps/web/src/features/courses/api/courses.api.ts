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
  EnrollmentGroupDto,
  EnrollmentGroupMemberDto,
  BulkPreviewRow,
  BulkPreviewResponse,
  BulkConfirmEnrollment,
  CourseSettingsDto,
  UpdateCourseSettingsRequest,
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

  getCourseSettings: (courseId: string) =>
    apiClient.request<CourseSettingsDto>({ url: `/v1/courses/${courseId}/settings` }),

  updateCourseSettings: (courseId: string, request: UpdateCourseSettingsRequest) =>
    apiClient.request<CourseSettingsDto>({
      method: 'PATCH',
      url: `/v1/courses/${courseId}/settings`,
      data: request,
    }),

  archiveCourse: (courseId: string) =>
    apiClient.request<AdminCourseDto>({ method: 'POST', url: `/v1/courses/${courseId}/archive` }),

  restoreCourse: (courseId: string) =>
    apiClient.request<AdminCourseDto>({ method: 'POST', url: `/v1/courses/${courseId}/restore` }),

  deleteCourse: (courseId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/courses/${courseId}` }),

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

  getEnrollmentGroups: () =>
    apiClient.request<EnrollmentGroupDto[]>({ url: '/v1/enrollment-groups' }),

  createEnrollmentGroup: (name: string) =>
    apiClient.request<EnrollmentGroupDto>({ method: 'POST', url: '/v1/enrollment-groups', data: { name } }),

  deleteEnrollmentGroup: (groupId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/enrollment-groups/${groupId}` }),

  getEnrollmentGroupMembers: (groupId: string) =>
    apiClient.request<EnrollmentGroupMemberDto[]>({ url: `/v1/enrollment-groups/${groupId}/members` }),

  addEnrollmentGroupMember: (groupId: string, email: string) =>
    apiClient.request<EnrollmentGroupMemberDto>({ method: 'POST', url: `/v1/enrollment-groups/${groupId}/members`, data: { email } }),

  removeEnrollmentGroupMember: (groupId: string, userId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/enrollment-groups/${groupId}/members/${userId}` }),

  enrollGroupToCourse: (courseId: string, groupId: string) =>
    apiClient.request<void>({ method: 'POST', url: `/v1/courses/${courseId}/enrollment-groups`, data: { groupId } }),

  getCourseEnrollmentGroups: (courseId: string) =>
    apiClient.request<EnrollmentGroupDto[]>({ url: `/v1/courses/${courseId}/enrollment-groups` }),

  removeCourseEnrollmentGroup: (courseId: string, groupId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/courses/${courseId}/enrollment-groups/${groupId}` }),

  bulkEnrollPreview: (courseId: string, rows: BulkPreviewRow[]) =>
    apiClient.request<BulkPreviewResponse>({ method: 'POST', url: `/v1/courses/${courseId}/members/bulk/preview`, data: { rows } }),

  bulkEnrollConfirm: (courseId: string, enrollments: BulkConfirmEnrollment[]) =>
    apiClient.request<CourseMemberDto[]>({ method: 'POST', url: `/v1/courses/${courseId}/members/bulk/confirm`, data: { enrollments } }),
};
