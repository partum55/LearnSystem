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
import { coursesApi, modulesApi } from '../api/courses';
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
}

export const useCourseStore = create<CourseState>((set) => ({
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
}));

