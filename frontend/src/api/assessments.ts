import apiClient from './client';
import { Assignment, Quiz, Question } from '../types';

// Assignment API - Spring backend URLs
export const assignmentsApi = {
  getAll: (courseId: string) => {
    return apiClient.get<{ content: Assignment[]; totalElements: number }>(`/assessments/assignments/course/${courseId}`);
  },
  
  getById: (id: string) => apiClient.get<Assignment>(`/assessments/assignments/${id}`),

  create: (data: any) => apiClient.post<Assignment>('/assessments/assignments', data),

  update: (id: string, data: Partial<Assignment>) =>
    apiClient.put<Assignment>(`/assessments/assignments/${id}`, data),

  delete: (id: string) => apiClient.delete(`/assessments/assignments/${id}`),

  getStatistics: (id: string) =>
    apiClient.get(`/assessments/assignments/${id}/statistics`),

  duplicate: (id: string, courseId?: string) =>
    apiClient.post(`/assessments/assignments/${id}/duplicate`, { courseId }),

  archive: (id: string) =>
    apiClient.post(`/assessments/assignments/${id}/archive`),

  publish: (id: string) =>
    apiClient.post(`/assessments/assignments/${id}/publish`),

  unpublish: (id: string) =>
    apiClient.post(`/assessments/assignments/${id}/unpublish`),

  getPublished: (courseId: string) =>
    apiClient.get<Assignment[]>(`/assessments/assignments/course/${courseId}/published`),

  getAvailable: (courseId: string) =>
    apiClient.get<Assignment[]>(`/assessments/assignments/course/${courseId}/available`),

  getUpcoming: (courseId: string) =>
    apiClient.get<Assignment[]>(`/assessments/assignments/course/${courseId}/upcoming`),
};

// Quiz API - Spring backend URLs
export const quizzesApi = {
  getAll: (courseId: string) => {
    return apiClient.get<Quiz[]>(`/assessments/quizzes/course/${courseId}`);
  },
  
  getById: (id: string) => apiClient.get<Quiz>(`/assessments/quizzes/${id}`),

  create: (data: any) => apiClient.post<Quiz>('/assessments/quizzes', data),

  update: (id: string, data: Partial<Quiz>) =>
    apiClient.put<Quiz>(`/assessments/quizzes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/assessments/quizzes/${id}`),

  addQuestions: (quizId: string, questionIds: string[]) =>
    apiClient.post(`/assessments/quizzes/${quizId}/questions`, {
      questionIds,
    }),
  
  startAttempt: (quizId: string) =>
    apiClient.post(`/assessments/quizzes/${quizId}/start`),

  getAttempts: (quizId: string) =>
    apiClient.get(`/assessments/quizzes/${quizId}/attempts`),
};

// Question Bank API - Spring backend URLs
export const questionsApi = {
  getAll: (courseId: string) => {
    return apiClient.get<Question[]>(`/assessments/questions/course/${courseId}`);
  },
  
  getById: (id: string) => apiClient.get<Question>(`/assessments/questions/${id}`),

  create: (data: any) => apiClient.post<Question>('/assessments/questions', data),

  update: (id: string, data: Partial<Question>) =>
    apiClient.put<Question>(`/assessments/questions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/assessments/questions/${id}`),

  bulkCreate: (questions: any[]) =>
    apiClient.post('/assessments/questions/bulk', { questions }),
};

// Quiz Attempt API - Spring backend URLs
export const attemptsApi = {
  getById: (id: string) => apiClient.get(`/assessments/attempts/${id}`),

  submit: (id: string, answers: any) =>
    apiClient.post(`/assessments/attempts/${id}/submit`, { answers }),

  getResults: (id: string) =>
    apiClient.get(`/assessments/attempts/${id}/results`),
};

// Submissions API - Spring backend URLs
export const submissionsApi = {
  getForAssignment: (assignmentId: string) =>
    apiClient.get(`/assessments/submissions/assignment/${assignmentId}`),

  getMySubmission: (assignmentId: string) =>
    apiClient.get(`/assessments/submissions/assignment/${assignmentId}/my`),

  submit: (assignmentId: string, content?: string, files?: File[]) => {
    const formData = new FormData();
    formData.append('assignmentId', assignmentId);
    if (content) formData.append('content', content);
    if (files) {
      files.forEach(file => formData.append('files', file));
    }
    return apiClient.post('/assessments/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  grade: (submissionId: string, score: number, feedback?: string) =>
    apiClient.post(`/assessments/submissions/${submissionId}/grade`, { score, feedback }),

  getById: (id: string) =>
    apiClient.get(`/assessments/submissions/${id}`),
};

