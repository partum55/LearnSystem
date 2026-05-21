import apiClient from '@/api/client';
import type {
  LearningItemDto,
  LearningItemRequest,
  LessonBlockDto,
  LessonBlockReorderRequest,
  LessonBlockRequest,
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

  listBlocks: (learningItemId: string) =>
    apiClient.request<LessonBlockDto[]>({ url: `/v1/learning-items/${learningItemId}/blocks` }),

  createBlock: (learningItemId: string, request: LessonBlockRequest) =>
    apiClient.request<LessonBlockDto>({
      method: 'POST',
      url: `/v1/learning-items/${learningItemId}/blocks`,
      data: request,
    }),

  updateBlock: (learningItemId: string, blockId: string, request: Partial<LessonBlockRequest>) =>
    apiClient.request<LessonBlockDto>({
      method: 'PATCH',
      url: `/v1/learning-items/${learningItemId}/blocks/${blockId}`,
      data: request,
    }),

  deleteBlock: (learningItemId: string, blockId: string) =>
    apiClient.request<void>({
      method: 'DELETE',
      url: `/v1/learning-items/${learningItemId}/blocks/${blockId}`,
    }),

  reorderBlocks: (learningItemId: string, request: LessonBlockReorderRequest) =>
    apiClient.request({
      method: 'PATCH',
      url: `/v1/learning-items/${learningItemId}/blocks/reorder`,
      data: request,
    }),
};
