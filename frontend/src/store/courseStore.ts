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
      set({ courses: response.data.results, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchCourseById: async (id: string) => {
    set({ isLoadingCourse: true, error: null });
    try {
      const response = await coursesApi.getById(id);
      set({ currentCourse: response.data, isLoadingCourse: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingCourse: false });
    }
  },

  fetchModules: async (courseId: string) => {
    set({ isLoadingModules: true, error: null });
    try {
      const response = await modulesApi.getAll(courseId);
      const modules = Array.isArray(response.data) ? response.data : response.data.results;
      set({ modules, isLoadingModules: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingModules: false });
    }
  },

  fetchAssignments: async (courseId: string) => {
    set({ isLoadingAssignments: true, error: null });
    try {
      const response = await assignmentsApi.getAll(courseId);
      const assignments = Array.isArray(response.data) ? response.data : response.data.results;
      set({ assignments, isLoadingAssignments: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingAssignments: false });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));

