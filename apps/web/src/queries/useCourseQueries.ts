import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, type CourseCreatePayload, type CourseUpdatePayload } from '../services/courseService';

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
  enrolled: () => [...courseKeys.all, 'enrolled'] as const,
};

export function useCoursesQuery() {
  return useQuery({
    queryKey: courseKeys.lists(),
    queryFn: () => courseService.getMyCourses(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourseQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(courseId || ''),
    queryFn: () => courseService.getCourseById(courseId!),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CourseCreatePayload) => courseService.createCourse(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.setQueryData(courseKeys.detail(newCourse.id), newCourse);
    },
  });
}

export function useUpdateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdatePayload }) =>
      courseService.updateCourse(id, data),
    onSuccess: (updatedCourse, { id }) => {
      queryClient.setQueryData(courseKeys.detail(id), updatedCourse);
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

