import apiClient from '@/api/client';
import type {
  CourseModuleDto,
  CourseModulesResponse,
  CourseOverviewDto,
  CourseSummaryDto,
  ModuleRequest,
} from './canonical.types';

export const canonicalCoursesApi = {
  getMyActive: () =>
    apiClient.request<CourseSummaryDto[]>({ url: '/v1/courses/my-active' }),

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
};
