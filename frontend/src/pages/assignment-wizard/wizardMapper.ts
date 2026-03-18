import { WizardFormData, initialWizardFormData } from './wizardTypes';
import {
  AssignmentFormData,
  AssignmentRequestPayload,
  mapAssignmentResponseToFormData,
} from '../assignment-editor/assignmentEditorModel';
import { QuestionDraft } from '../../features/authoring/types';
import {
  createParagraphDocument,
  extractDocumentText,
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../../features/editor-core/documentUtils';

type InlineQuizQuestionPayload = {
  questionType: string;
  stem: string;
  promptDocument?: Record<string, unknown>;
  options: Record<string, unknown>;
  correctAnswer: Record<string, unknown>;
  explanation?: string;
  points: number;
  metadata?: Record<string, unknown>;
};

const toBackendQuestionType = (value: QuestionDraft['type']): string => {
  switch (value) {
    case 'MCQ':
      return 'SINGLE_CHOICE';
    case 'MULTI_SELECT':
      return 'MULTIPLE_RESPONSE';
    case 'NUMERIC':
      return 'NUMERIC';
    case 'OPEN_TEXT':
      return 'SHORT_ANSWER';
    case 'LATEX':
      return 'SHORT_ANSWER';
    default:
      return 'SHORT_ANSWER';
  }
};

const toInlineQuizQuestionPayload = (question: QuestionDraft): InlineQuizQuestionPayload => {
  const promptDoc = parseCanonicalDocument(question.prompt || '');
  const stem = extractDocumentText(promptDoc).trim() || 'Untitled question';

  if (question.type === 'MCQ') {
    const choices = question.options.map((option) => extractDocumentText(parseCanonicalDocument(option.text || '')).trim());
    const choiceDocuments = question.options.map((option) => parseCanonicalDocument(option.text || ''));
    const correctChoice =
      question.options.find((option) => option.isCorrect) || null;

    return {
      questionType: toBackendQuestionType(question.type),
      stem,
      promptDocument: promptDoc as unknown as Record<string, unknown>,
      options: {
        choices,
        choiceDocuments,
      },
      correctAnswer: {
        choice: correctChoice ? extractDocumentText(parseCanonicalDocument(correctChoice.text || '')).trim() : '',
      },
      explanation: question.explanation,
      points: question.points,
      metadata: {
        format: question.format,
      },
    };
  }

  if (question.type === 'MULTI_SELECT') {
    const choices = question.options.map((option) => extractDocumentText(parseCanonicalDocument(option.text || '')).trim());
    const choiceDocuments = question.options.map((option) => parseCanonicalDocument(option.text || ''));
    const correctChoices = question.options
      .filter((option) => option.isCorrect)
      .map((option) => extractDocumentText(parseCanonicalDocument(option.text || '')).trim());

    return {
      questionType: toBackendQuestionType(question.type),
      stem,
      promptDocument: promptDoc as unknown as Record<string, unknown>,
      options: {
        choices,
        choiceDocuments,
      },
      correctAnswer: {
        choices: correctChoices,
      },
      explanation: question.explanation,
      points: question.points,
      metadata: {
        format: question.format,
      },
    };
  }

  if (question.type === 'NUMERIC') {
    return {
      questionType: toBackendQuestionType(question.type),
      stem,
      promptDocument: promptDoc as unknown as Record<string, unknown>,
      options: {},
      correctAnswer: {
        value: Number(question.correctAnswer ?? 0),
        tolerance: 0.01,
      },
      explanation: question.explanation,
      points: question.points,
      metadata: {
        format: question.format,
      },
    };
  }

  return {
    questionType: toBackendQuestionType(question.type),
    stem,
    promptDocument: promptDoc as unknown as Record<string, unknown>,
    options: {},
    correctAnswer: question.type === 'LATEX'
      ? { answer: question.correctAnswer || '' }
      : {},
    explanation: question.explanation,
    points: question.points,
    metadata: {
      format: question.format,
    },
  };
};

/**
 * Convert backend API response to wizard form data.
 */
export function apiResponseToWizardData(raw: Record<string, unknown>): WizardFormData {
  const legacy = mapAssignmentResponseToFormData(raw);
  return legacyToWizardData(legacy);
}

/**
 * Convert legacy AssignmentFormData to wizard state.
 */
export function legacyToWizardData(legacy: AssignmentFormData): WizardFormData {
  const descriptionDoc = legacy.description_format === 'RICH'
    ? parseCanonicalDocument(legacy.description)
    : createParagraphDocument(legacy.description);
  const instructionsDoc = legacy.instructions_format === 'RICH'
    ? parseCanonicalDocument(legacy.instructions)
    : createParagraphDocument(legacy.instructions);

  return {
    ...initialWizardFormData,
    assignment_type: legacy.assignment_type as WizardFormData['assignment_type'],
    title: legacy.title,
    description: serializeCanonicalDocument(descriptionDoc),
    description_format: 'RICH',
    instructions: serializeCanonicalDocument(instructionsDoc),
    instructions_format: 'RICH',
    programming_language: legacy.programming_language,
    starter_code: legacy.starter_code,
    solution_code: legacy.solution_code,
    resources: legacy.resources.map(r => ({ ...r, type: r.type || 'document' })),
    embeds: [],
    due_date: legacy.due_date,
    available_from: legacy.available_from,
    available_until: legacy.available_until,
    allowed_file_types: legacy.allowed_file_types,
    max_files: legacy.max_files,
    max_file_size: legacy.max_file_size,
    allow_late_submission: legacy.allow_late_submission,
    late_penalty_percent: legacy.late_penalty_percent,
    estimated_duration: legacy.estimated_duration,
    tags: legacy.tags,
    prerequisites: legacy.prerequisites,
    max_points: legacy.max_points,
    auto_grading_enabled: legacy.auto_grading_enabled,
    test_cases: legacy.test_cases,
    quiz_questions: [],
    quiz_timer_enabled: false,
    quiz_time_limit: null,
    quiz_attempt_limit_enabled: false,
    quiz_attempts_allowed: null,
    quiz_attempt_score_policy: 'HIGHEST',
    quiz_secure_session_enabled: false,
    quiz_secure_require_fullscreen: true,
    is_published: false,
    is_template: legacy.is_template,
    ai_drafts: [],
  };
}

/**
 * Convert wizard state to backend API payload.
 */
export function wizardDataToApiPayload(
  data: WizardFormData,
  courseId: string,
  moduleId?: string,
): AssignmentRequestPayload {
  const payload: AssignmentRequestPayload = {
    courseId: courseId || undefined,
    moduleId: moduleId || undefined,
    assignmentType: data.assignment_type,
    title: data.title,
    description: data.description,
    descriptionFormat: 'RICH',
    instructions: data.instructions,
    instructionsFormat: 'RICH',
    maxPoints: data.max_points,
    dueDate: data.due_date || null,
    availableFrom: data.available_from || null,
    availableUntil: data.available_until || null,
    starterCode: data.starter_code || null,
    programmingLanguage: data.programming_language || null,
    resources: data.resources.map(r => ({ name: r.name, url: r.url, type: r.type })),
    allowedFileTypes: data.allowed_file_types,
    maxFiles: data.max_files,
    maxFileSize: data.max_file_size,
    testCases: data.test_cases,
    autoGradingEnabled: data.auto_grading_enabled,
    allowLateSubmission: data.allow_late_submission,
    latePenaltyPercent: data.late_penalty_percent,
    tags: data.tags,
    estimatedDuration: data.estimated_duration,
    isTemplate: data.is_template,
    isPublished: data.is_published,
  };

  if (data.assignment_type === 'QUIZ') {
    payload.quiz = {
      title: data.title,
      description: data.description,
      timerEnabled: data.quiz_timer_enabled,
      timeLimit: data.quiz_timer_enabled ? data.quiz_time_limit : null,
      attemptLimitEnabled: data.quiz_attempt_limit_enabled,
      attemptsAllowed: data.quiz_attempt_limit_enabled ? data.quiz_attempts_allowed : null,
      attemptScorePolicy: data.quiz_attempt_score_policy,
      secureSessionEnabled: data.quiz_secure_session_enabled,
      secureRequireFullscreen: data.quiz_secure_require_fullscreen,
      shuffleQuestions: false,
      shuffleAnswers: false,
      showCorrectAnswers: true,
      passPercentage: 60,
      questions: data.quiz_questions.map(toInlineQuizQuestionPayload),
    };
  }

  return payload;
}
