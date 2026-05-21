import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { learningItemsApi } from '../api/learning-items.api';
import type { LearningItemRequest, LessonBlockRequest, LessonBlockReorderRequest } from '@/features/courses/api/canonical.types';

export const useLearningItem = (learningItemId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.learningItems.detail(learningItemId || ''),
    queryFn: () => learningItemsApi.get(learningItemId!),
    enabled: Boolean(learningItemId),
  });

export const useLessonBlocks = (learningItemId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.learningItems.blocks(learningItemId || ''),
    queryFn: () => learningItemsApi.listBlocks(learningItemId!),
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
    mutationFn: (params: { learningItemId: string; request: LearningItemRequest }) =>
      learningItemsApi.update(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.detail(variables.learningItemId) });
    },
  });
};

export const useCreateLessonBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; request: LessonBlockRequest }) =>
      learningItemsApi.createBlock(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useUpdateLessonBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; blockId: string; request: LessonBlockRequest }) =>
      learningItemsApi.updateBlock(params.learningItemId, params.blockId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useDeleteLessonBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; blockId: string }) =>
      learningItemsApi.deleteBlock(params.learningItemId, params.blockId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};

export const useReorderLessonBlocks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { learningItemId: string; request: LessonBlockReorderRequest }) =>
      learningItemsApi.reorderBlocks(params.learningItemId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningItems.blocks(variables.learningItemId) });
    },
  });
};
