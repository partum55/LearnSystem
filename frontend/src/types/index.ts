// User types
export type UserRole = 'SUPERADMIN' | 'TEACHER' | 'STUDENT' | 'TA';

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  role: UserRole;
  locale: 'uk' | 'en';
  theme: 'light' | 'dark';
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
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
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
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
  courseId: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInCourse: 'teacher' | 'ta' | 'student';
  addedBy: string;
  addedAt: string;
}

// Module and Resource types
export interface Topic {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  course: string;
  title: string;
  description?: string;
  position: number;
  isPublished: boolean;
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
  resourcesCount?: number;
  contentMeta?: Record<string, unknown>;
  resources?: Resource[];
  assignments?: Assignment[];
  topics?: Topic[];
}

export interface ModulePage {
  id: string;
  moduleId: string;
  parentPageId?: string;
  title: string;
  slug: string;
  position: number;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
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
  ownerId: string;
  schemaVersion: number;
  documentHash?: string;
  document: CanonicalDocument;
  updatedAt?: string;
  publishedSnapshot?: boolean;
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
  topicId?: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  file?: string;
  fileUrl?: string;
  fileSize?: number;
  externalUrl?: string;
  textContent?: string;
  storagePath?: string;
  metadata?: Record<string, unknown>;
  position: number;
  isDownloadable: boolean;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string;
  uploadedByName?: string;
}

export interface ResourceCreateData {
  courseId: string;
  module: string;
  topicId?: string;
  title: string;
  description?: string;
  resourceType: ResourceType;
  file?: File;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  externalUrl?: string;
  textContent?: string;
  isDownloadable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Announcement {
  id: string;
  courseId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// VPL types
export interface VplConfig {
  mode: 'io' | 'framework';
  language: 'python' | 'java' | 'javascript' | 'cpp';
  timeLimitSeconds: number;
  memoryLimitMb: number;
  pylintEnabled: boolean;
  pylintMinScore: number;
  scoringMode: 'weighted' | 'all_or_nothing';
  maxSubmitAttempts: number;
}

export interface VplTestCase {
  id: string;
  assignmentId: string;
  name: string;
  input?: string;
  expectedOutput?: string;
  checkMode: 'EXACT' | 'TRIM' | 'CONTAINS' | 'REGEX';
  testCode?: string;
  hidden: boolean;
  required: boolean;
  weight: number;
  position: number;
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
  | 'VIRTUAL_LAB'
  | 'SEMINAR';

export interface Assignment {
  id: string;
  courseId: string;
  moduleId?: string;
  topicId?: string;
  categoryId?: string;
  assignmentType: AssignmentType;
  title: string;
  description: string;
  descriptionFormat?: string;
  instructions?: string;
  instructionsFormat?: string;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  maxPoints: number;
  submissionTypes?: string[];
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  programmingLanguage?: string;
  starterCode?: string;
  autoGradingEnabled?: boolean;
  vplConfig?: VplConfig;
  testCases?: { input: string; output: string;[key: string]: unknown }[];
  quiz?: string;
  externalToolUrl?: string;
  externalToolConfig?: Record<string, unknown>;
  gradeAnonymously?: boolean;
  peerReviewEnabled?: boolean;
  peerReviewsRequired?: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  submission?: Submission;
  requiresSubmission?: boolean;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  files?: string[];
  textAnswer?: string;
  grade?: number;
  graderId?: string;
  gradedAt?: string;
  feedback?: string;
  submittedAt: string;
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
  courseId: string;
  type: QuestionType;
  topic?: string;
  difficulty?: string;
  tags?: string[];
  stem: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer: string | number | boolean | string[] | number[];
  points: number;
  metadata?: Record<string, unknown>;
  latestVersion?: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description?: string;
  timeLimit?: number;
  timerEnabled?: boolean;
  attemptsAllowed: number | null;
  attemptLimitEnabled?: boolean;
  attemptScorePolicy?: 'HIGHEST' | 'LATEST' | 'FIRST';
  secureSessionEnabled?: boolean;
  secureRequireFullscreen?: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  questions: Question[];
  sections?: QuizSection[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizSectionRule {
  id?: string;
  questionType?: string;
  difficulty?: string;
  tag?: string;
  quota: number;
}

export interface QuizSection {
  id?: string;
  quizId?: string;
  title: string;
  position: number;
  questionCount: number;
  rules: QuizSectionRule[];
}

export interface QuizAttemptQuestion {
  id: string;
  attemptId: string;
  questionId: string;
  questionVersionId?: string;
  position: number;
  points: number;
  promptSnapshot: Record<string, unknown>;
  payloadSnapshot: Record<string, unknown>;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, unknown>;
  autoScore?: number;
  finalScore?: number;
  gradedBy?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  timedOut?: boolean;
  proctoringData?: Record<string, unknown>;
}

// Gradebook types
export interface GradeEntry {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  aggregatedScore: number;
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
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Analytics types
export interface CourseAnalytics {
  courseId: string;
  totalStudents: number;
  activeStudents: number;
  averageGrade: number;
  completionRate: number;
  engagementStats: EngagementStats;
}

export interface EngagementStats {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  avgTimeSpent: number;
}

// Plugin types
export type PluginType = 'ACTIVITY' | 'REPORT' | 'BLOCK' | 'INTEGRATION' | 'THEME';
export type PluginStatus = 'ENABLED' | 'DISABLED' | 'ERROR';

export interface InstalledPlugin {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  status: PluginStatus;
  permissions: string[];
  config: Record<string, string>;
  installedAt: string;
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
