import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { queryKeys } from '../api/queryClient';

/**
 * React Query mutations for AI generation operations.
 * Uses useMutation for POST operations that create/generate content.
 */

// ==================== TYPES ====================

export interface QuizGenerationRequest {
  topic: string;
  language?: 'en' | 'uk';
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
}

export interface AssignmentGenerationRequest {
  topic: string;
  language?: 'en' | 'uk';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ModuleGenerationRequest {
  topic: string;
  language?: 'en' | 'uk';
  difficulty?: 'easy' | 'medium' | 'hard';
  weekDuration?: number;
}

export interface CourseGenerationRequest {
  prompt: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeModules?: boolean;
  includeAssignments?: boolean;
  includeQuizzes?: boolean;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Array<{
    text: string;
    type: string;
    options?: string[];
    correctAnswer?: string | number;
    points?: number;
  }>;
}

export interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
  rubric?: Array<{
    criterion: string;
    points: number;
    description: string;
  }>;
}

export interface GeneratedModule {
  title: string;
  description: string;
  objectives: string[];
  topics: string[];
}

// ==================== AI GENERATION MUTATIONS ====================

/**
 * Generate a quiz using AI
 */
export function useGenerateQuizMutation() {
  return useMutation({
    mutationFn: async (request: QuizGenerationRequest) => {
      const response = await apiClient.post<GeneratedQuiz>('/v1/ai/generate/quiz', {
        topic: request.topic,
        language: request.language || 'en',
        difficulty: request.difficulty || 'medium',
        questionCount: request.questionCount || 10,
      });
      return response;
    },
    onError: (error: Error) => {
      console.error('Quiz generation failed:', error);
    },
  });
}

/**
 * Generate an assignment using AI
 */
export function useGenerateAssignmentMutation() {
  return useMutation({
    mutationFn: async (request: AssignmentGenerationRequest) => {
      const response = await apiClient.post<GeneratedAssignment>('/v1/ai/generate/assignment', {
        topic: request.topic,
        language: request.language || 'en',
        difficulty: request.difficulty || 'medium',
      });
      return response;
    },
    onError: (error: Error) => {
      console.error('Assignment generation failed:', error);
    },
  });
}

/**
 * Generate a module using AI
 */
export function useGenerateModuleMutation() {
  return useMutation({
    mutationFn: async (request: ModuleGenerationRequest) => {
      const response = await apiClient.post<GeneratedModule>('/v1/ai/generate/module', {
        topic: request.topic,
        language: request.language || 'en',
        difficulty: request.difficulty || 'medium',
        weekDuration: request.weekDuration || 4,
      });
      return response;
    },
    onError: (error: Error) => {
      console.error('Module generation failed:', error);
    },
  });
}

/**
 * Generate a full course using AI (non-streaming)
 */
export function useGenerateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CourseGenerationRequest) => {
      const response = await apiClient.post('/v1/ai/courses/generate', request);
      return response;
    },
    onSuccess: () => {
      // Invalidate courses list after generation
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: (error: Error) => {
      console.error('Course generation failed:', error);
    },
  });
}

/**
 * Generate and save a course using AI
 */
export function useGenerateAndSaveCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CourseGenerationRequest) => {
      const response = await apiClient.post('/v1/ai/courses/generate-and-save', request);
      return response;
    },
    onSuccess: (newCourse: any) => {
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });

      // Add new course to cache
      if (newCourse?.id) {
        queryClient.setQueryData(
          queryKeys.courses.detail(newCourse.id),
          newCourse
        );
      }
    },
    onError: (error: Error) => {
      console.error('Course generation and save failed:', error);
    },
  });
}

/**
 * Predict student grades using AI
 */
export function usePredictGradesMutation() {
  return useMutation({
    mutationFn: async (request: { studentId: string; courseId: string }) => {
      const response = await apiClient.post('/v1/ai/predict-grades', request);
      return response;
    },
    onError: (error: Error) => {
      console.error('Grade prediction failed:', error);
    },
  });
}

// ==================== HELPER HOOK FOR CONTENT GENERATION ====================

/**
 * Combined hook for any content type generation
 */
export function useAIContentGeneration(type: 'quiz' | 'assignment' | 'module') {
  const quizMutation = useGenerateQuizMutation();
  const assignmentMutation = useGenerateAssignmentMutation();
  const moduleMutation = useGenerateModuleMutation();

  switch (type) {
    case 'quiz':
      return quizMutation;
    case 'assignment':
      return assignmentMutation;
    case 'module':
      return moduleMutation;
    default:
      return quizMutation;
  }
}

