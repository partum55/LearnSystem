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
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? raw.course ?? ''),
  module_id: (raw.moduleId ?? raw.module_id) ? String(raw.moduleId ?? raw.module_id) : undefined,
  topic_id: (raw.topicId ?? raw.topic_id) ? String(raw.topicId ?? raw.topic_id) : undefined,
  category_id: (raw.categoryId ?? raw.category_id) ? String(raw.categoryId ?? raw.category_id) : undefined,
  assignment_type: String(raw.assignmentType ?? raw.assignment_type ?? 'FILE_UPLOAD') as Assignment['assignment_type'],
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  description_format: String(raw.descriptionFormat ?? raw.description_format ?? 'MARKDOWN'),
  instructions: (raw.instructions as string | undefined) || undefined,
  instructions_format: String(raw.instructionsFormat ?? raw.instructions_format ?? 'MARKDOWN'),
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
  const quizRef = raw.quizId ?? raw.quiz_id ?? raw.quiz;
  const quizId = typeof quizRef === 'string' ? quizRef : undefined;
  const inlineQuiz = (raw.quiz && typeof raw.quiz === 'object' && !Array.isArray(raw.quiz))
    ? raw.quiz
    : undefined;

  return compact({
    courseId: raw.courseId ?? raw.course_id ?? raw.course,
    moduleId: raw.moduleId ?? raw.module_id ?? raw.module,
    topicId: raw.topicId ?? raw.topic_id,
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
    dueDate: raw.dueDate ?? raw.due_date,
    availableFrom: raw.availableFrom ?? raw.available_from,
    availableUntil: raw.availableUntil ?? raw.available_until,
    allowLateSubmission: raw.allowLateSubmission ?? raw.allow_late_submission,
    latePenaltyPercent: raw.latePenaltyPercent ?? raw.late_penalty_percent,
    submissionTypes: raw.submissionTypes ?? raw.submission_types,
    allowedFileTypes: raw.allowedFileTypes ?? raw.allowed_file_types,
    maxFileSize: raw.maxFileSize ?? raw.max_file_size,
    maxFiles: raw.maxFiles ?? raw.max_files,
    quizId,
    quiz: inlineQuiz,
    externalToolUrl: raw.externalToolUrl ?? raw.external_tool_url,
    gradeAnonymously: raw.gradeAnonymously ?? raw.grade_anonymously,
    peerReviewEnabled: raw.peerReviewEnabled ?? raw.peer_review_enabled,
    peerReviewsRequired: raw.peerReviewsRequired ?? raw.peer_reviews_required,
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
  module_id: (raw.moduleId ?? raw.module_id) ? String(raw.moduleId ?? raw.module_id) : undefined,
  title: String(raw.title ?? ''),
  description: (raw.description as string | undefined) || '',
  time_limit: (raw.timeLimit as number | undefined) ?? (raw.time_limit as number | undefined),
  timer_enabled: Boolean(raw.timerEnabled ?? raw.timer_enabled),
  attempts_allowed:
    (raw.attemptsAllowed ?? raw.attempts_allowed) === null || (raw.attemptsAllowed ?? raw.attempts_allowed) === undefined
      ? null
      : asNumber(raw.attemptsAllowed ?? raw.attempts_allowed, 1),
  attempt_limit_enabled: Boolean(raw.attemptLimitEnabled ?? raw.attempt_limit_enabled),
  attempt_score_policy: String(raw.attemptScorePolicy ?? raw.attempt_score_policy ?? 'HIGHEST') as Quiz['attempt_score_policy'],
  secure_session_enabled: Boolean(raw.secureSessionEnabled ?? raw.secure_session_enabled),
  secure_require_fullscreen:
    raw.secureRequireFullscreen === undefined && raw.secure_require_fullscreen === undefined
      ? undefined
      : Boolean(raw.secureRequireFullscreen ?? raw.secure_require_fullscreen),
  randomize_questions: Boolean(raw.shuffleQuestions ?? raw.randomize_questions ?? raw.shuffle_questions),
  randomize_answers: Boolean(raw.shuffleAnswers ?? raw.randomize_answers ?? raw.shuffle_answers),
  questions: (raw.questions as Question[] | undefined) || [],
  sections: ((raw.sections as UnknownRecord[] | undefined) || []).map((section) => ({
    id: String(section.id ?? ''),
    quiz_id: String(section.quizId ?? section.quiz_id ?? ''),
    title: String(section.title ?? ''),
    position: asNumber(section.position, 0),
    question_count: asNumber(section.questionCount ?? section.question_count, 0),
    rules: ((section.rules as UnknownRecord[] | undefined) || []).map((rule) => ({
      id: String(rule.id ?? ''),
      question_type: (rule.questionType as string | undefined) || (rule.question_type as string | undefined),
      difficulty: (rule.difficulty as string | undefined),
      tag: (rule.tag as string | undefined),
      quota: asNumber(rule.quota, 1),
    })),
  })),
  created_at: (raw.createdAt as string | undefined) || (raw.created_at as string) || '',
  updated_at: (raw.updatedAt as string | undefined) || (raw.updated_at as string) || '',
});

const mapQuestionFromApi = (raw: UnknownRecord): Question => ({
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? ''),
  topic: (raw.topic as string | undefined) || undefined,
  difficulty: (raw.difficulty as string | undefined) || undefined,
  tags: (raw.tags as string[] | undefined) || undefined,
  type: String(raw.questionType ?? raw.question_type ?? 'short_answer').toLowerCase() as Question['type'],
  stem: String(raw.stem ?? ''),
  image_url: (raw.imageUrl as string | undefined) || (raw.image_url as string | undefined),
  options: (
    (Array.isArray(raw.options) ? raw.options : undefined)
      || (((raw.options as UnknownRecord | undefined)?.choices as string[] | undefined))
      || []
  ),
  correct_answer: ((raw.correctAnswer as unknown) ?? raw.correct_answer ?? '') as Question['correct_answer'],
  points: asNumber(raw.points, 1),
  latest_version: asNumber(raw.latestVersion ?? raw.latest_version, 0),
});

const mapAttemptQuestionFromApi = (raw: UnknownRecord): QuizAttemptQuestion => ({
  id: String(raw.id ?? ''),
  attempt_id: String(raw.attemptId ?? raw.attempt_id ?? ''),
  question_id: String(raw.questionId ?? raw.question_id ?? ''),
  question_version_id: (raw.questionVersionId ?? raw.question_version_id) ? String(raw.questionVersionId ?? raw.question_version_id) : undefined,
  position: asNumber(raw.position, 0),
  points: asNumber(raw.points, 0),
  prompt_snapshot: (raw.promptSnapshot as Record<string, unknown> | undefined) || (raw.prompt_snapshot as Record<string, unknown> | undefined) || {},
  payload_snapshot: (raw.payloadSnapshot as Record<string, unknown> | undefined) || (raw.payload_snapshot as Record<string, unknown> | undefined) || {},
});

const mapAttemptFromApi = (raw: UnknownRecord): QuizAttempt => ({
  id: String(raw.id ?? ''),
  quiz_id: String(raw.quizId ?? raw.quiz_id ?? ''),
  user_id: String(raw.userId ?? raw.user_id ?? ''),
  started_at: String(raw.startedAt ?? raw.started_at ?? ''),
  submitted_at: (raw.submittedAt as string | undefined) || (raw.submitted_at as string | undefined),
  answers: (raw.answers as Record<string, unknown> | undefined) || {},
  auto_score: (raw.autoScore ?? raw.auto_score) !== undefined ? asNumber(raw.autoScore ?? raw.auto_score) : undefined,
  final_score: (raw.finalScore ?? raw.final_score) !== undefined ? asNumber(raw.finalScore ?? raw.final_score) : undefined,
  graded_by: (raw.gradedBy ?? raw.graded_by) ? String(raw.gradedBy ?? raw.graded_by) : undefined,
  expires_at: (raw.expiresAt as string | undefined) || (raw.expires_at as string | undefined),
  remaining_seconds:
    (raw.remainingSeconds ?? raw.remaining_seconds) !== undefined
      ? asNumber(raw.remainingSeconds ?? raw.remaining_seconds)
      : undefined,
  timed_out:
    raw.timedOut === undefined && raw.timed_out === undefined
      ? undefined
      : Boolean(raw.timedOut ?? raw.timed_out),
  proctoring_data: (raw.proctoringData as Record<string, unknown> | undefined) || (raw.proctoring_data as Record<string, unknown> | undefined),
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
          .filter((item) => String(item.assignmentType ?? item.assignment_type ?? '') === 'QUIZ')
          .map((item) => item.quizId ?? item.quiz_id)
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
    const courseId = String(data.course_id ?? data.courseId ?? data.course ?? '');
    const moduleId = String(data.module_id ?? data.moduleId ?? data.module ?? '');
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
        timeLimit: data.time_limit ?? data.timeLimit,
        attemptsAllowed: data.attempts_allowed ?? data.attemptsAllowed,
        shuffleQuestions: data.randomize_questions ?? data.shuffleQuestions ?? data.shuffle_questions,
        shuffleAnswers: data.randomize_answers ?? data.shuffleAnswers ?? data.shuffle_answers,
        showCorrectAnswers: (data as UnknownRecord).show_correct_answers ?? (data as UnknownRecord).showCorrectAnswers,
        passPercentage: data.pass_percentage ?? data.passPercentage,
      },
    }));

    const createdQuizId = assignmentResponse.data.quizId ?? assignmentResponse.data.quiz_id;
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
      timeLimit: data.time_limit,
      attemptsAllowed: data.attempts_allowed,
      shuffleQuestions: data.randomize_questions,
      shuffleAnswers: data.randomize_answers,
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
        quiz_id: String(section.quizId ?? section.quiz_id ?? ''),
        title: String(section.title ?? ''),
        position: asNumber(section.position, 0),
        question_count: asNumber(section.questionCount ?? section.question_count, 0),
        rules: ((section.rules as UnknownRecord[] | undefined) || []).map((rule) => ({
          id: String(rule.id ?? ''),
          question_type: (rule.questionType as string | undefined) || (rule.question_type as string | undefined),
          difficulty: (rule.difficulty as string | undefined),
          tag: (rule.tag as string | undefined),
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
      courseId: data.courseId ?? data.course_id ?? data.course,
      questionType: data.questionType ?? data.question_type ?? data.type,
      topic: data.topic,
      difficulty: data.difficulty,
      tags: data.tags,
      stem: data.stem,
      imageUrl: data.imageUrl ?? data.image_url,
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
      topic: (data as UnknownRecord).topic,
      difficulty: (data as UnknownRecord).difficulty,
      tags: (data as UnknownRecord).tags,
      stem: data.stem,
      imageUrl: (data as UnknownRecord).imageUrl ?? (data as UnknownRecord).image_url,
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

  getVersions: (questionId: string) =>
    apiClient.get<UnknownRecord[]>(`/assessments/questions/${questionId}/versions`).then((response) => ({
      ...response,
      data: response.data.map((item) => ({
        id: String(item.id ?? ''),
        question_id: String(item.questionId ?? item.question_id ?? ''),
        version_number: asNumber(item.versionNumber ?? item.version_number, 0),
        prompt_doc_json: (item.promptDocJson as Record<string, unknown> | undefined) || (item.prompt_doc_json as Record<string, unknown> | undefined) || {},
        payload_json: (item.payloadJson as Record<string, unknown> | undefined) || (item.payload_json as Record<string, unknown> | undefined) || {},
        answer_key_json: (item.answerKeyJson as Record<string, unknown> | undefined) || (item.answer_key_json as Record<string, unknown> | undefined) || {},
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
