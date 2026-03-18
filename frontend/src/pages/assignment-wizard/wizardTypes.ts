import { AssignmentType } from '../../types';
import { QuestionDraft, AIDraft } from '../../features/authoring/types';

export type WizardStep = 'type' | 'content' | 'resources' | 'settings' | 'grading' | 'review';

export const WIZARD_STEPS: WizardStep[] = ['type', 'content', 'resources', 'settings', 'grading', 'review'];

export interface WizardResource {
  id?: string;
  name: string;
  url: string;
  type: string;
  file?: File;
  resource_id?: string;
}

export interface EmbedResource {
  provider: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
}

export interface WizardFormData {
  // Type step
  assignment_type: AssignmentType;

  // Content step
  title: string;
  description: string;
  description_format: string;
  instructions: string;
  instructions_format: string;
  programming_language: string;
  starter_code: string;
  solution_code: string;

  // Resources step
  resources: WizardResource[];
  embeds: EmbedResource[];

  // Settings step
  due_date: string;
  available_from: string;
  available_until: string;
  allowed_file_types: string[];
  max_files: number;
  max_file_size: number;
  allow_late_submission: boolean;
  late_penalty_percent: number;
  estimated_duration: number | null;
  tags: string[];
  prerequisites: string[];

  // Grading step
  max_points: number;
  auto_grading_enabled: boolean;
  test_cases: Array<{ input: string; expected_output: string; points: number }>;
  quiz_questions: QuestionDraft[];
  quiz_timer_enabled: boolean;
  quiz_time_limit: number | null;
  quiz_attempt_limit_enabled: boolean;
  quiz_attempts_allowed: number | null;
  quiz_attempt_score_policy: 'HIGHEST' | 'LATEST' | 'FIRST';
  quiz_secure_session_enabled: boolean;
  quiz_secure_require_fullscreen: boolean;

  // Review / meta
  is_published: boolean;
  is_template: boolean;
  ai_drafts: AIDraft[];
}

export const initialWizardFormData: WizardFormData = {
  assignment_type: 'FILE_UPLOAD',
  title: '',
  description: '',
  description_format: 'RICH',
  instructions: '',
  instructions_format: 'RICH',
  programming_language: 'python',
  starter_code: '',
  solution_code: '',
  resources: [],
  embeds: [],
  due_date: '',
  available_from: '',
  available_until: '',
  allowed_file_types: ['.pdf', '.docx', '.txt'],
  max_files: 5,
  max_file_size: 10485760,
  allow_late_submission: true,
  late_penalty_percent: 10,
  estimated_duration: null,
  tags: [],
  prerequisites: [],
  max_points: 100,
  auto_grading_enabled: false,
  test_cases: [],
  quiz_questions: [],
  quiz_timer_enabled: false,
  quiz_time_limit: null,
  quiz_attempt_limit_enabled: false,
  quiz_attempts_allowed: null,
  quiz_attempt_score_policy: 'HIGHEST',
  quiz_secure_session_enabled: false,
  quiz_secure_require_fullscreen: true,
  is_published: false,
  is_template: false,
  ai_drafts: [],
};

export interface WizardStepValidation {
  canProceed: boolean;
  errors: Record<string, string>;
}
