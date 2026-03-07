// User types
export type UserRole = 'SUPERADMIN' | 'TEACHER' | 'STUDENT' | 'TA';

export interface User {
  id: string;
  email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  role: UserRole;
  locale: 'uk' | 'en';
  theme: 'light' | 'dark';
  avatar?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// API Key types
export interface ApiKeyDto {
  id: string;
  provider: string;
  keyHint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Course types
export interface Course {
  id: string;
  code: string;
  // Multilingual fields from backend
  titleUk?: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  // Computed/display fields
  title: string;
  description: string;
  syllabus?: string;
  ownerId?: string;
  ownerName?: string;
  thumbnailUrl?: string;
  themeColor?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  academicYear?: string | null;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  moduleCount?: number;
  isPublished?: boolean;
  progress?: number;
  start_date?: string;
  end_date?: string;
  max_students?: number;
}

export interface CourseCreateData {
  code: string;
  titleUk: string;
  titleEn: string;
  descriptionUk: string;
  descriptionEn: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  isPublished?: boolean;
  syllabus?: string;
  thumbnailUrl?: string;
  themeColor?: string;
}

export interface CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role_in_course: 'teacher' | 'ta' | 'student';
  added_by: string;
  added_at: string;
}

// Module and Resource types
export interface Module {
  id: string;
  course: string;
  title: string;
  description?: string;
  position: number;
  is_published: boolean;
  publish_date?: string;
  created_at: string;
  updated_at: string;
  resources_count?: number;
  content_meta?: Record<string, unknown>;
  resources?: Resource[];
  assignments?: Assignment[];
}

export interface ModulePage {
  id: string;
  module_id: string;
  parent_page_id?: string;
  title: string;
  slug: string;
  position: number;
  is_published: boolean;
  has_unpublished_changes: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface CanonicalMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface CanonicalNode {
  id?: string;
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: CanonicalMark[];
  content?: CanonicalNode[];
}

export interface CanonicalDocument {
  version: number;
  type: 'doc';
  meta?: Record<string, unknown>;
  content: CanonicalNode[];
}

export interface CanonicalDocumentPayload {
  owner_id: string;
  schema_version: number;
  document_hash?: string;
  document: CanonicalDocument;
  updated_at?: string;
  published_snapshot?: boolean;
}

export interface TocItem {
  level: number;
  text: string;
  anchor: string;
}

export type ResourceType = 'VIDEO' | 'PDF' | 'SLIDE' | 'LINK' | 'TEXT' | 'CODE' | 'OTHER';

export interface Resource {
  id: string;
  module: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file?: string;
  file_url?: string;
  file_size?: number;
  external_url?: string;
  text_content?: string;
  storage_path?: string;
  metadata?: Record<string, unknown>;
  position: number;
  is_downloadable: boolean;
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
}

export interface ResourceCreateData {
  courseId: string;
  module: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file?: File;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  external_url?: string;
  text_content?: string;
  is_downloadable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Announcement {
  id: string;
  course_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Assignment types
export type AssignmentType =
  | 'QUIZ'
  | 'FILE_UPLOAD'
  | 'TEXT'
  | 'CODE'
  | 'URL'
  | 'MANUAL_GRADE'
  | 'EXTERNAL'
  | 'VIRTUAL_LAB';

export interface Assignment {
  id: string;
  course_id: string;
  module_id?: string;
  assignment_type: AssignmentType;
  title: string;
  description: string;
  description_format?: string;
  instructions?: string;
  instructions_format?: string;
  due_date?: string;
  available_from?: string;
  available_until?: string;
  max_points: number;
  submission_types?: string[];
  allowed_file_types?: string[];
  max_file_size?: number;
  max_files?: number;
  programming_language?: string;
  starter_code?: string;
  auto_grading_enabled?: boolean;
  test_cases?: { input: string; output: string;[key: string]: unknown }[];
  quiz?: string;
  external_tool_url?: string;
  external_tool_config?: Record<string, unknown>;
  grade_anonymously?: boolean;
  peer_review_enabled?: boolean;
  peer_reviews_required?: number;
  allow_late_submission?: boolean;
  late_penalty_percent?: number;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  created_by_name?: string;
  submission?: Submission;
  requires_submission?: boolean;
}

export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  files?: string[];
  text_answer?: string;
  grade?: number;
  grader_id?: string;
  graded_at?: string;
  feedback?: string;
  submitted_at: string;
}

// Quiz types
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'numerical'
  | 'formula'
  | 'short_answer';

export interface Question {
  id: string;
  course_id: string;
  type: QuestionType;
  topic?: string;
  difficulty?: string;
  tags?: string[];
  stem: string;
  image_url?: string;
  options?: string[];
  correct_answer: string | number | boolean | string[] | number[];
  points: number;
  metadata?: Record<string, unknown>;
  latest_version?: number;
}

export interface Quiz {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  description?: string;
  time_limit?: number;
  timer_enabled?: boolean;
  attempts_allowed: number | null;
  attempt_limit_enabled?: boolean;
  attempt_score_policy?: 'HIGHEST' | 'LATEST' | 'FIRST';
  secure_session_enabled?: boolean;
  secure_require_fullscreen?: boolean;
  randomize_questions: boolean;
  randomize_answers: boolean;
  questions: Question[];
  sections?: QuizSection[];
  created_at: string;
  updated_at: string;
}

export interface QuizSectionRule {
  id?: string;
  question_type?: string;
  difficulty?: string;
  tag?: string;
  quota: number;
}

export interface QuizSection {
  id?: string;
  quiz_id?: string;
  title: string;
  position: number;
  question_count: number;
  rules: QuizSectionRule[];
}

export interface QuizAttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string;
  question_version_id?: string;
  position: number;
  points: number;
  prompt_snapshot: Record<string, unknown>;
  payload_snapshot: Record<string, unknown>;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  answers: Record<string, unknown>;
  auto_score?: number;
  final_score?: number;
  graded_by?: string;
  expires_at?: string;
  remaining_seconds?: number;
  timed_out?: boolean;
  proctoring_data?: Record<string, unknown>;
}

// Gradebook types
export interface GradeEntry {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  aggregated_score: number;
  breakdown: GradeBreakdown;
}

export interface GradeBreakdown {
  assignments: { [key: string]: number };
  quizzes: { [key: string]: number };
}

// Notification types
export type NotificationType =
  | 'assignment_due'
  | 'grade_posted'
  | 'announcement'
  | 'course_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Analytics types
export interface CourseAnalytics {
  course_id: string;
  total_students: number;
  active_students: number;
  average_grade: number;
  completion_rate: number;
  engagement_stats: EngagementStats;
}

export interface EngagementStats {
  daily_active_users: number;
  weekly_active_users: number;
  avg_time_spent: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, unknown>;
}
