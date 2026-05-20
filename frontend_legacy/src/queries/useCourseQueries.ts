import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, modulesApi } from '../api/courses';
import { queryKeys } from '../api/queryClient';
import { Course, Module, CourseCreateData } from '../types';

/**
 * React Query hooks for course data fetching.
 * Replaces manual useState/useEffect patterns with proper caching and deduplication.
 */

// ==================== COURSE QUERIES ====================

/**
 * Fetch all courses
 */
export function useCoursesQuery() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: async () => {
      const response = await coursesApi.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single course by ID
 */
export function useCourseQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId || ''),
    queryFn: async () => {
      const response = await coursesApi.getById(courseId!);
      return response.data;
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch enrolled courses for current user
 */
export function useEnrolledCoursesQuery() {
  return useQuery({
    queryKey: queryKeys.courses.enrolled(),
    queryFn: async () => {
      const response = await coursesApi.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch course members
 */
export function useCourseMembers(courseId: string | undefined, role?: string) {
  return useQuery({
    queryKey: [...queryKeys.courses.detail(courseId || ''), 'members', role],
    queryFn: async () => {
      const response = await coursesApi.getMembers(courseId!, role);
      return response.data;
    },
    enabled: !!courseId,
  });
}

// ==================== COURSE MUTATIONS ====================

/**
 * Create a new course
 */
export function useCreateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CourseCreateData) => {
      const response = await coursesApi.create(data);
      return response.data;
    },
    onSuccess: (newCourse) => {
      // Invalidate courses list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });

      // Optionally add to cache immediately
      queryClient.setQueryData(
        queryKeys.courses.detail(newCourse.id),
        newCourse
      );
    },
  });
}

/**
 * Update an existing course
 */
export function useUpdateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      const response = await coursesApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedCourse, { id }) => {
      // Update the specific course in cache
      queryClient.setQueryData(queryKeys.courses.detail(id), updatedCourse);

      // Invalidate the list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.list() });
    },
  });
}

/**
 * Delete a course
 */
export function useDeleteCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => coursesApi.delete(courseId),
    onSuccess: (_, courseId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.courses.detail(courseId) });

      // Invalidate list
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.list() });
    },
  });
}

/**
 * Enroll students in a course
 */
export function useEnrollStudentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      emails,
      role = 'STUDENT'
    }: {
      courseId: string;
      emails: string[];
      role?: string;
    }) => coursesApi.enrollStudents(courseId, emails, role),
    onSuccess: (_, { courseId }) => {
      // Invalidate course members
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.courses.detail(courseId), 'members']
      });
    },
  });
}

// ==================== MODULE QUERIES ====================

/**
 * Fetch modules for a course
 */
export function useModulesQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.courses.detail(courseId || ''), 'modules'],
    queryFn: async () => {
      const response = await modulesApi.getAll(courseId!);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single module by ID
 */
export function useModuleQuery(courseId: string | undefined, moduleId: string | undefined) {
  return useQuery({
    queryKey: ['modules', 'detail', courseId, moduleId],
    queryFn: async () => {
      const response = await modulesApi.getById(courseId!, moduleId!);
      return response.data;
    },
    enabled: !!courseId && !!moduleId,
  });
}

// ==================== MODULE MUTATIONS ====================

/**
 * Create a new module
 */
export function useCreateModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      course: string;
      title: string;
      description?: string;
      is_published?: boolean;
    }) => modulesApi.create(data),
    onSuccess: (_, { course }) => {
      // Invalidate modules for this course
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.courses.detail(course), 'modules']
      });
    },
  });
}

/**
 * Update a module
 */
export function useUpdateModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, moduleId, data }: { courseId: string; moduleId: string; data: Partial<Module> }) =>
      modulesApi.update(courseId, moduleId, data),
    onSuccess: (_, { courseId }) => {
      // Invalidate modules for the course
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.courses.detail(courseId), 'modules']
      });
    },
  });
}

/**
 * Delete a module
 */
export function useDeleteModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, moduleId }: { courseId: string; moduleId: string }) =>
      modulesApi.delete(courseId, moduleId),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.courses.detail(courseId), 'modules']
      });
    },
  });
}

