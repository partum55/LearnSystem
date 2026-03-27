import apiClient from './client';

export interface LessonStep {
  id: string;
  lessonId: string;
  blockType: 'TEXT' | 'QUIZ';
  title: string;
  content: string;
  contentFormat: string;
  position: number;
  questions: Array<Record<string, unknown>>;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  position: number;
  isPublished: boolean;
  steps?: LessonStep[];
}

export interface StepProgress {
  stepId: string;
  title: string;
  blockType: string;
  completed: boolean;
  unlocked: boolean;
}

export interface LessonProgress {
  totalSteps: number;
  completedSteps: number;
  steps: StepProgress[];
}

export const lessonsApi = {
  getById: (id: string) =>
    apiClient.get<Lesson>(`/lessons/${id}`),

  create: (data: { moduleId: string; title: string; summary?: string }) =>
    apiClient.post<Lesson>('/lessons', data),

  update: (id: string, data: { title?: string; summary?: string; isPublished?: boolean }) =>
    apiClient.put<Lesson>(`/lessons/${id}`, data),

  addStep: (lessonId: string, data: { blockType: string; title: string; content?: string; questions?: Array<Record<string, unknown>> }) =>
    apiClient.post<LessonStep>(`/lessons/${lessonId}/steps`, data),

  updateStep: (lessonId: string, stepId: string, data: { title?: string; content?: string; blockType?: string; questions?: Array<Record<string, unknown>> }) =>
    apiClient.put<LessonStep>(`/lessons/${lessonId}/steps/${stepId}`, data),

  deleteStep: (lessonId: string, stepId: string) =>
    apiClient.delete(`/lessons/${lessonId}/steps/${stepId}`),

  completeStep: (lessonId: string, stepId: string) =>
    apiClient.post<{ stepId: string; completedAt: string }>(`/lessons/${lessonId}/steps/${stepId}/complete`),

  getProgress: (lessonId: string) =>
    apiClient.get<LessonProgress>(`/lessons/${lessonId}/progress`),
};
