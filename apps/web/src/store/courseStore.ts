/**
 * @deprecated This store is deprecated and will be removed in a future version.
 * Please migrate to React Query hooks:
 *
 * - useCourseStore().fetchCourses() → useCoursesQuery()
 * - useCourseStore().fetchCourseById() → useCourseQuery(id)
 * - useCourseStore().fetchModules() → useModulesQuery(courseId)
 * - useCourseStore().createCourse() → useCreateCourseMutation()
 * - useCourseStore().updateCourse() → useUpdateCourseMutation()
 *
 * Import from '@/queries/useCourseQueries'
 */
import { create } from 'zustand';
import { Course, Module, Assignment, CourseCreateData } from '../types';
import { coursesApi, modulesApi, resourcesApi } from '../api/courses';
import { assignmentsApi } from '../api/assessments';

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  modules: Module[];
  assignments: Assignment[];
  isLoading: boolean;
  isLoadingCourse: boolean;
  isLoadingModules: boolean;
  isLoadingAssignments: boolean;
  error: string | null;
  fetchCourses: () => Promise<void>;
  fetchCourseById: (id: string) => Promise<void>;
  fetchModules: (courseId: string) => Promise<void>;
  fetchAssignments: (courseId: string) => Promise<void>;
  createCourse: (data: CourseCreateData) => Promise<Course>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  deleteModule: (courseId: string, moduleId: string) => Promise<void>;
  deleteResource: (courseId: string, moduleId: string, resourceId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  currentCourse: null,
  modules: [],
  assignments: [],
  isLoading: false,
  isLoadingCourse: false,
  isLoadingModules: false,
  isLoadingAssignments: false,
  error: null,

  fetchCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await coursesApi.getAll();
      const data = response.data as unknown;
      // Handle PageResponse format (content array) or direct array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let coursesArray: any[] = [];
      if (Array.isArray(data)) {
        coursesArray = data;
      } else if (data && typeof data === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageData = data as any;
        coursesArray = pageData.content || [];
      }

      // Normalize courses to ensure title/description are set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedCourses = coursesArray.map((course: any) => ({
        ...course,
        title: course.titleUk || course.titleEn || course.title || '',
        description: course.descriptionUk || course.descriptionEn || course.description || '',
      }));
      set({ courses: normalizedCourses, isLoading: false });
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to fetch courses', isLoading: false });
    }
  },

  fetchCourseById: async (id: string) => {
    set({ isLoadingCourse: true, error: null });
    try {
      const response = await coursesApi.getById(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const course = response.data as any;
      // Normalize course to ensure title/description are set
      const normalizedCourse = {
        ...course,
        title: course.titleUk || course.titleEn || course.title || '',
        description: course.descriptionUk || course.descriptionEn || course.description || '',
      };
      set({ currentCourse: normalizedCourse, isLoadingCourse: false });
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to fetch course', isLoadingCourse: false });
    }
  },

  fetchModules: async (courseId: string) => {
    set({ isLoadingModules: true, error: null });
    try {
      const response = await modulesApi.getAll(courseId);
      // Handle both array response and object with results property
      const data = response.data as unknown;
      let modules: Module[] = [];
      if (Array.isArray(data)) {
        modules = data as Module[];
      } else if (data && typeof data === 'object' && 'results' in data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modules = (data as any).results || [];
      }
      set({ modules, isLoadingModules: false });
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to fetch modules', isLoadingModules: false });
    }
  },

  fetchAssignments: async (courseId: string) => {
    set({ isLoadingAssignments: true, error: null });
    try {
      const response = await assignmentsApi.getAll(courseId);
      // Handle both array response and PageResponse with content property
      const data = response.data as unknown;
      let assignments: Assignment[] = [];

      if (Array.isArray(data)) {
        assignments = data as Assignment[];
      } else if (data && typeof data === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageData = data as any;
        if (pageData.content) assignments = pageData.content;
        else if (pageData.results) assignments = pageData.results;
      }
      set({ assignments, isLoadingAssignments: false });
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to fetch assignments', isLoadingAssignments: false });
    }
  },

  createCourse: async (data: CourseCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await coursesApi.create(data);
      set((state) => ({
        courses: [...state.courses, response.data],
        isLoading: false,
      }));
      return response.data;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to create course', isLoading: false });
      throw error;
    }
  },

  updateCourse: async (id: string, data: Partial<Course>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await coursesApi.update(id, data);
      set((state) => ({
        courses: state.courses.map((c) => (c.id === id ? response.data : c)),
        currentCourse: state.currentCourse?.id === id ? response.data : state.currentCourse,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to update course', isLoading: false });
      throw error;
    }
  },

  deleteCourse: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await coursesApi.delete(id);
      set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        currentCourse: state.currentCourse?.id === id ? null : state.currentCourse,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to delete course', isLoading: false });
      throw error;
    }
  },

  deleteModule: async (courseId: string, moduleId: string) => {
    set({ isLoadingModules: true, error: null });
    try {
      await modulesApi.delete(courseId, moduleId);
      set((state) => ({
        modules: state.modules.filter((m) => m.id !== moduleId),
        isLoadingModules: false,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to delete module', isLoadingModules: false });
      throw error;
    }
  },

  deleteResource: async (courseId: string, moduleId: string, resourceId: string) => {
    // Optimistic update or fetch-after-delete
    try {
      await resourcesApi.delete(courseId, moduleId, resourceId);
      // We need to update the module list because resources are nested in modules
      const { fetchModules } = get();
      await fetchModules(courseId);
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to delete resource' });
      throw error;
    }
  },

  deleteAssignment: async (assignmentId: string) => {
    set({ isLoadingAssignments: true, error: null });
    try {
      await assignmentsApi.delete(assignmentId);
      set((state) => ({
        assignments: state.assignments.filter((a) => a.id !== assignmentId),
        isLoadingAssignments: false,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to delete assignment', isLoadingAssignments: false });
      throw error;
    }
  },
}));

