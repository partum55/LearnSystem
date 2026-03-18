import apiClient from './client';
import { getAccessToken } from './token';

// Use API gateway for AI calls - the gateway routes /api/ai/** to the AI service
// The gateway rewrites /api/ai/** to /api/v1/ai/** before forwarding to AI service
export const AI_ABSOLUTE_URL =
  import.meta.env.VITE_AI_SERVICE_URL ||
  import.meta.env.REACT_APP_AI_SERVICE_URL ||
  '/api/ai';

// When using apiClient, it already prepends its own baseURL (e.g., '/api').
// We strip the leading '/api' for relative paths so it doesn't become /api/api/ai.
const AI_CLIENT_URL = AI_ABSOLUTE_URL.startsWith('http')
  ? AI_ABSOLUTE_URL
  : AI_ABSOLUTE_URL.replace(/^\/api/, '');

export interface CourseGenerationRequest {
  prompt: string;
  language?: 'uk' | 'en';
  include_modules?: boolean;
  include_assignments?: boolean;
  include_quizzes?: boolean;
  academic_year?: string;
}

export interface CourseEditRequest {
  entity_type: 'COURSE' | 'MODULE' | 'ASSIGNMENT' | 'QUIZ';
  entity_id: string;
  current_content: string;
  prompt: string;
  language?: 'uk' | 'en';
}

export interface GeneratedCourse {
  version?: string;
  course: {
    code: string;
    titleUk: string;
    titleEn: string;
    descriptionUk: string;
    descriptionEn: string;
    syllabus: string;
    visibility?: string;
    isPublished?: boolean;
    maxStudents: number;
  };
  modules?: GeneratedModule[];
  quizzes?: GeneratedQuiz[];
  questionBank?: GeneratedQuestion[];
}

export interface GeneratedModule {
  title: string;
  description: string;
  position: number;
  isPublished?: boolean;
  assignments?: GeneratedAssignment[];
  resources?: GeneratedResource[];
}

export interface GeneratedResource {
  title: string;
  description?: string;
  resourceType: string;
  externalUrl?: string;
  textContent?: string;
  position?: number;
  isDownloadable?: boolean;
}

export interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
  assignmentType: string;
  maxPoints: number;
  submissionTypes?: string[];
  allowedFileTypes?: string[];
  programmingLanguage?: string;
  starterCode?: string;
  tags?: string[];
  estimatedDuration?: string;
  isPublished?: boolean;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  moduleTitle?: string;
  timeLimit?: number;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  passPercentage?: number;
  showCorrectAnswers?: boolean;
  questionRefs?: string[];
  questions?: Array<{
    stem?: string;
    questionText?: string;
    questionType?: string;
    points?: number;
    options?: string[];
    correct_answer?: string | number;
    correctAnswer?: string | number;
    answerOptions?: Array<{ text: string; isCorrect: boolean; feedback?: string }>;
    explanation?: string;
  }>;
}

export interface GeneratedQuestion {
  id?: string;
  stem: string;
  questionType: string;
  points: number;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string;
}

export interface AIProgressEvent {
  eventType: 'progress' | 'module' | 'assignment' | 'complete' | 'error';
  message?: string;
  percentage?: number;
  data?: unknown;
  error?: string;
}

export interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  usageCount: number;
  averageRating: number;
  tags?: string[];
  variables?: {
    name: string;
    description: string;
    type: 'string' | 'number' | 'enum';
    options?: string[];
    required?: boolean;
    default?: string;
  }[];
}
// AI Service Methods
export const aiApi = {
  /**
   * Stream course generation
   */
  generateCourseStream: (
    request: CourseGenerationRequest,
    onProgress: (event: AIProgressEvent) => void,
    onComplete: (course: GeneratedCourse) => void,
    onError: (error: string) => void
  ) => {
    const controller = new AbortController();

    const consumeStream = async () => {
      try {
        const response = await fetch(`${AI_ABSOLUTE_URL}/courses/generate-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          onError(`Streaming request failed (${response.status})`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const dataLine = chunk
              .split('\n')
              .find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            const payload = dataLine.slice(5).trim();
            if (!payload) continue;

            try {
              const event = JSON.parse(payload) as AIProgressEvent;
              if (event.eventType === 'complete' && event.data) {
                onComplete(event.data as GeneratedCourse);
                controller.abort();
                return;
              }
              if (event.eventType === 'error') {
                onError(event.error || 'Generation failed');
                controller.abort();
                return;
              }
              onProgress(event);
            } catch (parseError) {
              console.error('Failed to parse streaming event:', parseError);
            }
          }
        }
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          onError('Connection error');
        }
      }
    };

    void consumeStream();

    return () => controller.abort();
  },

  /**
   * Generate course (non-streaming)
   */
  generateCourse: async (request: CourseGenerationRequest) => {
    const response = await apiClient.post<GeneratedCourse>(
      `${AI_CLIENT_URL}/courses/generate`,
      request
    );
    return response.data;
  },

  /**
   * Generate and save course to database
   */
  generateAndSaveCourse: async (request: CourseGenerationRequest, userId: string) => {
    const response = await apiClient.post<{
      courseId: string;
      modulesCreated: number;
      assignmentsCreated: number;
      quizzesCreated: number;
    }>(
      `${AI_CLIENT_URL}/courses/generate-and-save?confirmed=true`,
      request,
      {
        headers: {
          'X-User-Id': userId,
          // Note: Authorization header is automatically added by apiClient interceptor
        },
      }
    );
    return response.data;
  },

  /**
   * Edit existing content with AI
   */
  editContent: async (request: CourseEditRequest) => {
    const response = await apiClient.post<string>(
      `${AI_CLIENT_URL}/content/edit`,
      request
    );
    return response.data;
  },

  /**
   * Generate modules for existing course
   */
  generateModules: async (params: {
    courseId: string;
    prompt: string;
    language?: string;
    moduleCount?: number;
  }) => {
    const response = await apiClient.post<{
      courseId: string;
      modules: GeneratedModule[];
    }>(
      `${AI_CLIENT_URL}/modules/generate`,
      null,
      { params }
    );
    return response.data;
  },

  /**
   * Generate assignments for module
   */
  generateAssignments: async (params: {
    moduleId: string;
    moduleTopic: string;
    language?: string;
    assignmentCount?: number;
  }) => {
    const response = await apiClient.post<{
      moduleId: string;
      assignments: GeneratedAssignment[];
    }>(
      `${AI_CLIENT_URL}/assignments/generate`,
      null,
      { params }
    );
    return response.data;
  },

  /**
   * Generate quiz with questions
   */
  generateQuiz: async (params: {
    moduleId: string;
    topic: string;
    language?: string;
    questionCount?: number;
    timeLimit?: number;
  }) => {
    const response = await apiClient.post<{
      moduleId: string;
      quizzes: GeneratedQuiz[];
    }>(
      `${AI_CLIENT_URL}/quizzes/generate`,
      null,
      { params }
    );
    return response.data;
  },

  /**
   * Health check
   */
  health: async () => {
    const response = await apiClient.get<{ status: string; service: string }>(
      `${AI_CLIENT_URL}/health`
    );
    return response.data;
  },

  /**
   * Templates API
   */
  templates: {
    getAll: async () => {
      const response = await apiClient.get<CourseTemplate[]>(
        `${AI_CLIENT_URL}/templates`
      );
      return response.data;
    },

    getByCategory: async (category: string) => {
      const response = await apiClient.get<CourseTemplate[]>(
        `${AI_CLIENT_URL}/templates`,
        { params: { category } }
      );
      return response.data;
    },

    getPopular: async () => {
      const response = await apiClient.get<CourseTemplate[]>(
        `${AI_CLIENT_URL}/templates/popular`
      );
      return response.data;
    },

    getById: async (id: string) => {
      const response = await apiClient.get<CourseTemplate>(
        `${AI_CLIENT_URL}/templates/${id}`
      );
      return response.data;
    },

    generateFromTemplate: async (
      templateId: string,
      variables: Record<string, string>
    ) => {
      const response = await apiClient.post<GeneratedCourse>(
        `${AI_CLIENT_URL}/templates/${templateId}/generate`,
        variables
      );
      return response.data;
    },

    initialize: async () => {
      const response = await apiClient.post(
        `${AI_CLIENT_URL}/templates/initialize`
      );
      return response.data;
    },
  },

  /**
   * Generate interactive widget HTML via AI
   */
  generateWidget: async (request: {
    prompt: string;
    existingCode?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    language?: 'uk' | 'en';
  }) => {
    const response = await apiClient.post<{ html: string; summary: string }>(
      `${AI_CLIENT_URL}/widget/generate`,
      request
    );
    return response.data;
  },

  // API Key Management
  apiKeys: {
    getKeys: async () => {
      const response = await apiClient.get('/users/me/api-keys');
      return response.data;
    },
    saveKey: async (provider: string, apiKey: string) => {
      const response = await apiClient.post('/users/me/api-keys', { provider, apiKey });
      return response.data;
    },
    deleteKey: async (provider: string) => {
      await apiClient.delete(`/users/me/api-keys/${provider}`);
    },
    validateKey: async (provider: string, apiKey: string) => {
      const response = await apiClient.post('/users/me/api-keys/validate', { provider, apiKey });
      return response.data as { valid: boolean };
    },
  },

  // Student AI Features
  explain: async (contentType: string, contentText: string, language: string = 'en') => {
    const response = await apiClient.post(`${AI_CLIENT_URL}/explain`, {
      contentType,
      contentText,
      language,
    });
    return response.data as { explanation: string; language: string; tokensUsed: number };
  },

  practiceQuiz: async (courseId: string, moduleId: string, questionCount: number = 5, difficulty: string = 'medium', language: string = 'en') => {
    const response = await apiClient.post(`${AI_CLIENT_URL}/practice-quiz`, {
      courseId,
      moduleId,
      questionCount,
      difficulty,
      language,
    });
    return response.data as PracticeQuizResponse;
  },

  // Teacher AI Features
  gradeSuggestion: async (assignmentId: string, submissionId: string) => {
    const response = await apiClient.post(`${AI_CLIENT_URL}/grade-suggestion`, {
      assignmentId,
      submissionId,
    });
    return response.data as GradeSuggestionResponse;
  },

  plagiarismCheck: async (submissionId: string) => {
    const response = await apiClient.post(`${AI_CLIENT_URL}/plagiarism-check`, {
      submissionId,
    });
    return response.data as PlagiarismCheckResponse;
  },

  syllabus: async (courseDescription: string, weekCount: number = 16, language: string = 'en') => {
    const response = await apiClient.post(`${AI_CLIENT_URL}/syllabus`, {
      courseDescription,
      weekCount,
      language,
    });
    return response.data as SyllabusResponseData;
  },

  abTests: {
    list: async () => {
      const response = await apiClient.get<string[]>(`${AI_CLIENT_URL}/ab-tests/experiments`);
      return response.data || [];
    },

    listActive: async () => {
      const response = await apiClient.get<string[]>(`${AI_CLIENT_URL}/ab-tests/experiments/active`);
      return response.data || [];
    },

    getResults: async (experimentName: string) => {
      const response = await apiClient.get<ABTestResultsResponse>(
        `${AI_CLIENT_URL}/ab-tests/experiments/${encodeURIComponent(experimentName)}/results`
      );
      return response.data;
    },

    createExperiment: async (payload: {
      experimentName: string;
      variants: Record<string, string>;
      weights: Record<string, number>;
    }) => {
      await apiClient.post(`${AI_CLIENT_URL}/ab-tests/experiments`, payload);
    },

    stopExperiment: async (experimentName: string) => {
      await apiClient.delete(`${AI_CLIENT_URL}/ab-tests/experiments/${encodeURIComponent(experimentName)}`);
    },
  },
};

// New response types
export interface PracticeQuizResponse {
  title: string;
  questions: {
    questionText: string;
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }[];
}

export interface GradeSuggestionResponse {
  suggestedGrade: number;
  maxPoints: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface PlagiarismCheckResponse {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: string[];
  summary: string;
}

export interface SyllabusResponseData {
  pages: {
    id: string;
    title: string;
    icon: string;
    content: string;
  }[];
}

export interface ABTestVariantStats {
  variantName: string;
  sampleSize: number;
  successCount: number;
  successRate: number;
  averageLatencyMs: number;
  averageQualityScore: number;
  averageUserRating: number;
  totalTokens: number;
}

export interface ABTestResultsResponse {
  experimentName: string;
  totalSamples: number;
  variants: ABTestVariantStats[];
  winningVariant: string;
  statisticallySignificant: boolean;
}
