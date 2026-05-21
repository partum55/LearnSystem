import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { canonicalGradebookApi } from '../api/gradebook.api';
import type { GradebookCellUpdateRequest, GradebookPublishRequest } from '../api/gradebook.types';

export const useStudentGradebook = (courseId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.gradebook.studentCourse(courseId || ''),
    queryFn: () => canonicalGradebookApi.getStudent(courseId!),
    enabled: Boolean(courseId),
  });

export const useTeacherGradebook = (courseId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.gradebook.teacherCourse(courseId || ''),
    queryFn: () => canonicalGradebookApi.getTeacher(courseId!),
    enabled: Boolean(courseId),
  });

export const useUpdateGradebookCells = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: GradebookCellUpdateRequest) => canonicalGradebookApi.updateCells(courseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.teacherCourse(courseId) });
    },
  });
};

export const usePublishGradebook = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: GradebookPublishRequest) => canonicalGradebookApi.publish(courseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.teacherCourse(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gradebook.studentCourse(courseId) });
    },
  });
};
