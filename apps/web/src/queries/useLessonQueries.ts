import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonsApi } from '../api/lessons';

export const useLesson = (lessonId: string | undefined) =>
  useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonsApi.getById(lessonId!).then((r) => r.data),
    enabled: !!lessonId,
  });

export const useLessonProgress = (lessonId: string | undefined) =>
  useQuery({
    queryKey: ['lesson', lessonId, 'progress'],
    queryFn: () => lessonsApi.getProgress(lessonId!).then((r) => r.data),
    enabled: !!lessonId,
  });

export const useCreateLesson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { moduleId: string; title: string; summary?: string }) =>
      lessonsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

export const useUpdateLesson = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; data: { title?: string; summary?: string; isPublished?: boolean } }) =>
      lessonsApi.update(params.id, params.data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['lesson', variables.id] });
    },
  });
};

export const useAddLessonStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { lessonId: string; data: { blockType: string; title: string; content?: string; questions?: Array<Record<string, unknown>> } }) =>
      lessonsApi.addStep(params.lessonId, params.data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['lesson', variables.lessonId] });
    },
  });
};

export const useCompleteStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { lessonId: string; stepId: string }) =>
      lessonsApi.completeStep(params.lessonId, params.stepId).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['lesson', variables.lessonId, 'progress'] });
    },
  });
};
