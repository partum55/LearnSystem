import apiClient from './client';

export interface ProgressItem {
  contentId: string;
  contentType: string;
  completedAt: string;
}

export interface ModuleProgress {
  completed: number;
  items: ProgressItem[];
}

export interface CourseModuleProgress {
  moduleId: string;
  completed: number;
  items: ProgressItem[];
}

export interface CourseProgress {
  totalCompleted: number;
  modules: CourseModuleProgress[];
}

export const progressApi = {
  markComplete: (courseId: string, moduleId: string, contentType: string, contentId: string) =>
    apiClient.post<{ id: string; completedAt: string }>('/progress/complete', {
      courseId,
      moduleId,
      contentType,
      contentId,
    }),

  getModuleProgress: (moduleId: string) =>
    apiClient.get<ModuleProgress>(`/progress/modules/${moduleId}`),

  getCourseProgress: (courseId: string) =>
    apiClient.get<CourseProgress>(`/progress/courses/${courseId}`),
};
