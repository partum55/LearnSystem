import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progressApi } from '../api/progress';

export const useModuleProgress = (moduleId: string | undefined) =>
  useQuery({
    queryKey: ['progress', 'module', moduleId],
    queryFn: () => progressApi.getModuleProgress(moduleId!).then((r) => r.data),
    enabled: !!moduleId,
  });

export const useCourseProgress = (courseId: string | undefined) =>
  useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: () => progressApi.getCourseProgress(courseId!).then((r) => r.data),
    enabled: !!courseId,
  });

export const useMarkComplete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { courseId: string; moduleId: string; contentType: string; contentId: string }) =>
      progressApi.markComplete(params.courseId, params.moduleId, params.contentType, params.contentId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['progress', 'module', variables.moduleId] });
      void queryClient.invalidateQueries({ queryKey: ['progress', 'course', variables.courseId] });
    },
  });
};
