import apiClient from './client';
import { Assignment, Quiz, Question } from '../types';

// Assignment API
export const assignmentsApi = {
  getAll: (courseId?: string, moduleId?: string) => {
    const params = new URLSearchParams();
    if (courseId) params.append('course', courseId);
    if (moduleId) params.append('module', moduleId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ results: Assignment[] }>(`/assessments/assignments/${query}`);
  },
  
  getById: (id: string) => apiClient.get<Assignment>(`/assessments/assignments/${id}/`),
  
  create: (data: any) => apiClient.post<Assignment>('/assessments/assignments/', data),
  
  update: (id: string, data: Partial<Assignment>) =>
    apiClient.patch<Assignment>(`/assessments/assignments/${id}/`, data),
  
  delete: (id: string) => apiClient.delete(`/assessments/assignments/${id}/`),
  
  getStatistics: (id: string) =>
    apiClient.get(`/assessments/assignments/${id}/statistics/`),
  
  duplicate: (id: string, courseId?: string) =>
    apiClient.post(`/assessments/assignments/${id}/duplicate/`, { course_id: courseId }),
  
  archive: (id: string) =>
    apiClient.post(`/assessments/assignments/${id}/archive/`),
};

// Quiz API
export const quizzesApi = {
  getAll: (courseId?: string) => {
    const params = courseId ? `?course=${courseId}` : '';
    return apiClient.get<{ results: Quiz[] }>(`/assessments/quizzes/${params}`);
  },
  
  getById: (id: string) => apiClient.get<Quiz>(`/assessments/quizzes/${id}/`),
  
  create: (data: any) => apiClient.post<Quiz>('/assessments/quizzes/', data),
  
  update: (id: string, data: Partial<Quiz>) =>
    apiClient.patch<Quiz>(`/assessments/quizzes/${id}/`, data),
  
  delete: (id: string) => apiClient.delete(`/assessments/quizzes/${id}/`),
  
  addQuestions: (quizId: string, questionIds: string[]) =>
    apiClient.post(`/assessments/quizzes/${quizId}/add_questions/`, {
      question_ids: questionIds,
    }),
  
  startAttempt: (quizId: string) =>
    apiClient.post(`/assessments/quizzes/${quizId}/start_attempt/`),
  
  getAttempts: (quizId: string) =>
    apiClient.get(`/assessments/quizzes/${quizId}/attempts/`),
};

// Question Bank API
export const questionsApi = {
  getAll: (courseId?: string) => {
    const params = courseId ? `?course=${courseId}` : '';
    return apiClient.get<{ results: Question[] }>(`/assessments/questions/${params}`);
  },
  
  getById: (id: string) => apiClient.get<Question>(`/assessments/questions/${id}/`),
  
  create: (data: any) => apiClient.post<Question>('/assessments/questions/', data),
  
  update: (id: string, data: Partial<Question>) =>
    apiClient.patch<Question>(`/assessments/questions/${id}/`, data),
  
  delete: (id: string) => apiClient.delete(`/assessments/questions/${id}/`),
  
  bulkCreate: (questions: any[]) =>
    apiClient.post('/assessments/questions/bulk_create/', { questions }),
};

// Quiz Attempt API
export const attemptsApi = {
  getById: (id: string) => apiClient.get(`/assessments/attempts/${id}/`),
  
  submit: (id: string, answers: any) =>
    apiClient.post(`/assessments/attempts/${id}/submit/`, { answers }),
  
  getResults: (id: string) =>
    apiClient.get(`/assessments/attempts/${id}/results/`),
};

// Ensure paths do not include redundant /api prefix; client baseURL already includes /api
export const getQuizzes = (courseId: string) => apiClient.get(`/courses/${courseId}/quizzes`);
