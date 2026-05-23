import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { learningItemsApi } from '../api/learning-items.api';
import type { LearningItemRequest, LessonPageRequest, LessonPageReorderRequest } from '@/features/courses/api/canonical.types';

export const useLearningItem = (learningItemId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.learningItems.detail(learningItemId || ''),
    queryFn: () => learningItemsApi.get(learningItemId!),
    enabled: Boolean(learningItemId),
  });

export const useLessonPages = (learningItemId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.learningItems.blocks(learningItemId || ''),
    queryFn: () => learningItemsApi.listPages(learningItemId!),
    enabled: Boolean(learningItemId),
  });

export const useCreateLearningItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { courseId: string; moduleId: string; request: LearningItemRequest }) =>
      learningItemsApi.create(params.courseId, params.moduleId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(variables.courseId) });
    },
  });
};

export const useUpdateLearningItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; request: LearningItemRequest; courseId?: string }) =>
      learningItemsApi.update(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.detail(variables.learningItemId) });
      if (variables.courseId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(variables.courseId) });
      }
    },
  });
};

export const useDeleteLearningItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; courseId?: string }) =>
      learningItemsApi.archive(params.learningItemId),
    onSuccess: (_data, variables) => {
      if (variables.courseId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(variables.courseId) });
      }
    },
  });
};

export const useCreateLessonPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; request: LessonPageRequest }) =>
      learningItemsApi.createPage(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useUpdateLessonPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; pageId: string; request: LessonPageRequest }) =>
      learningItemsApi.updatePage(params.learningItemId, params.pageId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useDeleteLessonPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; pageId: string }) =>
      learningItemsApi.deletePage(params.learningItemId, params.pageId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useReorderLessonPages = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; request: LessonPageReorderRequest }) =>
      learningItemsApi.reorderPages(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};
