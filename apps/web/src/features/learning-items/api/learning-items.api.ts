import apiClient from '@/api/client';
import type {
  LearningItemDto,
  LearningItemRequest,
  LessonPageDto,
  LessonPageReorderRequest,
  LessonPageRequest,
} from '@/features/courses/api/canonical.types';

export const learningItemsApi = {
  create: (courseId: string, moduleId: string, request: LearningItemRequest) =>
    apiClient.request<LearningItemDto>({
      method: 'POST',
      url: `/v1/courses/${courseId}/modules/${moduleId}/learning-items`,
      data: request,
    }),

  get: (learningItemId: string) =>
    apiClient.request<LearningItemDto>({ url: `/v1/learning-items/${learningItemId}` }),

  update: (learningItemId: string, request: Partial<LearningItemRequest>) =>
    apiClient.request<LearningItemDto>({
      method: 'PATCH',
      url: `/v1/learning-items/${learningItemId}`,
      data: request,
    }),

  archive: (learningItemId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/learning-items/${learningItemId}` }),

  listPages: (learningItemId: string) =>
    apiClient.request<LessonPageDto[]>({ url: `/v1/learning-items/${learningItemId}/pages` }),

  createPage: (learningItemId: string, request: LessonPageRequest) =>
    apiClient.request<LessonPageDto>({
      method: 'POST',
      url: `/v1/learning-items/${learningItemId}/pages`,
      data: request,
    }),

  updatePage: (learningItemId: string, pageId: string, request: Partial<LessonPageRequest>) =>
    apiClient.request<LessonPageDto>({
      method: 'PATCH',
      url: `/v1/learning-items/${learningItemId}/pages/${pageId}`,
      data: request,
    }),

  deletePage: (learningItemId: string, pageId: string) =>
    apiClient.request<void>({
      method: 'DELETE',
      url: `/v1/learning-items/${learningItemId}/pages/${pageId}`,
    }),

  reorderPages: (learningItemId: string, request: LessonPageReorderRequest) =>
    apiClient.request({
      method: 'PATCH',
      url: `/v1/learning-items/${learningItemId}/pages/reorder`,
      data: request,
    }),
};
