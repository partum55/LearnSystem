import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { canonicalCoursesApi } from '../api/courses.api';
import type { CourseMemberRequest, CreateCourseRequest, ModuleRequest } from '../api/canonical.types';

export const useActiveCourses = () =>
  useQuery({
    queryKey: queryKeys.courses.myActive(),
    queryFn: canonicalCoursesApi.getMyActive,
  });

export const useTeachingCourses = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.courses.myTeaching(),
    queryFn: canonicalCoursesApi.getMyTeaching,
    enabled,
  });

export const useAdminCourses = (params?: { page?: number; size?: number }) =>
  useQuery({
    queryKey: queryKeys.courses.adminList(params),
    queryFn: () => canonicalCoursesApi.getAdminCourses(params),
  });

export const useCourseOverview = (courseId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.courses.overview(courseId || ''),
    queryFn: () => canonicalCoursesApi.getOverview(courseId!),
    enabled: Boolean(courseId),
  });

export const useCourseModules = (courseId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.courses.modules(courseId || ''),
    queryFn: () => canonicalCoursesApi.getModules(courseId!),
    enabled: Boolean(courseId),
  });

export const useCreateModule = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ModuleRequest) => canonicalCoursesApi.createModule(courseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(courseId) });
    },
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCourseRequest) => canonicalCoursesApi.createCourse(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const useCourseMembers = (
  courseId: string | undefined,
  params?: { role?: string; page?: number; size?: number }
) =>
  useQuery({
    queryKey: queryKeys.courses.members(courseId || '', params),
    queryFn: () => canonicalCoursesApi.getMembers(courseId!, params),
    enabled: Boolean(courseId),
  });

export const useAddCourseMember = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CourseMemberRequest) => canonicalCoursesApi.addMember(courseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.members(courseId) });
    },
  });
};

export const useUpdateCourseMember = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: CourseMemberRequest }) =>
      canonicalCoursesApi.updateMember(courseId, userId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.members(courseId) });
    },
  });
};

export const useRemoveCourseMember = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => canonicalCoursesApi.removeMember(courseId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.members(courseId) });
    },
  });
};
