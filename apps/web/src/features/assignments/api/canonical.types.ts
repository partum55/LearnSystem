import type { ListResponse, Uuid } from '@/api/types';
import type { AssignmentType, GradePreviewDto } from '@/features/courses/api/canonical.types';

export interface FileAssignmentSettings {
  type?: 'FILE_SUBMISSION';
  schemaVersion?: number;
  allowedFileTypes?: string[];
  maxFiles?: number;
  maxFileSizeMb?: number;
  allowEditAfterSubmit?: boolean;
  allowDeleteAfterSubmit?: boolean;
  allowResubmission?: boolean;
}

export interface RteAssignmentSettings {
  type?: 'TEXT_SUBMISSION';
  schemaVersion?: number;
  minWords?: number;
  maxWords?: number;
  allowEditAfterSubmit?: boolean;
  allowResubmission?: boolean;
}

export interface FormAssignmentSettings {
  type?: 'FORM';
  schemaVersion?: number;
  fields?: Array<Record<string, unknown>>;
  allowEditAfterSubmit?: boolean;
  allowResubmission?: boolean;
}

export interface QuizAssignmentSettings {
  type?: 'QUIZ';
  schemaVersion?: number;
  attemptLimit?: number;
  timeLimitMinutes?: number;
  canReviewAttempts?: boolean;
  showCorrectAnswers?: boolean;
  showScoreAfterSubmit?: boolean;
  shuffleQuestions?: boolean;
  gradingMode?: string;
}

export interface VplAssignmentSettings {
  type?: 'VPL';
  schemaVersion?: number;
  language?: string;
  runtime?: string;
  templateCode?: string;
  visibleTests?: Array<Record<string, unknown>>;
  hiddenTestsReference?: string;
  timeLimit?: number;
  memoryLimit?: number;
  gradingMode?: string;
}

export interface SeminarAssignmentSettings {
  type?: 'SEMINAR';
  schemaVersion?: number;
  requiresSubmission?: boolean;
  manualGradeOnly?: boolean;
}


export type AssignmentSettings =
  | FileAssignmentSettings
  | RteAssignmentSettings
  | FormAssignmentSettings
  | QuizAssignmentSettings
  | VplAssignmentSettings
  | SeminarAssignmentSettings
  | Record<string, unknown>;

export interface StudentAssignmentStateDto {
  status: string;
  submissionId?: Uuid | null;
  latestAttemptId?: Uuid | null;
  submittedAt?: string | null;
  grade?: GradePreviewDto | null;
  canSubmit: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canResubmit: boolean;
  canStartNewAttempt: boolean;
  attemptsUsed?: number | null;
  attemptLimit?: number | null;
}

export interface AssignmentDetailDto {
  id: Uuid;
  courseId: Uuid;
  moduleId: Uuid;
  type: AssignmentType;
  title: string;
  instructionsJson?: Record<string, unknown> | null;
  maxPoints: number;
  dueDate?: string | null;
  visibilityStatus: string;
  settings: AssignmentSettings;
  studentState?: StudentAssignmentStateDto | null;
}

export interface AssignmentRequest {
  type: AssignmentType;
  title: string;
  instructionsJson?: Record<string, unknown>;
  maxPoints: number;
  order?: number;
  dueDate?: string | null;
  visible?: boolean;
  fileSettings?: FileAssignmentSettings;
  rteSettings?: RteAssignmentSettings;
  formSettings?: FormAssignmentSettings;
  quizSettings?: QuizAssignmentSettings;
  vplSettings?: VplAssignmentSettings;
  seminarSettings?: SeminarAssignmentSettings;
}

export interface SubmissionFileItem {
  fileName: string;
  fileUrl: string;
  contentType?: string;
  fileSize?: number;
  fileKey?: string;
}

export interface SubmissionRequest {
  text?: string;
  url?: string;
  programmingLanguage?: string;
  code?: string;
  executionResultReference?: string;
  files?: SubmissionFileItem[];
  answers?: Record<string, unknown>;
}

export interface SubmissionDto {
  id: Uuid;
  assignmentId: Uuid;
  studentId: Uuid;
  status: string;
  submittedAt?: string | null;
  version: number;
}

export interface SubmissionReviewDto {
  submissionId: Uuid;
  student: {
    id: Uuid;
    name?: string | null;
    email?: string | null;
  };
  assignment: AssignmentDetailDto;
  content: Record<string, unknown>;
  gradeDraft?: GradePreviewDto | null;
  publishedGrade?: GradePreviewDto | null;
  navigation: Record<string, Uuid>;
}

export interface GradeDraftRequest {
  points: number;
  comment?: string;
}

export type SubmissionListResponse = ListResponse<SubmissionDto>;

export interface SeminarAttendanceSessionDto {
  id: Uuid;
  assignmentId: Uuid;
  createdBy: Uuid;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  startsAt: string;
  expiresAt: string;
  closedAt?: string | null;
  rawToken?: string | null;
}

export interface SeminarAttendanceRecordDto {
  id: Uuid;
  sessionId: Uuid;
  assignmentId: Uuid;
  studentId: Uuid;
  studentName: string;
  studentEmail: string;
  status: 'PRESENT';
  method: 'QR';
  checkedInAt: string;
}

export interface SeminarAttendanceOverviewDto {
  activeSession?: SeminarAttendanceSessionDto | null;
  checkedInCount: number;
  records: SeminarAttendanceRecordDto[];
}
