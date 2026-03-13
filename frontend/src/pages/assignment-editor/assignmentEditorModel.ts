export type AssignmentEditorTab = 'basic' | 'content' | 'settings' | 'grading' | 'advanced';

export interface AssignmentFormData {
  title: string;
  description: string;
  description_format: string;
  instructions: string;
  instructions_format: string;
  assignment_type: string;
  max_points: number;
  due_date: string;
  available_from: string;
  available_until: string;
  starter_code: string;
  solution_code: string;
  programming_language: string;
  resources: Array<{ name: string; url: string; type: string }>;
  allowed_file_types: string[];
  max_files: number;
  max_file_size: number;
  test_cases: Array<{ input: string; expected_output: string; points: number }>;
  auto_grading_enabled: boolean;
  allow_late_submission: boolean;
  late_penalty_percent: number;
  tags: string[];
  estimated_duration: number | null;
  prerequisites: string[];
  is_template: boolean;
}

export interface AssignmentRequestPayload {
  courseId?: string;
  moduleId?: string;
  topicId?: string;
  assignmentType: string;
  title: string;
  description: string;
  descriptionFormat: string;
  instructions: string;
  instructionsFormat: string;
  maxPoints: number;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  starterCode: string | null;
  programmingLanguage: string | null;
  resources: Array<{ name: string; url: string; type: string }>;
  allowedFileTypes: string[];
  maxFiles: number;
  maxFileSize: number;
  testCases: Array<{ input: string; expected_output: string; points: number }>;
  autoGradingEnabled: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  tags: string[];
  estimatedDuration: number | null;
  isTemplate: boolean;
  isPublished: boolean;
  quiz?: {
    title?: string;
    description?: string;
    timerEnabled?: boolean;
    timeLimit?: number | null;
    attemptLimitEnabled?: boolean;
    attemptsAllowed?: number | null;
    attemptScorePolicy?: 'HIGHEST' | 'LATEST' | 'FIRST';
    secureSessionEnabled?: boolean;
    secureRequireFullscreen?: boolean;
    shuffleQuestions?: boolean;
    shuffleAnswers?: boolean;
    showCorrectAnswers?: boolean;
    passPercentage?: number;
    questions?: Array<{
      questionType: string;
      stem: string;
      promptDocument?: Record<string, unknown>;
      options?: Record<string, unknown>;
      correctAnswer?: Record<string, unknown>;
      explanation?: string;
      points: number;
      metadata?: Record<string, unknown>;
    }>;
  };
}

export const initialAssignmentFormData: AssignmentFormData = {
  title: '',
  description: '',
  description_format: 'MARKDOWN',
  instructions: '',
  instructions_format: 'MARKDOWN',
  assignment_type: 'FILE_UPLOAD',
  max_points: 100,
  due_date: '',
  available_from: '',
  available_until: '',
  starter_code: '',
  solution_code: '',
  programming_language: 'python',
  resources: [],
  allowed_file_types: ['.pdf', '.docx', '.txt'],
  max_files: 5,
  max_file_size: 10485760,
  test_cases: [],
  auto_grading_enabled: false,
  allow_late_submission: true,
  late_penalty_percent: 10,
  tags: [],
  estimated_duration: null,
  prerequisites: [],
  is_template: false,
};

export const mapAssignmentResponseToFormData = (
  data: Record<string, unknown>,
): AssignmentFormData => ({
  title: String(data.title || ''),
  description: String(data.description || ''),
  description_format: String(data.descriptionFormat || 'MARKDOWN'),
  instructions: String(data.instructions || ''),
  instructions_format: String(data.instructionsFormat || 'MARKDOWN'),
  assignment_type: String(data.assignmentType || 'FILE_UPLOAD'),
  max_points: Number(data.maxPoints || 100),
  due_date: (data.dueDate as string) || '',
  available_from: (data.availableFrom as string) || '',
  available_until: (data.availableUntil as string) || '',
  starter_code: String(data.starterCode || ''),
  solution_code: '',
  programming_language: String(data.programmingLanguage || 'python'),
  resources: (data.resources as Array<{ name: string; url: string; type: string }>) || [],
  allowed_file_types: (data.allowedFileTypes as string[]) || [],
  max_files: Number(data.maxFiles || 5),
  max_file_size: Number(data.maxFileSize || 10485760),
  test_cases: (data.testCases as Array<{ input: string; expected_output: string; points: number }>) || [],
  auto_grading_enabled: Boolean(data.autoGradingEnabled),
  allow_late_submission: Boolean(data.allowLateSubmission),
  late_penalty_percent: Number(data.latePenaltyPercent || 10),
  tags: (data.tags as string[]) || [],
  estimated_duration: (data.estimatedDuration as number | null) || null,
  prerequisites: [],
  is_template: Boolean(data.isTemplate),
});

export const buildAssignmentPayload = (
  formData: AssignmentFormData,
  courseId: string,
): AssignmentRequestPayload => ({
  courseId: courseId || undefined,
  assignmentType: formData.assignment_type,
  title: formData.title,
  description: formData.description,
  descriptionFormat: formData.description_format,
  instructions: formData.instructions,
  instructionsFormat: formData.instructions_format,
  maxPoints: formData.max_points,
  dueDate: formData.due_date || null,
  availableFrom: formData.available_from || null,
  availableUntil: formData.available_until || null,
  starterCode: formData.starter_code || null,
  programmingLanguage: formData.programming_language || null,
  resources: formData.resources,
  allowedFileTypes: formData.allowed_file_types,
  maxFiles: formData.max_files,
  maxFileSize: formData.max_file_size,
  testCases: formData.test_cases,
  autoGradingEnabled: formData.auto_grading_enabled,
  allowLateSubmission: formData.allow_late_submission,
  latePenaltyPercent: formData.late_penalty_percent,
  tags: formData.tags,
  estimatedDuration: formData.estimated_duration,
  isTemplate: formData.is_template,
  isPublished: false,
});
