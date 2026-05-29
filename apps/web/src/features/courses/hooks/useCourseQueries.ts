import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { canonicalCoursesApi } from '../api/courses.api';
import type { CourseMemberRequest, CreateCourseRequest, ModuleRequest, UpdateCourseSettingsRequest } from '../api/canonical.types';

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

export const useCoursesList = (params?: { status?: string }, enabled = true) =>
  useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => canonicalCoursesApi.getCourses(params),
    enabled,
  });

export const useAdminCourses = (params?: { page?: number; size?: number }, enabled = true) =>
  useQuery({
    queryKey: queryKeys.courses.adminList(params),
    queryFn: () => canonicalCoursesApi.getAdminCourses(params),
    enabled,
  });

export const useCourseOverview = (courseId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.courses.overview(courseId || ''),
    queryFn: () => canonicalCoursesApi.getOverview(courseId!),
    enabled: Boolean(courseId),
  });

export const useCourseSettings = (
  courseId: string | undefined,
  enabled = true,
  options?: { adminFallback?: boolean }
) =>
  useQuery({
    queryKey: queryKeys.courses.settings(courseId || ''),
    queryFn: async () => {
      try {
        return await canonicalCoursesApi.getCourseSettings(courseId!);
      } catch (error) {
        const status = (error as { status?: number })?.status;
        if (options?.adminFallback && (status === 404 || status === 405)) {
          const adminCourse = await canonicalCoursesApi.getAdminCourse(courseId!);
          return {
            id: adminCourse.id,
            code: adminCourse.code,
            titleUk: adminCourse.titleUk,
            titleEn: adminCourse.titleEn,
            descriptionUk: adminCourse.descriptionUk,
            descriptionEn: adminCourse.descriptionEn,
            syllabus: null,
            status: adminCourse.status,
            ownerId: adminCourse.ownerId,
            updatedAt: adminCourse.updatedAt,
          };
        }
        throw error;
      }
    },
    enabled: Boolean(courseId) && enabled,
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

export const useUpdateModule = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, request }: { moduleId: string; request: Partial<ModuleRequest> }) =>
      canonicalCoursesApi.updateModule(moduleId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(courseId) });
    },
  });
};

export const useDeleteModule = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => canonicalCoursesApi.deleteModule(moduleId),
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

export const useUpdateCourseSettings = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateCourseSettingsRequest) =>
      canonicalCoursesApi.updateCourseSettings(courseId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const useArchiveCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => canonicalCoursesApi.archiveCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const usePublishCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => canonicalCoursesApi.publishCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const useUnpublishCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => canonicalCoursesApi.unpublishCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const useRestoreCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => canonicalCoursesApi.restoreCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
};

export const useDeleteCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => canonicalCoursesApi.deleteCourse(courseId),
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

export const useEnrollmentGroups = () =>
  useQuery({
    queryKey: ['enrollment-groups', 'list'],
    queryFn: canonicalCoursesApi.getEnrollmentGroups,
  });

export const useCreateEnrollmentGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => canonicalCoursesApi.createEnrollmentGroup(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups'] });
    },
  });
};

export const useDeleteEnrollmentGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => canonicalCoursesApi.deleteEnrollmentGroup(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups'] });
    },
  });
};

export const useEnrollmentGroupMembers = (groupId: string | undefined) =>
  useQuery({
    queryKey: ['enrollment-groups', 'members', groupId],
    queryFn: () => canonicalCoursesApi.getEnrollmentGroupMembers(groupId!),
    enabled: Boolean(groupId),
  });

export const useAddEnrollmentGroupMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => canonicalCoursesApi.addEnrollmentGroupMember(groupId, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups', 'members', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups', 'list'] });
    },
  });
};

export const useRemoveEnrollmentGroupMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => canonicalCoursesApi.removeEnrollmentGroupMember(groupId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups', 'members', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-groups', 'list'] });
    },
  });
};

export const useCourseEnrollmentGroups = (courseId: string | undefined) =>
  useQuery({
    queryKey: ['courses', courseId, 'enrollment-groups'],
    queryFn: () => canonicalCoursesApi.getCourseEnrollmentGroups(courseId!),
    enabled: Boolean(courseId),
  });

export const useEnrollGroupToCourse = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => canonicalCoursesApi.enrollGroupToCourse(courseId, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'enrollment-groups'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.members(courseId) });
    },
  });
};

export const useRemoveCourseEnrollmentGroup = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => canonicalCoursesApi.removeCourseEnrollmentGroup(courseId, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'enrollment-groups'] });
    },
  });
};

export const useBulkEnrollPreview = (courseId: string) => {
  return useMutation({
    mutationFn: (rows: Array<{ email: string; role: string }>) =>
      canonicalCoursesApi.bulkEnrollPreview(courseId, rows),
  });
};

export const useBulkEnrollConfirm = (courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollments: Array<{ userId: string; role: string }>) =>
      canonicalCoursesApi.bulkEnrollConfirm(courseId, enrollments),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.members(courseId) });
    },
  });
};
