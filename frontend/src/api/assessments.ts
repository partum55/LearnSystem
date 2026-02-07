import apiClient from './client';
import { Assignment, Quiz, Question } from '../types';

interface PageResponse<T> {
  content: T[];
  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
}

type UnknownRecord = Record<string, unknown>;

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const compact = <T extends UnknownRecord>(obj: T): T => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
};

const mapAssignmentFromApi = (raw: UnknownRecord): Assignment => ({
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? raw.course ?? ''),
  assignment_type: String(raw.assignmentType ?? raw.assignment_type ?? 'FILE_UPLOAD') as Assignment['assignment_type'],
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  instructions: (raw.instructions as string | undefined) || undefined,
  due_date: (raw.dueDate as string | undefined) || (raw.due_date as string | undefined),
  available_from: (raw.availableFrom as string | undefined) || (raw.available_from as string | undefined),
  available_until: (raw.availableUntil as string | undefined) || (raw.available_until as string | undefined),
  max_points: asNumber(raw.maxPoints ?? raw.max_points, 100),
  submission_types: (raw.submissionTypes as string[] | undefined) || (raw.submission_types as string[] | undefined),
  allowed_file_types: (raw.allowedFileTypes as string[] | undefined) || (raw.allowed_file_types as string[] | undefined),
  max_file_size: asNumber(raw.maxFileSize ?? raw.max_file_size, 10485760),
  max_files: asNumber(raw.maxFiles ?? raw.max_files, 5),
  programming_language: (raw.programmingLanguage as string | undefined) || (raw.programming_language as string | undefined),
  auto_grading_enabled: Boolean(raw.autoGradingEnabled ?? raw.auto_grading_enabled),
  test_cases: (
    ((raw.testCases as UnknownRecord[] | undefined) || (raw.test_cases as UnknownRecord[] | undefined) || [])
      .map((testCase) => ({
        ...testCase,
        input: String(testCase.input ?? ''),
        output: String(testCase.output ?? testCase.expected_output ?? ''),
      }))
  ),
  quiz: (raw.quizId as string | undefined) || (raw.quiz_id as string | undefined) || (raw.quiz as string | undefined),
  external_tool_url: (raw.externalToolUrl as string | undefined) || (raw.external_tool_url as string | undefined),
  grade_anonymously: Boolean(raw.gradeAnonymously ?? raw.grade_anonymously),
  peer_review_enabled: Boolean(raw.peerReviewEnabled ?? raw.peer_review_enabled),
  peer_reviews_required: asNumber(raw.peerReviewsRequired ?? raw.peer_reviews_required, 0),
  allow_late_submission: Boolean(raw.allowLateSubmission ?? raw.allow_late_submission),
  late_penalty_percent: asNumber(raw.latePenaltyPercent ?? raw.late_penalty_percent, 0),
  is_published: Boolean(raw.isPublished ?? raw.is_published),
  created_at: (raw.createdAt as string | undefined) || (raw.created_at as string) || '',
  updated_at: (raw.updatedAt as string | undefined) || (raw.updated_at as string) || '',
});

const mapAssignmentToApi = (raw: Partial<Assignment> & UnknownRecord): UnknownRecord => {
  return compact({
    courseId: raw.courseId ?? raw.course_id ?? raw.course,
    moduleId: raw.moduleId ?? raw.module_id ?? raw.module,
    categoryId: raw.categoryId ?? raw.category_id ?? raw.category,
    position: raw.position,
    assignmentType: raw.assignmentType ?? raw.assignment_type,
    title: raw.title,
    description: raw.description,
    descriptionFormat: raw.descriptionFormat ?? raw.description_format,
    instructions: raw.instructions,
    instructionsFormat: raw.instructionsFormat ?? raw.instructions_format,
    resources: raw.resources,
    starterCode: raw.starterCode ?? raw.starter_code,
    programmingLanguage: raw.programmingLanguage ?? raw.programming_language,
    autoGradingEnabled: raw.autoGradingEnabled ?? raw.auto_grading_enabled,
    testCases: raw.testCases ?? raw.test_cases,
    maxPoints: raw.maxPoints ?? raw.max_points,
    rubric: raw.rubric,
    dueDate: raw.dueDate ?? raw.due_date,
    availableFrom: raw.availableFrom ?? raw.available_from,
    availableUntil: raw.availableUntil ?? raw.available_until,
    allowLateSubmission: raw.allowLateSubmission ?? raw.allow_late_submission,
    latePenaltyPercent: raw.latePenaltyPercent ?? raw.late_penalty_percent,
    submissionTypes: raw.submissionTypes ?? raw.submission_types,
    allowedFileTypes: raw.allowedFileTypes ?? raw.allowed_file_types,
    maxFileSize: raw.maxFileSize ?? raw.max_file_size,
    maxFiles: raw.maxFiles ?? raw.max_files,
    quizId: raw.quizId ?? raw.quiz_id ?? raw.quiz,
    externalToolUrl: raw.externalToolUrl ?? raw.external_tool_url,
    gradeAnonymously: raw.gradeAnonymously ?? raw.grade_anonymously,
    peerReviewEnabled: raw.peerReviewEnabled ?? raw.peer_review_enabled,
    peerReviewsRequired: raw.peerReviewsRequired ?? raw.peer_reviews_required,
    tags: raw.tags,
    estimatedDuration: raw.estimatedDuration ?? raw.estimated_duration,
    isTemplate: raw.isTemplate ?? raw.is_template,
    isArchived: raw.isArchived ?? raw.is_archived,
    isPublished: raw.isPublished ?? raw.is_published,
  });
};

const mapQuizFromApi = (raw: UnknownRecord): Quiz => ({
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? raw.course ?? ''),
  title: String(raw.title ?? ''),
  description: (raw.description as string | undefined) || '',
  time_limit: (raw.timeLimit as number | undefined) ?? (raw.time_limit as number | undefined),
  attempts_allowed: asNumber(raw.attemptsAllowed ?? raw.attempts_allowed, 1),
  randomize_questions: Boolean(raw.shuffleQuestions ?? raw.randomize_questions ?? raw.shuffle_questions),
  randomize_answers: Boolean(raw.shuffleAnswers ?? raw.randomize_answers ?? raw.shuffle_answers),
  questions: (raw.questions as Question[] | undefined) || [],
  created_at: (raw.createdAt as string | undefined) || (raw.created_at as string) || '',
  updated_at: (raw.updatedAt as string | undefined) || (raw.updated_at as string) || '',
});

const mapQuestionFromApi = (raw: UnknownRecord): Question => ({
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? ''),
  type: String(raw.questionType ?? raw.question_type ?? 'short_answer').toLowerCase() as Question['type'],
  stem: String(raw.stem ?? ''),
  options: (raw.options as string[] | undefined) || [],
  correct_answer: ((raw.correctAnswer as unknown) ?? raw.correct_answer ?? '') as Question['correct_answer'],
  points: asNumber(raw.points, 1),
});

// Assignment API - Spring backend URLs
export const assignmentsApi = {
  getAll: (courseId: string) => {
    return apiClient
      .get<PageResponse<UnknownRecord>>(`/assessments/assignments/course/${courseId}`)
      .then((response) => ({
        ...response,
        data: {
          ...response.data,
          content: (response.data.content || []).map(mapAssignmentFromApi),
        },
      }));
  },

  getById: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/assignments/${id}`).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  create: (data: Partial<Assignment>) =>
    apiClient.post<UnknownRecord>('/assessments/assignments', mapAssignmentToApi(data as Partial<Assignment> & UnknownRecord)).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  update: (id: string, data: Partial<Assignment>) =>
    apiClient.put<UnknownRecord>(`/assessments/assignments/${id}`, mapAssignmentToApi(data as Partial<Assignment> & UnknownRecord)).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  delete: (id: string) => apiClient.delete(`/assessments/assignments/${id}`),

  getStatistics: (id: string) => {
    void id;
    return Promise.reject(new Error('Assignment statistics endpoint is not available in current backend.'));
  },

  duplicate: (id: string, courseId?: string) => {
    void id;
    void courseId;
    return Promise.reject(new Error('Assignment duplicate endpoint is not available in current backend.'));
  },

  archive: (id: string) => {
    void id;
    return Promise.reject(new Error('Assignment archive endpoint is not available in current backend.'));
  },

  publish: (id: string) => {
    void id;
    return Promise.reject(new Error('Assignment publish endpoint is not available in current backend.'));
  },

  unpublish: (id: string) => {
    void id;
    return Promise.reject(new Error('Assignment unpublish endpoint is not available in current backend.'));
  },

  getPublished: (courseId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/assignments/course/${courseId}/published`).then((response) => ({
      ...response,
      data: response.data.map(mapAssignmentFromApi),
    })),

  getAvailable: (courseId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/assignments/course/${courseId}/available`).then((response) => ({
      ...response,
      data: response.data.map(mapAssignmentFromApi),
    })),

  getUpcoming: (courseId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/assignments/course/${courseId}/upcoming`).then((response) => ({
      ...response,
      data: response.data.map(mapAssignmentFromApi),
    })),
};

// Quiz API - Spring backend URLs
export const quizzesApi = {
  getAll: (courseId: string) => {
    return apiClient.get<PageResponse<UnknownRecord>>(`/assessments/quizzes/course/${courseId}`).then((response) => ({
      ...response,
      data: (response.data.content || []).map(mapQuizFromApi),
    }));
  },

  getById: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/quizzes/${id}`).then((response) => ({
      ...response,
      data: mapQuizFromApi(response.data),
    })),

  create: (data: Partial<Quiz> & UnknownRecord) => {
    const courseId = String(data.course_id ?? data.courseId ?? data.course ?? '');
    const title = String(data.title ?? '');
    const description = (data.description as string | undefined) || undefined;
    return apiClient
      .post<UnknownRecord>('/assessments/quizzes', null, {
        params: compact({
          courseId,
          title,
          description,
        }),
      })
      .then((response) => ({
        ...response,
        data: mapQuizFromApi(response.data),
      }));
  },

  update: (id: string, data: Partial<Quiz>) =>
    apiClient.put<UnknownRecord>(`/assessments/quizzes/${id}`, {
      title: data.title,
      description: data.description,
      timeLimit: data.time_limit,
      attemptsAllowed: data.attempts_allowed,
      shuffleQuestions: data.randomize_questions,
      shuffleAnswers: data.randomize_answers,
    }).then((response) => ({
      ...response,
      data: mapQuizFromApi(response.data),
    })),

  delete: (id: string) => apiClient.delete(`/assessments/quizzes/${id}`),

  addQuestions: (quizId: string, questionIds: string[]) =>
    Promise.all(
      questionIds.map((questionId) =>
        apiClient.post(`/assessments/quizzes/${quizId}/questions/${questionId}`)
      )
    ),

  startAttempt: (quizId: string) =>
    apiClient.post(`/assessments/quiz-attempts/quiz/${quizId}/start`),

  getAttempts: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user`),
};

// Question Bank API - Spring backend URLs
export const questionsApi = {
  getAll: (courseId: string) => {
    return apiClient.get<PageResponse<UnknownRecord>>(`/assessments/questions/course/${courseId}`).then((response) => ({
      ...response,
      data: (response.data.content || []).map(mapQuestionFromApi),
    }));
  },

  getById: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/questions/${id}`).then((response) => ({
      ...response,
      data: mapQuestionFromApi(response.data),
    })),

  create: (data: Partial<Question> & UnknownRecord) =>
    apiClient.post<UnknownRecord>('/assessments/questions', compact({
      courseId: data.courseId ?? data.course_id ?? data.course,
      questionType: data.questionType ?? data.question_type ?? data.type,
      stem: data.stem,
      options: data.options,
      correctAnswer: data.correctAnswer ?? data.correct_answer,
      explanation: data.explanation,
      points: data.points,
      metadata: data.metadata,
    })).then((response) => ({
      ...response,
      data: mapQuestionFromApi(response.data),
    })),

  update: (id: string, data: Partial<Question>) =>
    apiClient.put<UnknownRecord>(`/assessments/questions/${id}`, compact({
      questionType: (data as UnknownRecord).questionType ?? (data as UnknownRecord).question_type ?? data.type,
      stem: data.stem,
      options: data.options,
      correctAnswer: (data as UnknownRecord).correctAnswer ?? (data as UnknownRecord).correct_answer,
      explanation: (data as UnknownRecord).explanation,
      points: data.points,
      metadata: data.metadata,
    })).then((response) => ({
      ...response,
      data: mapQuestionFromApi(response.data),
    })),

  delete: (id: string) => apiClient.delete(`/assessments/questions/${id}`),

  bulkCreate: (questions: Partial<Question>[]) => {
    void questions;
    return Promise.reject(new Error('Question bulk-create endpoint is not available in current backend.'));
  },
};

// Quiz Attempt API - Spring backend URLs
export const attemptsApi = {
  getById: (id: string) => {
    void id;
    return Promise.reject(new Error('Quiz attempt lookup by ID endpoint is not available in current backend.'));
  },

  submit: (id: string, answers: Record<string, unknown>) =>
    apiClient.post(`/assessments/quiz-attempts/${id}/submit`, answers),

  getResults: (id: string) => {
    void id;
    return Promise.reject(new Error('Quiz attempt results endpoint is not available in current backend.'));
  },
  getAttemptsForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user`),
  getLatestForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user/latest`),
  getInProgressForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user/in-progress`),
};

// Submissions API - Spring backend URLs
export const submissionsApi = {
  getForAssignment: (assignmentId: string) =>
    apiClient.get(`/submissions?assignmentId=${encodeURIComponent(assignmentId)}`),

  getMySubmission: (assignmentId: string) =>
    apiClient.get(`/submissions/my?assignmentId=${encodeURIComponent(assignmentId)}`),

  submit: (assignmentId: string, content?: string, files?: File[]) => {
    const formData = new FormData();
    formData.append('assignmentId', assignmentId);
    if (content) formData.append('content', content);
    if (files) {
      files.forEach(file => formData.append('files', file));
    }
    return apiClient.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  grade: (submissionId: string, score: number, feedback?: string) =>
    apiClient.post(`/submissions/${submissionId}/grade`, { score, feedback }),

  getById: (id: string) =>
    apiClient.get(`/submissions/${id}`),
};
