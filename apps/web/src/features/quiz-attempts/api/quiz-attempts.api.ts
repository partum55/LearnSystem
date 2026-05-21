import apiClient from '@/api/client';
import type {
  QuizAttemptActiveDto,
  QuizAttemptReviewDto,
  QuizAttemptStartDto,
  QuizAttemptSubmitRequest,
} from './quiz-attempts.types';

export const quizAttemptsApi = {
  start: (assignmentId: string) =>
    apiClient.request<QuizAttemptStartDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/quiz-attempts`,
    }),

  getActiveAttempt: (attemptId: string) =>
    apiClient.request<QuizAttemptActiveDto>({
      method: 'GET',
      url: `/v1/quiz-attempts/${attemptId}`,
    }),

  submit: (attemptId: string, request: QuizAttemptSubmitRequest) =>
    apiClient.request<QuizAttemptReviewDto>({
      method: 'POST',
      url: `/v1/quiz-attempts/${attemptId}/submit`,
      data: request,
    }),

  review: (attemptId: string) =>
    apiClient.request<QuizAttemptReviewDto>({ url: `/v1/quiz-attempts/${attemptId}/review` }),
};
