import type { ListResponse, Uuid } from '@/api/types';
import type { CourseRole, PageResponse } from '@/features/users/api/users.types';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
export type CourseVisibility = 'PUBLIC' | 'PRIVATE' | 'DRAFT' | string;
export type VisibilityStatus = 'VISIBLE' | 'HIDDEN' | 'ARCHIVED' | 'LOCKED' | string;

export interface UpcomingDeadlineDto {
  assignmentId: Uuid;
  courseId: Uuid;
  courseTitle: string;
  title: string;
  type: AssignmentType | string;
  dueDate: string | null;
}

export interface CourseSummaryDto {
  id: Uuid;
  title: string;
  description?: string | null;
  status: CourseStatus;
  teacherName?: string | null;
  progress: number;
  grade?: number | null;
}

export interface StudentDashboardDto {
  activeCourseCount: number;
  upcomingDeadlineCount: number;
  pendingSubmissionCount: number;
  activeCourses: CourseSummaryDto[];
  upcomingDeadlines: UpcomingDeadlineDto[];
}

export interface CourseOverviewDto {
  id: Uuid;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  progress: number;
  grade?: number | null;
  upcomingDeadlines: UpcomingDeadlineDto[];
  recentFeedback: string[];
}

export interface AdminCourseDto {
  id: Uuid;
  code: string;
  titleUk: string;
  titleEn?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  ownerId: Uuid;
  status: CourseStatus;
  isPublished: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CourseSettingsDto {
  id: Uuid;
  code: string;
  titleUk: string;
  titleEn?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  syllabus?: string | null;
  visibility: CourseVisibility;
  status: CourseStatus;
  ownerId: Uuid;
  updatedAt?: string | null;
}

export interface UpdateCourseSettingsRequest {
  code: string;
  titleUk: string;
  titleEn?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  syllabus?: string | null;
  visibility?: CourseVisibility;
  status?: CourseStatus;
}

export type LearningItemType = 'PDF' | 'LINK' | 'VIDEO' | 'FILE' | 'RTE' | 'LESSON' | string;

export interface LearningItemDto {
  id: Uuid;
  moduleId: Uuid;
  type: LearningItemType;
  title: string;
  description?: string | null;
  order: number;
  visibilityStatus: VisibilityStatus;
  settings: Record<string, unknown>;
}

export interface LearningItemRequest {
  type: LearningItemType;
  title: string;
  description?: string;
  order?: number;
  url?: string;
  textContent?: string;
  downloadable?: boolean;
  visible?: boolean;
  settings?: Record<string, unknown>;
}

export type LessonPageType = 'TEXT' | 'VIDEO' | 'CODE' | 'MERMAID' | 'MATH' | 'INLINE_QUIZ_QUESTION' | string;

export interface LessonPageDto {
  id: Uuid;
  type: LessonPageType;
  order: number;
  title?: string | null;
  content?: string | null;
  contentFormat?: string | null;
  settings: Record<string, unknown>;
}

export interface LessonPageRequest {
  type: LessonPageType;
  title?: string;
  content?: string;
  contentFormat?: string;
  order?: number;
  url?: string;
  settings?: Record<string, unknown>;
}

export interface LessonPageReorderRequest {
  pages: Array<{ id: Uuid; order: number }>;
}

export interface GradePreviewDto {
  points?: number | null;
  maxPoints?: number | null;
  status?: string | null;
  comment?: string | null;
}

export type AssignmentType =
  | 'FILE_SUBMISSION'
  | 'TEXT_SUBMISSION'
  | 'QUIZ'
  | 'FORM'
  | 'VPL'
  | 'SEMINAR'
  | string;

export interface AssignmentListItemDto {
  id: Uuid;
  moduleId: Uuid;
  title: string;
  type: AssignmentType;
  order: number;
  maxPoints: number;
  dueDate?: string | null;
  status: string;
  grade?: GradePreviewDto | null;
}

export interface CourseModuleDto {
  id: Uuid;
  title: string;
  description?: string | null;
  order: number;
  availabilityStatus: VisibilityStatus;
  learningItems: LearningItemDto[];
  assignments: AssignmentListItemDto[];
}

export interface CourseModulesResponse {
  items: CourseModuleDto[];
}

export interface ModuleRequest {
  title: string;
  description?: string;
  order?: number;
  visible?: boolean;
}

export interface CourseMemberDto {
  id: Uuid;
  courseId: Uuid;
  userId: Uuid;
  userName?: string | null;
  userEmail?: string | null;
  roleInCourse: CourseRole;
  enrollmentStatus: 'active' | 'dropped' | 'completed' | string;
  addedAt?: string | null;
  updatedAt?: string | null;
  finalGrade?: number | null;
}

export interface CourseMemberRequest {
  userId: Uuid;
  roleInCourse: CourseRole;
}

export interface CreateCourseRequest {
  code: string;
  titleUk: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  syllabus?: string;
  isPublished?: boolean;
  maxStudents?: number;
}

export type CourseMembersResponse = PageResponse<CourseMemberDto>;

export type CanonicalListResponse<T> = ListResponse<T>;

export interface EnrollmentGroupDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface EnrollmentGroupMemberDto {
  id: string;
  groupId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  createdAt: string;
}

export interface BulkPreviewRow {
  email: string;
  role: string;
}

export interface BulkPreviewResult {
  email: string;
  userId?: string | null;
  userName?: string | null;
  role: string;
  status: 'VALID' | 'INVALID';
  reason?: 'NOT_FOUND' | 'DUPLICATE_IN_CSV' | 'ALREADY_ENROLLED' | 'OWNER_NOT_ALLOWED' | 'ROLE_CONFLICT' | null;
}

export interface BulkPreviewResponse {
  validRows: BulkPreviewResult[];
  invalidRows: BulkPreviewResult[];
  hasErrors: boolean;
}

export interface BulkConfirmEnrollment {
  userId: string;
  role: string;
}
