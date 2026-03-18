import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi, quizzesApi, submissionsApi } from '../api/assessments';
import { queryKeys } from '../api/queryClient';
import { Assignment, Quiz, Submission } from '../types';

/**
 * React Query hooks for assessment data (assignments, quizzes, submissions).
 * Replaces manual state management with proper caching and deduplication.
 */

// ==================== ASSIGNMENT QUERIES ====================

/**
 * Fetch all assignments for a course
 */
export function useAssignmentsQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assessments.assignments(courseId || ''),
    queryFn: async () => {
      const response = await assignmentsApi.getAll(courseId!);
      return Array.isArray(response.data) ? response.data : response.data?.content || [];
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single assignment by ID
 */
export function useAssignmentQuery(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assessments.assignmentDetail(assignmentId || ''),
    queryFn: async () => {
      const response = await assignmentsApi.getById(assignmentId!);
      return response.data;
    },
    enabled: !!assignmentId,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== ASSIGNMENT MUTATIONS ====================

/**
 * Create a new assignment
 */
export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Assignment>) => {
      const response = await assignmentsApi.create(data);
      return response.data;
    },
    onSuccess: (newAssignment) => {
      // Invalidate assignments list for the course
      if (newAssignment.course_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessments.assignments(newAssignment.course_id),
        });
      }
      // Invalidate all assessments
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all });
    },
  });
}

/**
 * Update an assignment
 */
export function useUpdateAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Assignment> }) => {
      const response = await assignmentsApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedAssignment, { id }) => {
      // Update specific assignment in cache
      queryClient.setQueryData(
        queryKeys.assessments.assignmentDetail(id),
        updatedAssignment
      );
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all });
    },
  });
}

/**
 * Delete an assignment
 */
export function useDeleteAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.delete(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.assessments.assignmentDetail(assignmentId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all });
    },
  });
}

// ==================== QUIZ QUERIES ====================

/**
 * Fetch all quizzes for a course
 */
export function useQuizzesQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assessments.quizzes(courseId || ''),
    queryFn: async () => {
      const response = await quizzesApi.getAll(courseId!);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single quiz by ID
 */
export function useQuizQuery(quizId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assessments.quizDetail(quizId || ''),
    queryFn: async () => {
      const response = await quizzesApi.getById(quizId!);
      return response.data;
    },
    enabled: !!quizId,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== QUIZ MUTATIONS ====================

/**
 * Create a new quiz
 */
export function useCreateQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Quiz>) => {
      const response = await quizzesApi.create(data);
      return response.data;
    },
    onSuccess: (newQuiz) => {
      if (newQuiz.course_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessments.quizzes(newQuiz.course_id),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all });
    },
  });
}

/**
 * Update a quiz
 */
export function useUpdateQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Quiz> }) => {
      const response = await quizzesApi.update(id, data);
      return response.data;
    },
    onSuccess: (updatedQuiz, { id }) => {
      queryClient.setQueryData(
        queryKeys.assessments.quizDetail(id),
        updatedQuiz
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all });
    },
  });
}

// ==================== SUBMISSION QUERIES ====================

/**
 * Fetch submissions for an assignment
 */
export function useSubmissionsQuery(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assessments.submissions(assignmentId || ''),
    queryFn: async () => {
      const response = await submissionsApi.getForAssignment(assignmentId!);
      const data = response.data as { results?: Submission[] } | Submission[];
      return Array.isArray(data) ? data : data?.results || [];
    },
    enabled: !!assignmentId,
    staleTime: 1 * 60 * 1000, // 1 minute for submissions
  });
}

/**
 * Fetch current user's submission for an assignment
 */
export function useMySubmissionQuery(assignmentId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.assessments.submissions(assignmentId || ''), 'my'],
    queryFn: async () => {
      const response = await submissionsApi.getMySubmission(assignmentId!);
      return response.data;
    },
    enabled: !!assignmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ==================== SUBMISSION MUTATIONS ====================

/**
 * Grade a submission (optimistic update)
 */
export function useGradeSubmissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      score,
      feedback,
    }: {
      submissionId: string;
      assignmentId: string;
      score: number;
      feedback?: string;
    }) => {
      const response = await submissionsApi.grade(submissionId, score, feedback);
      return response.data;
    },
    // Optimistic update
    onMutate: async ({ submissionId, assignmentId, score, feedback }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.assessments.submissions(assignmentId),
      });

      // Snapshot previous value
      const previousSubmissions = queryClient.getQueryData<Submission[]>(
        queryKeys.assessments.submissions(assignmentId)
      );

      // Optimistically update
      if (previousSubmissions) {
        queryClient.setQueryData<Submission[]>(
          queryKeys.assessments.submissions(assignmentId),
          previousSubmissions.map((sub) =>
            sub.id === submissionId
              ? { ...sub, score, feedback, status: 'graded' }
              : sub
          )
        );
      }

      return { previousSubmissions, assignmentId };
    },
    onError: (_err, _, context) => {
      // Rollback on error
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.assessments.submissions(context.assignmentId),
          context.previousSubmissions
        );
      }
    },
    onSettled: (_, __, { assignmentId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessments.submissions(assignmentId),
      });
    },
  });
}
