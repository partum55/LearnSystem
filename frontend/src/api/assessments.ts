import apiClient from './client';
import { Assignment, Quiz, Question, QuizSection, QuizAttemptQuestion, QuizAttempt } from '../types';
import { PageResponse } from './types';

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
  id: String(raw.id ?? ''),
  courseId: String(raw.courseId ?? raw.course ?? ''),
  moduleId: raw.moduleId ? String(raw.moduleId) : undefined,
  topicId: raw.topicId ? String(raw.topicId) : undefined,
  categoryId: raw.categoryId ? String(raw.categoryId) : undefined,
  assignmentType: String(raw.assignmentType ?? 'FILE_UPLOAD') as Assignment['assignmentType'],
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  descriptionFormat: String(raw.descriptionFormat ?? 'MARKDOWN'),
  instructions: raw.instructions as string | undefined,
  instructionsFormat: String(raw.instructionsFormat ?? 'MARKDOWN'),
  dueDate: raw.dueDate as string | undefined,
  availableFrom: raw.availableFrom as string | undefined,
  availableUntil: raw.availableUntil as string | undefined,
  maxPoints: asNumber(raw.maxPoints, 100),
  submissionTypes: raw.submissionTypes as string[] | undefined,
  allowedFileTypes: raw.allowedFileTypes as string[] | undefined,
  maxFileSize: asNumber(raw.maxFileSize, 10485760),
  maxFiles: asNumber(raw.maxFiles, 5),
  programmingLanguage: raw.programmingLanguage as string | undefined,
  starterCode: raw.starterCode as string | undefined,
  autoGradingEnabled: Boolean(raw.autoGradingEnabled),
  vplConfig: raw.vplConfig as Assignment['vplConfig'],
  testCases: ((raw.testCases as UnknownRecord[] | undefined) || []).map((tc) => ({
    ...tc,
    input: String(tc.input ?? ''),
    output: String(tc.output ?? tc.expectedOutput ?? ''),
  })),
  quiz: (raw.quizId as string | undefined) || (raw.quiz as string | undefined),
  externalToolUrl: raw.externalToolUrl as string | undefined,
  externalToolConfig: raw.externalToolConfig as Record<string, unknown> | undefined,
  gradeAnonymously: Boolean(raw.gradeAnonymously),
  peerReviewEnabled: Boolean(raw.peerReviewEnabled),
  peerReviewsRequired: asNumber(raw.peerReviewsRequired, 0),
  allowLateSubmission: Boolean(raw.allowLateSubmission),
  latePenaltyPercent: asNumber(raw.latePenaltyPercent, 0),
  isPublished: Boolean(raw.isPublished),
  createdAt: raw.createdAt as string || '',
  updatedAt: raw.updatedAt as string || '',
  createdBy: raw.createdBy as string | undefined,
  createdByName: raw.createdByName as string | undefined,
});

const mapAssignmentToApi = (raw: Partial<Assignment> & UnknownRecord): UnknownRecord => {
  const quizRef = raw.quiz;
  const quizId = typeof quizRef === 'string' ? quizRef : undefined;
  const inlineQuiz = (raw.quiz && typeof raw.quiz === 'object' && !Array.isArray(raw.quiz)) ? raw.quiz : undefined;

  return compact({
    courseId: raw.courseId ?? raw.course,
    moduleId: raw.moduleId,
    topicId: raw.topicId,
    categoryId: raw.categoryId,
    position: raw.position,
    assignmentType: raw.assignmentType,
    title: raw.title,
    description: raw.description,
    descriptionFormat: raw.descriptionFormat,
    instructions: raw.instructions,
    instructionsFormat: raw.instructionsFormat,
    resources: raw.resources,
    starterCode: raw.starterCode,
    programmingLanguage: raw.programmingLanguage,
    autoGradingEnabled: raw.autoGradingEnabled,
    vplConfig: raw.vplConfig,
    testCases: raw.testCases,
    maxPoints: raw.maxPoints,
    dueDate: raw.dueDate,
    availableFrom: raw.availableFrom,
    availableUntil: raw.availableUntil,
    allowLateSubmission: raw.allowLateSubmission,
    latePenaltyPercent: raw.latePenaltyPercent,
    submissionTypes: raw.submissionTypes,
    allowedFileTypes: raw.allowedFileTypes,
    maxFileSize: raw.maxFileSize,
    maxFiles: raw.maxFiles,
    quizId,
    quiz: inlineQuiz,
    externalToolUrl: raw.externalToolUrl,
    externalToolConfig: raw.externalToolConfig,
    gradeAnonymously: raw.gradeAnonymously,
    peerReviewEnabled: raw.peerReviewEnabled,
    peerReviewsRequired: raw.peerReviewsRequired,
    estimatedDuration: raw.estimatedDuration,
    isTemplate: raw.isTemplate,
    isArchived: raw.isArchived,
    isPublished: raw.isPublished,
  });
};

const mapQuizFromApi = (raw: UnknownRecord): Quiz => ({
  id: String(raw.id ?? ''),
  courseId: String(raw.courseId ?? raw.course ?? ''),
  moduleId: raw.moduleId ? String(raw.moduleId) : undefined,
  title: String(raw.title ?? ''),
  description: raw.description as string || '',
  timeLimit: raw.timeLimit as number | undefined,
  timerEnabled: Boolean(raw.timerEnabled),
  attemptsAllowed: raw.attemptsAllowed === null || raw.attemptsAllowed === undefined ? null : asNumber(raw.attemptsAllowed, 1),
  attemptLimitEnabled: Boolean(raw.attemptLimitEnabled),
  attemptScorePolicy: String(raw.attemptScorePolicy ?? 'HIGHEST') as Quiz['attemptScorePolicy'],
  secureSessionEnabled: Boolean(raw.secureSessionEnabled),
  secureRequireFullscreen: raw.secureRequireFullscreen === undefined ? undefined : Boolean(raw.secureRequireFullscreen),
  randomizeQuestions: Boolean(raw.shuffleQuestions ?? raw.randomizeQuestions),
  randomizeAnswers: Boolean(raw.shuffleAnswers ?? raw.randomizeAnswers),
  questions: (raw.questions as Question[] | undefined) || [],
  sections: ((raw.sections as UnknownRecord[] | undefined) || []).map((section) => ({
    id: String(section.id ?? ''),
    quizId: String(section.quizId ?? ''),
    title: String(section.title ?? ''),
    position: asNumber(section.position, 0),
    questionCount: asNumber(section.questionCount, 0),
    rules: ((section.rules as UnknownRecord[] | undefined) || []).map((rule) => ({
      id: String(rule.id ?? ''),
      questionType: rule.questionType as string | undefined,
      difficulty: rule.difficulty as string | undefined,
      tag: rule.tag as string | undefined,
      quota: asNumber(rule.quota, 1),
    })),
  })),
  createdAt: raw.createdAt as string || '',
  updatedAt: raw.updatedAt as string || '',
});

const mapQuestionFromApi = (raw: UnknownRecord): Question => ({
  id: String(raw.id ?? ''),
  courseId: String(raw.courseId ?? ''),
  topic: raw.topic as string | undefined,
  difficulty: raw.difficulty as string | undefined,
  tags: raw.tags as string[] | undefined,
  type: String(raw.questionType ?? 'short_answer').toLowerCase() as Question['type'],
  stem: String(raw.stem ?? ''),
  imageUrl: raw.imageUrl as string | undefined,
  options: Array.isArray(raw.options) ? raw.options as string[] : ((raw.options as UnknownRecord | undefined)?.choices as string[] | undefined) || [],
  correctAnswer: (raw.correctAnswer ?? '') as Question['correctAnswer'],
  points: asNumber(raw.points, 1),
  latestVersion: asNumber(raw.latestVersion, 0),
});

const mapAttemptQuestionFromApi = (raw: UnknownRecord): QuizAttemptQuestion => ({
  id: String(raw.id ?? ''),
  attemptId: String(raw.attemptId ?? ''),
  questionId: String(raw.questionId ?? ''),
  questionVersionId: raw.questionVersionId ? String(raw.questionVersionId) : undefined,
  position: asNumber(raw.position, 0),
  points: asNumber(raw.points, 0),
  promptSnapshot: raw.promptSnapshot as Record<string, unknown> || {},
  payloadSnapshot: raw.payloadSnapshot as Record<string, unknown> || {},
});

const mapAttemptFromApi = (raw: UnknownRecord): QuizAttempt => ({
  id: String(raw.id ?? ''),
  quizId: String(raw.quizId ?? ''),
  userId: String(raw.userId ?? ''),
  startedAt: String(raw.startedAt ?? ''),
  submittedAt: raw.submittedAt as string | undefined,
  answers: raw.answers as Record<string, unknown> || {},
  autoScore: raw.autoScore !== undefined ? asNumber(raw.autoScore) : undefined,
  finalScore: raw.finalScore !== undefined ? asNumber(raw.finalScore) : undefined,
  gradedBy: raw.gradedBy ? String(raw.gradedBy) : undefined,
  expiresAt: raw.expiresAt as string | undefined,
  remainingSeconds: raw.remainingSeconds !== undefined ? asNumber(raw.remainingSeconds) : undefined,
  timedOut: raw.timedOut === undefined ? undefined : Boolean(raw.timedOut),
  proctoringData: raw.proctoringData as Record<string, unknown> | undefined,
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

  getStatistics: async (id: string) => {
    const response = await apiClient.get<UnknownRecord[]>(`/submissions?assignmentId=${encodeURIComponent(id)}`);
    const submissions = Array.isArray(response.data) ? response.data : [];
    const gradedScores = submissions
      .map((submission) => submission.grade ?? submission.score)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageScore =
      gradedScores.length > 0
        ? gradedScores.reduce((sum, value) => sum + value, 0) / gradedScores.length
        : 0;

    return {
      ...response,
      data: {
        totalSubmissions: submissions.length,
        gradedSubmissions: gradedScores.length,
        pendingSubmissions: Math.max(0, submissions.length - gradedScores.length),
        averageScore,
      },
    };
  },

  duplicate: (
    id: string,
    payload?: { targetCourseId?: string; targetModuleId?: string }
  ) =>
    apiClient
      .post<UnknownRecord>(
        `/assessments/assignments/${id}/duplicate`,
        compact({
          targetCourseId: payload?.targetCourseId,
          targetModuleId: payload?.targetModuleId,
        })
      )
      .then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  archive: (id: string) =>
    apiClient.post<UnknownRecord>(`/assessments/assignments/${id}/archive`).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  publish: (id: string) =>
    apiClient.post<UnknownRecord>(`/assessments/assignments/${id}/publish`).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

  unpublish: (id: string) =>
    apiClient.post<UnknownRecord>(`/assessments/assignments/${id}/unpublish`).then((response) => ({
      ...response,
      data: mapAssignmentFromApi(response.data),
    })),

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

  getOverdue: (courseId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/assignments/course/${courseId}/overdue`).then((response) => ({
      ...response,
      data: response.data.map(mapAssignmentFromApi),
    })),
};

// Quiz API - Spring backend URLs
export const quizzesApi = {
  getAll: async (courseId: string) => {
    const assignmentsResponse = await apiClient.get<PageResponse<UnknownRecord>>(
      `/assessments/assignments/course/${courseId}?size=200`
    );
    const quizIds = Array.from(
      new Set(
        (assignmentsResponse.data.content || [])
          .filter((item) => String(item.assignmentType ?? '') === 'QUIZ')
          .map((item) => item.quizId)
          .filter((quizId): quizId is string => Boolean(quizId))
          .map((quizId) => String(quizId))
      )
    );

    const quizzes = await Promise.all(
      quizIds.map(async (quizId) => {
        try {
          const quizResponse = await apiClient.get<UnknownRecord>(`/assessments/quizzes/${quizId}`);
          return mapQuizFromApi(quizResponse.data);
        } catch {
          return null;
        }
      })
    );

    return {
      ...assignmentsResponse,
      data: quizzes.filter((quiz): quiz is Quiz => Boolean(quiz)),
    };
  },

  getById: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/quizzes/${id}`).then((response) => ({
      ...response,
      data: mapQuizFromApi(response.data),
    })),

  create: async (data: Partial<Quiz> & UnknownRecord) => {
    const courseId = String(data.courseId ?? data.course ?? '');
    const moduleId = String(data.moduleId ?? data.module ?? '');
    const title = String(data.title ?? '');
    const description = (data.description as string | undefined) || undefined;
    if (!moduleId) {
      throw new Error('moduleId is required to create a quiz');
    }

    const assignmentResponse = await apiClient.post<UnknownRecord>('/assessments/assignments', compact({
      courseId,
      moduleId,
      assignmentType: 'QUIZ',
      title,
      description: description ?? '',
      maxPoints: 100,
      isPublished: false,
      quiz: {
        title,
        description,
        timeLimit: data.timeLimit,
        attemptsAllowed: data.attemptsAllowed,
        shuffleQuestions: data.randomizeQuestions ?? (data as UnknownRecord).shuffleQuestions,
        shuffleAnswers: data.randomizeAnswers ?? (data as UnknownRecord).shuffleAnswers,
        showCorrectAnswers: (data as UnknownRecord).showCorrectAnswers,
        passPercentage: (data as UnknownRecord).passPercentage,
      },
    }));

    const createdQuizId = assignmentResponse.data.quizId;
    if (!createdQuizId) {
      throw new Error('Quiz was not created for the assignment');
    }
    const quizResponse = await apiClient.get<UnknownRecord>(`/assessments/quizzes/${String(createdQuizId)}`);
    return {
      ...assignmentResponse,
      data: mapQuizFromApi(quizResponse.data),
    };
  },

  update: (id: string, data: Partial<Quiz>) =>
    apiClient.put<UnknownRecord>(`/assessments/quizzes/${id}`, {
      title: data.title,
      description: data.description,
      timeLimit: data.timeLimit,
      attemptsAllowed: data.attemptsAllowed,
      shuffleQuestions: data.randomizeQuestions,
      shuffleAnswers: data.randomizeAnswers,
    }).then((response) => ({
      ...response,
      data: mapQuizFromApi(response.data),
    })),

  delete: (id: string) => apiClient.delete(`/assessments/quizzes/${id}`),

  duplicate: (
    id: string,
    payload?: { targetCourseId?: string; targetModuleId?: string }
  ) =>
    apiClient
      .post<UnknownRecord>(
        `/assessments/quizzes/${id}/duplicate`,
        compact({
          targetCourseId: payload?.targetCourseId,
          targetModuleId: payload?.targetModuleId,
        })
      )
      .then((response) => ({
        ...response,
        data: mapQuizFromApi(response.data),
      })),

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

  getSections: (quizId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/quizzes/${quizId}/sections`).then((response) => ({
      ...response,
      data: response.data.map((section) => ({
        id: String(section.id ?? ''),
        quizId: String(section.quizId ?? ''),
        title: String(section.title ?? ''),
        position: asNumber(section.position, 0),
        questionCount: asNumber(section.questionCount, 0),
        rules: ((section.rules as UnknownRecord[] | undefined) || []).map((rule) => ({
          id: String(rule.id ?? ''),
          questionType: rule.questionType as string | undefined,
          difficulty: rule.difficulty as string | undefined,
          tag: rule.tag as string | undefined,
          quota: asNumber(rule.quota, 1),
        })),
      })) as QuizSection[],
    })),

  createSection: (
    quizId: string,
    payload: { title: string; position?: number; questionCount?: number; rules?: Array<{ questionType?: string; difficulty?: string; tag?: string; quota: number }> }
  ) => apiClient.post(`/assessments/quizzes/${quizId}/sections`, payload),

  updateSection: (
    quizId: string,
    sectionId: string,
    payload: { title: string; position?: number; questionCount?: number; rules?: Array<{ questionType?: string; difficulty?: string; tag?: string; quota: number }> }
  ) => apiClient.put(`/assessments/quizzes/${quizId}/sections/${sectionId}`, payload),

  deleteSection: (quizId: string, sectionId: string) =>
    apiClient.delete(`/assessments/quizzes/${quizId}/sections/${sectionId}`),

  exportJson: (quizId: string) =>
    apiClient.get(`/assessments/quizzes/${quizId}/export/json`),

  exportCsv: (quizId: string) =>
    apiClient.get(`/assessments/quizzes/${quizId}/export/csv`, { responseType: 'text' as const }),

  importJson: (payload: UnknownRecord) =>
    apiClient.post(`/assessments/quizzes/import/json`, payload),

  importCsv: (courseId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('title', title);
    formData.append('file', file);
    return apiClient.post(`/assessments/quizzes/import/csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importExcel: (courseId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('title', title);
    formData.append('file', file);
    return apiClient.post(`/assessments/quizzes/import/excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importWord: (courseId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('title', title);
    formData.append('file', file);
    return apiClient.post(`/assessments/quizzes/import/word`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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
      courseId: data.courseId ?? data.course,
      questionType: data.type,
      topic: data.topic,
      difficulty: data.difficulty,
      tags: data.tags,
      stem: data.stem,
      imageUrl: data.imageUrl,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      points: data.points,
      metadata: data.metadata,
    })).then((response) => ({
      ...response,
      data: mapQuestionFromApi(response.data),
    })),

  update: (id: string, data: Partial<Question>) =>
    apiClient.put<UnknownRecord>(`/assessments/questions/${id}`, compact({
      questionType: data.type,
      topic: data.topic,
      difficulty: data.difficulty,
      tags: data.tags,
      stem: data.stem,
      imageUrl: data.imageUrl,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: (data as UnknownRecord).explanation,
      points: data.points,
      metadata: data.metadata,
    })).then((response) => ({
      ...response,
      data: mapQuestionFromApi(response.data),
    })),

  delete: (id: string) => apiClient.delete(`/assessments/questions/${id}`),

  getVersions: (questionId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/questions/${questionId}/versions`).then((response) => ({
      ...response,
      data: response.data.map((item) => ({
        id: String(item.id ?? ''),
        questionId: String(item.questionId ?? ''),
        versionNumber: asNumber(item.versionNumber, 0),
        promptDocJson: item.promptDocJson as Record<string, unknown> || {},
        payloadJson: item.payloadJson as Record<string, unknown> || {},
        answerKeyJson: item.answerKeyJson as Record<string, unknown> || {},
      })),
    })),

  getLatestVersion: (questionId: string) =>
    apiClient.get<UnknownRecord>(`/assessments/questions/${questionId}/versions/latest`),

  createVersion: (
    questionId: string,
    payload: {
      promptDocJson: Record<string, unknown>;
      payloadJson?: Record<string, unknown>;
      answerKeyJson?: Record<string, unknown>;
    }
  ) => apiClient.post(`/assessments/questions/${questionId}/versions`, payload),

  bulkCreate: async (questions: Partial<Question>[]) => {
    const created = await Promise.all(
      questions.map((question) => questionsApi.create(question as Partial<Question> & UnknownRecord))
    );
    return {
      data: created.map((response) => response.data),
    };
  },
};

// Quiz Attempt API - Spring backend URLs
export const attemptsApi = {
  getById: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/quiz-attempts/${id}`).then((response) => ({
      ...response,
      data: mapAttemptFromApi(response.data),
    })),

  submit: (id: string, answers: Record<string, unknown>) =>
    apiClient.post(`/assessments/quiz-attempts/${id}/submit`, answers),

  save: (id: string, answers: Record<string, unknown>) =>
    apiClient.post(`/assessments/quiz-attempts/${id}/save`, answers),

  getQuestions: (id: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/quiz-attempts/${id}/questions`).then((response) => ({
      ...response,
      data: response.data.map(mapAttemptQuestionFromApi),
    })),

  getResults: (id: string) =>
    apiClient.get<UnknownRecord>(`/assessments/quiz-attempts/${id}/results`),
  getAttemptsForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user`),
  getLatestForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user/latest`),
  getOfficialForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user/official`),
  getInProgressForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/user/in-progress`),
  getUngradedForQuiz: (quizId: string) =>
    apiClient.get(`/assessments/quiz-attempts/quiz/${quizId}/ungraded`),
  recordViolation: (attemptId: string, payload: { type: string; details?: Record<string, unknown> }) =>
    apiClient.post(`/assessments/quiz-attempts/${attemptId}/violations`, payload),
};

// Submissions API - Spring backend URLs
export const submissionsApi = {
  getForAssignment: (assignmentId: string) =>
    apiClient.get(`/submissions?assignmentId=${encodeURIComponent(assignmentId)}`),

  getReviewQueue: (
    assignmentId: string,
    params?: {
      status?: string;
      search?: string;
      page?: number;
      size?: number;
      sort?: string;
    }
  ) =>
    apiClient.get('/submissions/review-queue', {
      params: compact({
        assignmentId,
        status: params?.status,
        search: params?.search,
        page: params?.page,
        size: params?.size,
        sort: params?.sort,
      }),
    }),

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
    apiClient.post(`/submissions/${submissionId}/grade-draft`, { finalScore: score, feedback }),

  saveGradeDraft: (
    submissionId: string,
    payload: {
      rawScore?: number;
      finalScore?: number;
      feedback?: string;
      overridePenalty?: boolean;
      version?: number | null;
    }
  ) => apiClient.post(`/submissions/${submissionId}/grade-draft`, payload),

  publishGrade: (
    submissionId: string,
    payload?: {
      finalScore?: number;
      feedback?: string;
      version?: number | null;
    }
  ) => apiClient.post(`/submissions/${submissionId}/publish-grade`, payload || {}),

  publishBulk: (
    items: Array<{ submissionId: string; version?: number | null }>
  ) =>
    apiClient.post('/submissions/grades/publish-bulk', {
      items: items.map((item) => ({
        submissionId: item.submissionId,
        version: item.version,
      })),
    }),

  getById: (id: string) =>
    apiClient.get(`/submissions/${id}`),

  updateDraft: (
    submissionId: string,
    payload: {
      content?: string;
      textAnswer?: string;
      submissionUrl?: string;
      programmingLanguage?: string;
    }
  ) =>
    apiClient.put(`/submissions/${submissionId}/draft`, payload),
};
