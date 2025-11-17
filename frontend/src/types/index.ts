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

// Course types
export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  owner_id: string;
  owner_name?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  created_at: string;
  updated_at: string;
  member_count?: number;
  progress?: number;
}

export interface CourseCreateData {
  code: string;
  title_uk: string;
  title_en: string;
  description_uk: string;
  description_en: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  start_date?: string;
  end_date?: string;
  max_students?: number;
  is_published?: boolean;
  syllabus?: string;
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
  content_meta?: Record<string, any>;
  resources?: Resource[];
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
  metadata?: Record<string, any>;
  position: number;
  is_downloadable: boolean;
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
}

export interface ResourceCreateData {
  module: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file?: File;
  external_url?: string;
  text_content?: string;
  is_downloadable?: boolean;
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
  assignment_type: AssignmentType;
  title: string;
  description: string;
  instructions?: string;
  due_date?: string;
  available_from?: string;
  available_until?: string;
  max_points: number;
  rubric?: Rubric;
  submission_types?: string[];
  allowed_file_types?: string[];
  max_file_size?: number;
  max_files?: number;
  programming_language?: string;
  starter_code?: string;
  auto_grading_enabled?: boolean;
  test_cases?: any[];
  quiz?: string;
  external_tool_url?: string;
  external_tool_config?: any;
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

export interface Rubric {
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
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
  stem: string;
  options?: string[];
  correct_answer: any;
  points: number;
  metadata?: Record<string, any>;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  time_limit?: number;
  attempts_allowed: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  submitted_at?: string;
  answers: Record<string, any>;
  auto_score?: number;
  final_score?: number;
  graded_by?: string;
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
  payload?: Record<string, any>;
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
  details?: Record<string, any>;
}
