import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { quizAttemptsApi } from '../api/quiz-attempts.api';
import type { QuizAttemptSubmitRequest } from '../api/quiz-attempts.types';

export const useActiveQuizAttempt = (attemptId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.quizAttempts.active(attemptId || ''),
    queryFn: () => quizAttemptsApi.getActiveAttempt(attemptId!),
    enabled: Boolean(attemptId),
  });

export const useQuizAttemptReview = (attemptId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.quizAttempts.review(attemptId || ''),
    queryFn: () => quizAttemptsApi.review(attemptId!),
    enabled: Boolean(attemptId),
  });

export const useStartQuizAttempt = () =>
  useMutation({
    mutationFn: (assignmentId: string) => quizAttemptsApi.start(assignmentId),
  });

export const useSubmitQuizAttempt = () =>
  useMutation({
    mutationFn: (params: { attemptId: string; request: QuizAttemptSubmitRequest }) =>
      quizAttemptsApi.submit(params.attemptId, params.request),
  });
