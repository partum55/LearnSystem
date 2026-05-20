import apiClient from '../../../api/client';
import { marked } from 'marked';
import { AuthoringEndpoints, AuthoringResponse, TaskDraft, ValidationResult, PreviewPayload } from '../types';

type UnknownRecord = Record<string, unknown>;
type AuthoringApiResult<T> = Promise<{ data: AuthoringResponse<T> }>;

export interface AuthoringApiContext {
  courseId?: string;
  moduleId?: string;
}

export const defaultAuthoringEndpoints: AuthoringEndpoints = {
  createTask: '/assessments/assignments',
  updateTask: (id: string) => `/assessments/assignments/${id}`,
  validateTask: '/assessments/authoring/validate',
  previewTask: '/assessments/authoring/preview',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value?: string): boolean => Boolean(value && uuidPattern.test(value));

const mapFormatToBackend = (format: string): 'MARKDOWN' | 'HTML' => {
  return format === 'HTML' ? 'HTML' : 'MARKDOWN';
};

const mapQuestionType = (type: TaskDraft['questions'][number]['type']): string => {
  switch (type) {
    case 'MCQ':
      return 'SINGLE_CHOICE';
    case 'MULTI_SELECT':
      return 'MULTIPLE_RESPONSE';
    case 'NUMERIC':
      return 'NUMERIC';
    case 'OPEN_TEXT':
    case 'LATEX':
    default:
      return 'SHORT_ANSWER';
  }
};

const asStringArray = (values: Array<string | undefined | null>): string[] => {
  return values.map((item) => String(item ?? '').trim()).filter(Boolean);
};

const toQuestionPayload = (
  draft: TaskDraft,
  question: TaskDraft['questions'][number],
  context: AuthoringApiContext
): UnknownRecord => {
  const backendType = mapQuestionType(question.type);
  const choices = asStringArray(question.options.map((option) => option.text));
  const correctChoices = question.options
    .filter((option) => option.isCorrect)
    .map((option) => String(option.text ?? '').trim())
    .filter(Boolean);
  const numericValue = Number(question.correctAnswer ?? '');

  let options: UnknownRecord = {};
  let correctAnswer: UnknownRecord = {};

  if (backendType === 'SINGLE_CHOICE') {
    options = { choices };
    correctAnswer = { choice: correctChoices[0] ?? '' };
  } else if (backendType === 'MULTIPLE_RESPONSE') {
    options = { choices };
    correctAnswer = { choices: correctChoices };
  } else if (backendType === 'NUMERIC') {
    correctAnswer = {
      value: Number.isFinite(numericValue) ? numericValue : 0,
      tolerance: 0.01,
    };
  } else if (question.correctAnswer?.trim()) {
    correctAnswer = { answer: question.correctAnswer.trim() };
  }

  return {
    courseId: context.courseId,
    questionType: backendType,
    topic: draft.metadata.title || 'General',
    difficulty: draft.metadata.difficulty,
    stem: question.prompt.trim() || 'Untitled question',
    options,
    correctAnswer,
    explanation: question.explanation || undefined,
    points: Math.max(0.01, question.points || 1),
    metadata: {
      format: question.format,
      taskType: draft.type,
    },
    tags: draft.metadata.tags,
  };
};

const toInlineQuizQuestion = (question: TaskDraft['questions'][number]): UnknownRecord => {
  const backendType = mapQuestionType(question.type);
  const choices = asStringArray(question.options.map((option) => option.text));
  const correctChoices = question.options
    .filter((option) => option.isCorrect)
    .map((option) => String(option.text ?? '').trim())
    .filter(Boolean);
  const numericValue = Number(question.correctAnswer ?? '');

  const payload: UnknownRecord = {
    questionType: backendType,
    stem: question.prompt.trim() || 'Untitled question',
    promptDocument: undefined,
    options: {},
    correctAnswer: {},
    explanation: question.explanation || undefined,
    points: Math.max(0.01, question.points || 1),
    metadata: { format: question.format },
  };

  if (backendType === 'SINGLE_CHOICE') {
    payload.options = { choices };
    payload.correctAnswer = { choice: correctChoices[0] ?? '' };
  } else if (backendType === 'MULTIPLE_RESPONSE') {
    payload.options = { choices };
    payload.correctAnswer = { choices: correctChoices };
  } else if (backendType === 'NUMERIC') {
    payload.correctAnswer = {
      value: Number.isFinite(numericValue) ? numericValue : 0,
      tolerance: 0.01,
    };
  } else if (question.correctAnswer?.trim()) {
    payload.correctAnswer = { answer: question.correctAnswer.trim() };
  }

  return payload;
};

const toAssignmentPayload = (draft: TaskDraft, context: AuthoringApiContext): UnknownRecord => {
  const assignmentType = draft.type === 'QUIZ' ? 'QUIZ' : 'TEXT';
  const totalPoints = draft.questions.reduce((sum, question) => sum + Math.max(question.points || 0, 0), 0);
  const maxPoints = totalPoints > 0 ? totalPoints : 100;

  const payload: UnknownRecord = {
    courseId: context.courseId,
    moduleId: context.moduleId,
    assignmentType,
    title: draft.metadata.title,
    description: draft.metadata.description,
    descriptionFormat: mapFormatToBackend(draft.metadata.format),
    instructions: draft.metadata.description,
    instructionsFormat: mapFormatToBackend(draft.metadata.format),
    maxPoints,
    allowLateSubmission: Boolean(draft.settings.allowLateSubmission),
    latePenaltyPercent: draft.settings.allowLateSubmission ? 0 : undefined,
    tags: draft.metadata.tags,
    estimatedDuration: draft.settings.timeLimitMinutes,
    isPublished: draft.settings.draftState === 'PUBLISHED',
  };

  if (assignmentType === 'QUIZ') {
    payload.quiz = {
      title: draft.metadata.title,
      description: draft.metadata.description,
      timerEnabled: Boolean(draft.settings.timeLimitMinutes),
      timeLimit: draft.settings.timeLimitMinutes ?? null,
      attemptLimitEnabled: Boolean(draft.settings.attemptsAllowed),
      attemptsAllowed: draft.settings.attemptsAllowed ?? null,
      attemptScorePolicy: 'HIGHEST',
      secureSessionEnabled: false,
      secureRequireFullscreen: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      showCorrectAnswers: true,
      passPercentage: 60,
      questions: draft.questions.map(toInlineQuizQuestion),
    };
  }

  return payload;
};

const validateDraftLocally = (draft: TaskDraft): ValidationResult => {
  const issues: ValidationResult['issues'] = [];

  if (!draft.metadata.title.trim()) {
    issues.push({ field: 'metadata.title', message: 'Title is required.', severity: 'ERROR' });
  }

  if (!draft.metadata.description.trim()) {
    issues.push({ field: 'metadata.description', message: 'Description is required.', severity: 'ERROR' });
  }

  if (draft.type === 'QUIZ' && draft.questions.length === 0) {
    issues.push({ field: 'questions', message: 'Quiz needs at least one question.', severity: 'ERROR' });
  }

  draft.questions.forEach((question, index) => {
    if (!question.prompt.trim()) {
      issues.push({
        field: `questions[${index}].prompt`,
        message: 'Question prompt is required.',
        severity: 'ERROR',
      });
    }

    if ((question.type === 'MCQ' || question.type === 'MULTI_SELECT') && question.options.length < 2) {
      issues.push({
        field: `questions[${index}].options`,
        message: 'Add at least two options.',
        severity: 'ERROR',
      });
    }

    if ((question.type === 'MCQ' || question.type === 'MULTI_SELECT') && !question.options.some((option) => option.isCorrect)) {
      issues.push({
        field: `questions[${index}].options`,
        message: 'Select at least one correct option.',
        severity: 'ERROR',
      });
    }

    if (question.type === 'NUMERIC' && !question.correctAnswer?.trim()) {
      issues.push({
        field: `questions[${index}].correctAnswer`,
        message: 'Numeric questions require a correct answer.',
        severity: 'ERROR',
      });
    }
  });

  return {
    valid: issues.every((issue) => issue.severity !== 'ERROR'),
    issues,
  };
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderPreview = (payload: PreviewPayload): string => {
  if (payload.format === 'HTML') {
    return payload.content;
  }

  if (payload.format === 'MARKDOWN') {
    const rendered = marked.parse(payload.content ?? '');
    return typeof rendered === 'string' ? rendered : '';
  }

  return `<pre>${escapeHtml(payload.content ?? '')}</pre>`;
};

const withWrappedData = <T>(data: T, warnings?: string[]): { data: AuthoringResponse<T> } => ({
  data: {
    data,
    warnings,
  },
});

const saveQuestionBankDraft = async (
  payload: TaskDraft,
  context: AuthoringApiContext
): Promise<TaskDraft> => {
  const persistedQuestions: TaskDraft['questions'] = [];

  for (const question of payload.questions) {
    const questionPayload = toQuestionPayload(payload, question, context);
    const shouldUpdate = isUuid(question.id);
    const response = shouldUpdate
      ? await apiClient.put<UnknownRecord>(`/assessments/questions/${question.id}`, questionPayload)
      : await apiClient.post<UnknownRecord>('/assessments/questions', questionPayload);

    const persistedId = String((response.data as UnknownRecord).id ?? question.id);
    persistedQuestions.push({
      ...question,
      id: persistedId,
    });
  }

  return {
    ...payload,
    id: persistedQuestions[0]?.id ?? payload.id,
    questions: persistedQuestions,
    updatedAt: new Date().toISOString(),
  };
};

const saveAssignmentDraft = async (
  payload: TaskDraft,
  context: AuthoringApiContext,
  endpoints: AuthoringEndpoints,
  id?: string
): Promise<TaskDraft> => {
  if (!context.courseId && !id) {
    throw new Error('Course ID is required to create assignment tasks.');
  }

  const assignmentPayload = toAssignmentPayload(payload, context);
  const response = id
    ? await apiClient.put<UnknownRecord>(endpoints.updateTask(id), assignmentPayload)
    : await apiClient.post<UnknownRecord>(endpoints.createTask, assignmentPayload);

  const backendId = String((response.data as UnknownRecord).id ?? id ?? payload.id ?? '');
  return {
    ...payload,
    id: backendId || payload.id,
    updatedAt: new Date().toISOString(),
  };
};

export const createAuthoringApi = (
  context: AuthoringApiContext = {},
  endpoints: AuthoringEndpoints = defaultAuthoringEndpoints
) => ({
  createTask: async (payload: TaskDraft): AuthoringApiResult<TaskDraft> => {
    const savedDraft =
      payload.type === 'QUESTION_BANK'
        ? await saveQuestionBankDraft(payload, context)
        : await saveAssignmentDraft(payload, context, endpoints);
    return withWrappedData(savedDraft);
  },

  updateTask: async (id: string, payload: Partial<TaskDraft>): AuthoringApiResult<TaskDraft> => {
    const fullDraft = {
      ...(payload as TaskDraft),
      id,
    };

    const savedDraft =
      fullDraft.type === 'QUESTION_BANK'
        ? await saveQuestionBankDraft(fullDraft, context)
        : await saveAssignmentDraft(fullDraft, context, endpoints, id);
    return withWrappedData(savedDraft);
  },

  validateTask: async (payload: TaskDraft): AuthoringApiResult<ValidationResult> => {
    return withWrappedData(validateDraftLocally(payload));
  },

  previewTask: async (payload: PreviewPayload): AuthoringApiResult<string> => {
    return withWrappedData(renderPreview(payload));
  },
});
