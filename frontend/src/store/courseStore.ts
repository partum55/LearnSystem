import { create } from 'zustand';
import { Course, Module, Assignment, CourseCreateData } from '../types';
import apiClient from '../api/client';

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  modules: Module[];
  assignments: Assignment[];
  isLoading: boolean;
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
  error: null,

  fetchCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ results: Course[] }>('/courses/');
      set({ courses: response.data.results, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchCourseById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Course>(`/courses/${id}/`);
      set({ currentCourse: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchModules: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Module[] | { results: Module[] }>(`/courses/modules/?course=${courseId}`);
      const modules = Array.isArray(response.data) ? response.data : response.data.results;
      set({ modules, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAssignments: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Assignment[] | { results: Assignment[] }>(`/assessments/assignments/?course=${courseId}`);
      const assignments = Array.isArray(response.data) ? response.data : response.data.results;
      set({ assignments, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createCourse: async (data: CourseCreateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Course>('/courses/', data);
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
      const response = await apiClient.put<Course>(`/courses/${id}/`, data);
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
