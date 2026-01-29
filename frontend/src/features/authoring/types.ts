export type TaskType = 'ASSIGNMENT' | 'QUIZ' | 'QUESTION_BANK' | 'LESSON_TASK' | 'AI_TASK';

export type LatexFormat = 'MARKDOWN' | 'LATEX' | 'HTML';

export interface TaskMetadata {
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  format: LatexFormat;
}

export interface TaskSettings {
  timeLimitMinutes?: number;
  attemptsAllowed?: number;
  gradingMode: 'AUTO' | 'MANUAL' | 'HYBRID';
  draftState: 'DRAFT' | 'PUBLISHED';
  allowLateSubmission?: boolean;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  weight: number;
  explanation: string;
  format: LatexFormat;
}

export interface RubricDraft {
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  format: LatexFormat;
}

export interface QuestionDraft {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'OPEN_TEXT' | 'LATEX';
  prompt: string;
  explanation: string;
  points: number;
  format: LatexFormat;
  options: QuestionOption[];
  correctAnswer?: string;
}

export interface TaskDraft {
  id?: string;
  type: TaskType;
  metadata: TaskMetadata;
  settings: TaskSettings;
  rubric: RubricDraft;
  questions: QuestionDraft[];
  aiDrafts: AIDraft[];
  updatedAt?: string;
}

export interface AIDraft {
  id: string;
  summary: string;
  content: string;
  format: LatexFormat;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface PreviewPayload {
  content: string;
  format: LatexFormat;
  metadata?: Record<string, string | number | boolean>;
}

export interface AuthoringResponse<T> {
  data: T;
  warnings?: string[];
}

export interface AuthoringEndpoints {
  createTask: string;
  updateTask: (id: string) => string;
  validateTask: string;
  previewTask: string;
}
