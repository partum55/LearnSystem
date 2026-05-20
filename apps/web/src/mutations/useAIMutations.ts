import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { queryKeys } from '../api/queryClient';

/**
 * Mutations for AI operations.
 * These are for non-streaming AI requests.
 */

// ==================== COURSE GENERATION ====================

interface CourseGenerationRequest {
  title: string;
  description?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  subject?: string;
  learningObjectives?: string[];
  moduleCount?: number;
}

interface GeneratedCourse {
  id?: string;
  title: string;
  description: string;
  modules: Array<{
    title: string;
    description: string;
    content?: string;
  }>;
}

/**
 * Generate a complete course using AI
 */
export function useGenerateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CourseGenerationRequest): Promise<GeneratedCourse> => {
      const response = await apiClient.post<GeneratedCourse>('/v1/ai/courses/generate', request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate courses list to show the new course
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

// ==================== MODULE GENERATION ====================

interface ModuleGenerationRequest {
  courseId: string;
  topic: string;
  learningObjectives?: string[];
  contentType?: 'LECTURE' | 'READING' | 'INTERACTIVE';
}

interface GeneratedModule {
  title: string;
  description: string;
  content: string;
  items?: Array<{
    title: string;
    type: string;
    content: string;
  }>;
}

/**
 * Generate a module using AI
 */
export function useGenerateModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ModuleGenerationRequest): Promise<GeneratedModule> => {
      const response = await apiClient.post<GeneratedModule>('/v1/ai/modules/generate', request);
      return response.data;
    },
    onSuccess: (_, { courseId }) => {
      // Invalidate modules for this course
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.courses.detail(courseId), 'modules'],
      });
    },
  });
}

// ==================== QUIZ GENERATION ====================

interface QuizGenerationRequest {
  moduleId?: string;
  courseId?: string;
  topic: string;
  questionCount?: number;
  questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')[];
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Array<{
    text: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
  }>;
}

/**
 * Generate a quiz using AI
 */
export function useGenerateQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: QuizGenerationRequest): Promise<GeneratedQuiz> => {
      const response = await apiClient.post<GeneratedQuiz>('/v1/ai/quizzes/generate', request);
      return response.data;
    },
    onSuccess: (_, { courseId }) => {
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessments.quizzes(courseId),
        });
      }
    },
  });
}

// ==================== CONTENT GENERATION ====================

interface ContentGenerationRequest {
  type: 'explanation' | 'summary' | 'example' | 'practice';
  topic: string;
  context?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

interface GeneratedContent {
  content: string;
  type: string;
}

/**
 * Generate educational content using AI
 */
export function useGenerateContentMutation() {
  return useMutation({
    mutationFn: async (request: ContentGenerationRequest): Promise<GeneratedContent> => {
      const response = await apiClient.post<GeneratedContent>('/v1/ai/generate/content', request);
      return response.data;
    },
  });
}

// ==================== ASSIGNMENT GENERATION ====================

interface AssignmentGenerationRequest {
  moduleId?: string;
  courseId?: string;
  topic: string;
  type?: 'ESSAY' | 'PROJECT' | 'CODING' | 'RESEARCH';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
}

/**
 * Generate an assignment using AI
 */
export function useGenerateAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AssignmentGenerationRequest): Promise<GeneratedAssignment> => {
      const response = await apiClient.post<GeneratedAssignment>('/v1/ai/assignments/generate', request);
      return response.data;
    },
    onSuccess: (_, { courseId }) => {
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessments.assignments(courseId),
        });
      }
    },
  });
}

// ==================== FEEDBACK GENERATION ====================

interface FeedbackGenerationRequest {
  submissionId: string;
  submissionContent: string;
  assignmentDescription?: string;
}

interface GeneratedFeedback {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

/**
 * Generate feedback for a submission using AI
 */
export function useGenerateFeedbackMutation() {
  return useMutation({
    mutationFn: async (request: FeedbackGenerationRequest): Promise<GeneratedFeedback> => {
      const response = await apiClient.post<GeneratedFeedback>('/v1/ai/feedback/generate', request);
      return response.data;
    },
  });
}

