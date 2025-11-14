import apiClient from './client';

/**
 * AI Service API Client
 * Provides methods for AI-powered course generation using Llama
 */

// Types for AI API
export interface CourseGenerationRequest {
  prompt: string;
  language?: 'uk' | 'en';
  include_modules?: boolean;
  include_assignments?: boolean;
  include_quizzes?: boolean;
  academic_year?: string;
  module_count?: number;
  assignment_count?: number;
  quiz_count?: number;
}

export interface GeneratedModule {
  title: string;
  description: string;
  order_index: number;
  duration_weeks?: number;
  assignments?: GeneratedAssignment[];
  quizzes?: GeneratedQuiz[];
}

export interface GeneratedAssignment {
  title: string;
  description: string;
  max_score: number;
  submission_type: string;
  rubric?: string;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  time_limit_minutes?: number;
  questions: GeneratedQuestion[];
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  points: number;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
}

export interface GeneratedCourseResponse {
  title: string;
  description: string;
  academic_year: string;
  modules: GeneratedModule[];
}

export interface CourseEditRequest {
  entity_type: 'COURSE' | 'MODULE' | 'ASSIGNMENT' | 'QUIZ';
  entity_id?: string;
  current_content: string;
  edit_prompt: string;
  language?: 'uk' | 'en';
}

/**
 * AI Service API methods
 */
export const aiApi = {
  /**
   * Generate course structure (preview only, not saved)
   */
  generateCourse: (data: CourseGenerationRequest) =>
    apiClient.post<GeneratedCourseResponse>('/ai/courses/generate', data),

  /**
   * Generate and save course to database
   */
  generateAndSaveCourse: (data: CourseGenerationRequest, userId: string) =>
    apiClient.post('/ai/courses/generate-and-save', data, {
      headers: {
        'X-User-Id': userId,
      },
    }),

  /**
   * Edit existing content with AI
   */
  editContent: (data: CourseEditRequest) =>
    apiClient.post<string>('/ai/content/edit', data),

  /**
   * Generate modules for existing course
   */
  generateModules: (params: {
    courseId: string;
    prompt: string;
    language?: string;
    moduleCount?: number;
    context?: string;
    durationWeeks?: number;
  }) =>
    apiClient.post('/ai/modules/generate', null, {
      params: {
        courseId: params.courseId,
        prompt: params.prompt,
        language: params.language || 'uk',
        moduleCount: params.moduleCount || 4,
        context: params.context,
        durationWeeks: params.durationWeeks,
      },
    }),

  /**
   * Generate assignments for a module
   */
  generateAssignments: (params: {
    moduleId: string;
    moduleTopic: string;
    language?: string;
    assignmentCount?: number;
    context?: string;
    maxScore?: number;
    submissionType?: string;
  }) =>
    apiClient.post('/ai/assignments/generate', null, {
      params: {
        moduleId: params.moduleId,
        moduleTopic: params.moduleTopic,
        language: params.language || 'uk',
        assignmentCount: params.assignmentCount || 3,
        context: params.context,
        maxScore: params.maxScore,
        submissionType: params.submissionType,
      },
    }),

  /**
   * Generate quiz with questions
   */
  generateQuiz: (params: {
    moduleId: string;
    topic: string;
    language?: string;
    questionCount?: number;
    context?: string;
    timeLimit?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  }) =>
    apiClient.post('/ai/quizzes/generate', null, {
      params: {
        moduleId: params.moduleId,
        topic: params.topic,
        language: params.language || 'uk',
        questionCount: params.questionCount || 10,
        context: params.context,
        timeLimit: params.timeLimit,
        difficulty: params.difficulty,
      },
    }),

  /**
   * Check AI service health
   */
  healthCheck: () =>
    apiClient.get('/ai/health'),
};

