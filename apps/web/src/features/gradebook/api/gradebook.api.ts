import apiClient from '@/api/client';
import type {
  GradebookCellUpdateRequest,
  GradebookPublishRequest,
  StudentGradebookDto,
  TeacherGradebookDto,
} from './gradebook.types';

export const canonicalGradebookApi = {
  getStudent: (courseId: string) =>
    apiClient.request<StudentGradebookDto>({ url: `/v1/courses/${courseId}/gradebook/me` }),

  getTeacher: (courseId: string) =>
    apiClient.request<TeacherGradebookDto>({ url: `/v1/courses/${courseId}/gradebook` }),

  updateCells: (courseId: string, request: GradebookCellUpdateRequest) =>
    apiClient.request<void>({
      method: 'PATCH',
      url: `/v1/courses/${courseId}/gradebook/cells`,
      data: request,
    }),

  publish: (courseId: string, request: GradebookPublishRequest) =>
    apiClient.request<void>({
      method: 'POST',
      url: `/v1/courses/${courseId}/gradebook/publish`,
      data: request,
    }),
};
