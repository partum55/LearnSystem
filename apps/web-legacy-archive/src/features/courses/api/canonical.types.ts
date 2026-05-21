import type { ListResponse, Uuid } from '@/api/types';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
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

export type LearningItemType = 'pdf' | 'link' | 'video' | 'file' | 'rte' | 'lesson' | string;

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

export type LessonBlockType = 'text' | 'video' | 'inline_quiz_question' | string;

export interface LessonBlockDto {
  id: Uuid;
  type: LessonBlockType;
  order: number;
  title?: string | null;
  content?: string | null;
  contentFormat?: string | null;
  settings: Record<string, unknown>;
}

export interface LessonBlockRequest {
  type: LessonBlockType;
  title?: string;
  content?: string;
  contentFormat?: string;
  order?: number;
  url?: string;
  settings?: Record<string, unknown>;
}

export interface LessonBlockReorderRequest {
  blocks: Array<{ id: Uuid; order: number }>;
}

export interface GradePreviewDto {
  points?: number | null;
  maxPoints?: number | null;
  status?: string | null;
  comment?: string | null;
}

export type AssignmentType =
  | 'file_submission'
  | 'rte_submission'
  | 'quiz'
  | 'form'
  | 'vpl'
  | 'seminar'
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

export type CanonicalListResponse<T> = ListResponse<T>;
