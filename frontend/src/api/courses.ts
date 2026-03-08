import apiClient from './client';
import { AxiosProgressEvent } from 'axios';
import {
  Assignment,
  Announcement,
  Course,
  CourseCreateData,
  Module,
  Resource,
  ResourceCreateData,
} from '../types';
import { PageResponse } from './types';

export interface CoursePublishChecklistItem {
  key: string;
  label: string;
  required: boolean;
  passed: boolean;
  details?: string;
}

export interface CoursePublishChecklist {
  courseId: string;
  readyToPublish: boolean;
  items: CoursePublishChecklistItem[];
}

export interface CourseSyllabusResponse {
  courseId: string;
  syllabus: string | null;
  updatedAt?: string;
}

export interface CloneCourseStructureRequest {
  code: string;
  titleUk?: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  syllabus?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  thumbnailUrl?: string;
  themeColor?: string;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  maxStudents?: number;
  isPublished?: boolean;
  copyScheduleDates?: boolean;
}

export interface CloneCourseStructureResult {
  sourceCourseId: string;
  courseId: string;
  modulesCopied: number;
  resourcesCopied: number;
  assignmentsCopied: number;
  quizzesCopied: number;
}

export interface CoursePreviewModule {
  moduleId: string;
  title: string;
  description?: string;
  position?: number;
  resourceTitles: string[];
  assignmentTitles: string[];
}

export interface CoursePreviewResponse {
  courseId: string;
  code: string;
  titleUk?: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  syllabus?: string;
  ownerId?: string;
  ownerName?: string;
  thumbnailUrl?: string;
  themeColor?: string;
  academicYear?: string;
  moduleCount: number;
  assignmentCount: number;
  modules: CoursePreviewModule[];
}

export interface TeacherTodoSubmissionItem {
  submissionId: string;
  assignmentId: string;
  courseId: string;
  courseCode: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  submittedAt?: string;
  dueDate?: string;
}

export interface TeacherTodoMissingItem {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  daysOverdue: number;
  dueDate?: string;
}

export interface TeacherTodoDeadlineItem {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  assignmentTitle: string;
  submittedCount: number;
  expectedStudentCount: number;
  dueDate?: string;
}

export interface TeacherTodoDashboardResponse {
  userId: string;
  generatedAt?: string;
  pendingGradingCount: number;
  missingSubmissionCount: number;
  upcomingDeadlineCount: number;
  pendingGrading: TeacherTodoSubmissionItem[];
  missingSubmissions: TeacherTodoMissingItem[];
  upcomingDeadlines: TeacherTodoDeadlineItem[];
}

export interface StudentContextReminderItem {
  assignmentId: string;
  courseId: string;
  courseCode: string;
  assignmentTitle: string;
  severity: 'OVERDUE' | 'TODAY' | 'SOON' | string;
  recommendation: string;
  started: boolean;
  submitted: boolean;
  estimatedHours: number;
  dueDate?: string;
}

export interface StudentContextReminderFeedResponse {
  userId: string;
  generatedAt?: string;
  reminders: StudentContextReminderItem[];
}

export interface CourseArchiveResource {
  resourceId: string;
  title: string;
  description?: string;
  resourceType: string;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  mimeType?: string;
  position?: number;
  isDownloadable?: boolean;
  textContent?: string;
  metadata?: Record<string, unknown>;
}

export interface CourseArchivePage {
  pageId: string;
  parentPageId?: string;
  title: string;
  slug: string;
  position?: number;
  schemaVersion?: number;
  publishedAt?: string;
  publishedBy?: string;
  document: Record<string, unknown>;
}

export interface CourseArchiveModule {
  moduleId: string;
  title: string;
  description?: string;
  position?: number;
  contentMeta?: Record<string, unknown>;
  resources: CourseArchiveResource[];
  pages: CourseArchivePage[];
}

export interface CourseArchiveAssignment {
  assignmentId: string;
  moduleId?: string;
  position?: number;
  assignmentType: string;
  title: string;
  description: string;
  descriptionFormat?: string;
  instructions?: string;
  instructionsFormat?: string;
  maxPoints?: string;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: string;
  submissionTypes?: string[];
  allowedFileTypes?: string[];
}

export interface CourseArchivePayload {
  capturedAt?: string;
  course: {
    id: string;
    code: string;
    titleUk?: string;
    titleEn?: string;
    descriptionUk?: string;
    descriptionEn?: string;
    syllabus?: string;
    academicYear?: string;
    thumbnailUrl?: string;
    themeColor?: string;
  };
  modules: CourseArchiveModule[];
  assignments: CourseArchiveAssignment[];
}

export interface CourseArchiveSnapshotResponse {
  snapshotId: string;
  courseId: string;
  version: number;
  createdBy: string;
  createdAt: string;
  payload: CourseArchivePayload;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Normalizes a raw module object from the backend (camelCase) to the frontend Module type (snake_case).
 */
const normalizeModule = (raw: any): Module => ({
  id: String(raw.id ?? ''),
  course: String(raw.courseId ?? raw.course ?? ''),
  title: String(raw.title ?? ''),
  description: raw.description ?? undefined,
  position: Number(raw.position ?? 0),
  is_published: Boolean(raw.isPublished ?? raw.is_published ?? false),
  publish_date: raw.publishDate ?? raw.publish_date ?? undefined,
  created_at: raw.createdAt ?? raw.created_at ?? '',
  updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  resources_count: raw.resourceCount ?? raw.resources_count ?? undefined,
  content_meta: raw.contentMeta ?? raw.content_meta ?? undefined,
  resources: Array.isArray(raw.resources) ? raw.resources.map(normalizeResource) : undefined,
  assignments: Array.isArray(raw.assignments) ? raw.assignments.map(normalizeAssignment) : undefined,
});

/**
 * Normalizes a raw resource object from the backend (camelCase) to the frontend Resource type (snake_case).
 */
const normalizeResource = (raw: any): Resource => ({
  id: String(raw.id ?? ''),
  module: String(raw.moduleId ?? raw.module ?? ''),
  title: String(raw.title ?? ''),
  description: raw.description ?? undefined,
  resource_type: String(raw.resourceType ?? raw.resource_type ?? 'OTHER') as Resource['resource_type'],
  file_url: raw.fileUrl ?? raw.file_url ?? undefined,
  file_size: raw.fileSize ?? raw.file_size ?? undefined,
  external_url: raw.externalUrl ?? raw.external_url ?? undefined,
  text_content: raw.textContent ?? raw.text_content ?? undefined,
  storage_path: raw.storagePath ?? raw.storage_path ?? undefined,
  metadata: raw.metadata ?? undefined,
  position: Number(raw.position ?? 0),
  is_downloadable: Boolean(raw.isDownloadable ?? raw.is_downloadable ?? true),
  created_at: raw.createdAt ?? raw.created_at ?? '',
  updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  uploaded_by: raw.uploadedBy ?? raw.uploaded_by ?? undefined,
  uploaded_by_name: raw.uploadedByName ?? raw.uploaded_by_name ?? undefined,
});

const normalizeAnnouncement = (raw: any): Announcement => ({
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? raw.course ?? ''),
  title: String(raw.title ?? ''),
  content: String(raw.content ?? ''),
  is_pinned: Boolean(raw.isPinned ?? raw.is_pinned ?? false),
  created_by: String(raw.createdBy ?? raw.created_by ?? ''),
  updated_by: raw.updatedBy ?? raw.updated_by ?? undefined,
  created_at: raw.createdAt ?? raw.created_at ?? '',
  updated_at: raw.updatedAt ?? raw.updated_at ?? '',
});

const normalizeCourse = (raw: any): Course => {
  const titleUk = raw.titleUk ?? raw.title_uk ?? undefined;
  const titleEn = raw.titleEn ?? raw.title_en ?? undefined;
  const descriptionUk = raw.descriptionUk ?? raw.description_uk ?? undefined;
  const descriptionEn = raw.descriptionEn ?? raw.description_en ?? undefined;
  const visibility = String(raw.visibility ?? 'DRAFT').toUpperCase();

  return {
    ...raw,
    id: String(raw.id ?? ''),
    code: String(raw.code ?? ''),
    titleUk: titleUk ? String(titleUk) : undefined,
    titleEn: titleEn ? String(titleEn) : undefined,
    descriptionUk: descriptionUk ? String(descriptionUk) : undefined,
    descriptionEn: descriptionEn ? String(descriptionEn) : undefined,
    title: String(raw.title ?? titleUk ?? titleEn ?? ''),
    description: String(raw.description ?? descriptionUk ?? descriptionEn ?? ''),
    syllabus: raw.syllabus == null ? undefined : String(raw.syllabus),
    ownerId: raw.ownerId ? String(raw.ownerId) : (raw.owner_id ? String(raw.owner_id) : undefined),
    ownerName: raw.ownerName ?? raw.owner_name ?? undefined,
    thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail_url ?? undefined,
    themeColor: raw.themeColor ?? raw.theme_color ?? undefined,
    visibility: (visibility === 'PUBLIC' || visibility === 'PRIVATE' || visibility === 'DRAFT'
      ? visibility
      : 'DRAFT') as Course['visibility'],
    status: raw.status ? String(raw.status).toUpperCase() : undefined,
    academicYear: raw.academicYear ?? raw.academic_year ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    memberCount: raw.memberCount ?? raw.member_count ?? undefined,
    moduleCount: raw.moduleCount ?? raw.module_count ?? undefined,
    isPublished: raw.isPublished ?? raw.is_published ?? undefined,
    start_date: raw.startDate ?? raw.start_date ?? undefined,
    end_date: raw.endDate ?? raw.end_date ?? undefined,
    max_students: raw.maxStudents ?? raw.max_students ?? undefined,
  };
};

/**
 * Minimal assignment normalizer for assignments embedded in module responses.
 * Full normalization happens in assessments.ts for standalone assignment fetches.
 */
const normalizeAssignment = (raw: any): Assignment => ({
  ...raw,
  id: String(raw.id ?? ''),
  course_id: String(raw.courseId ?? raw.course_id ?? ''),
  assignment_type: String(raw.assignmentType ?? raw.assignment_type ?? 'FILE_UPLOAD') as Assignment['assignment_type'],
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  due_date: raw.dueDate ?? raw.due_date ?? undefined,
  max_points: Number(raw.maxPoints ?? raw.max_points ?? 100),
  is_published: Boolean(raw.isPublished ?? raw.is_published ?? false),
  created_at: raw.createdAt ?? raw.created_at ?? '',
  updated_at: raw.updatedAt ?? raw.updated_at ?? '',
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Course API - Spring backend uses /courses/** endpoints
export const coursesApi = {
  getAll: async () => {
    const response = await apiClient.get<PageResponse<Course> | Course[]>('/courses/my?size=100');
    const data = response.data;
    const values = Array.isArray(data) ? data : (data.content || []);
    return {
      ...response,
      data: values.map((course) => normalizeCourse(course)),
    };
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Course>(`/courses/${id}`);
    return { ...response, data: normalizeCourse(response.data) };
  },

  create: async (data: CourseCreateData) => {
    const response = await apiClient.post<Course>('/courses', {
      code: data.code,
      titleUk: data.titleUk,
      titleEn: data.titleEn,
      descriptionUk: data.descriptionUk,
      descriptionEn: data.descriptionEn,
      visibility: data.visibility,
      startDate: data.startDate,
      endDate: data.endDate,
      maxStudents: data.maxStudents,
      isPublished: data.isPublished,
      syllabus: data.syllabus,
      thumbnailUrl: data.thumbnailUrl,
      themeColor: data.themeColor,
    });
    return { ...response, data: normalizeCourse(response.data) };
  },

  update: async (id: string, data: Partial<Course>) => {
    const response = await apiClient.put<Course>(`/courses/${id}`, {
      titleUk: data.titleUk ?? data.title,
      titleEn: data.titleEn ?? data.title,
      descriptionUk: data.descriptionUk ?? data.description,
      descriptionEn: data.descriptionEn ?? data.description,
      syllabus: data.syllabus,
      visibility: data.visibility,
      isPublished: data.isPublished,
      thumbnailUrl: data.thumbnailUrl,
      themeColor: data.themeColor,
    });
    return { ...response, data: normalizeCourse(response.data) };
  },

  getSyllabus: (id: string) =>
    apiClient.get<CourseSyllabusResponse>(`/courses/${id}/syllabus`),

  updateSyllabus: (id: string, syllabus: string) =>
    apiClient.put<CourseSyllabusResponse>(`/courses/${id}/syllabus`, { syllabus }),

  delete: (id: string) => apiClient.delete(`/courses/${id}`),

  enrollStudents: (courseId: string, emails: string[], role: string = 'STUDENT') => {
    void courseId;
    void emails;
    void role;
    return Promise.reject(new Error('Bulk enroll by email is not supported in current backend.'));
  },

  getMembers: (courseId: string, role?: string) => {
    const params = role ? `?role=${role}` : '';
    return apiClient.get(`/courses/${courseId}/members${params}`);
  },

  getPublishChecklist: async (courseId: string) => {
    const response = await apiClient.get<CoursePublishChecklist>(`/courses/${courseId}/publish-checklist`);
    return response.data;
  },

  publish: async (courseId: string, payload?: { forcePublish?: boolean; overrideReason?: string }) => {
    const response = await apiClient.post<Course>(`/courses/${courseId}/publish`, payload || {});
    return { ...response, data: normalizeCourse(response.data) };
  },

  unpublish: async (courseId: string) => {
    const response = await apiClient.post<Course>(`/courses/${courseId}/unpublish`);
    return { ...response, data: normalizeCourse(response.data) };
  },

  archive: async (courseId: string) => {
    const response = await apiClient.post<Course>(`/courses/${courseId}/archive`);
    return { ...response, data: normalizeCourse(response.data) };
  },

  getArchive: (courseId: string) =>
    apiClient.get<CourseArchiveSnapshotResponse>(`/courses/${courseId}/archive`),

  cloneStructure: (
    sourceCourseId: string,
    payload: CloneCourseStructureRequest
  ) =>
    apiClient.post<CloneCourseStructureResult>(
      `/courses/${sourceCourseId}/clone-structure`,
      payload
    ),

  getPreview: (courseId: string) =>
    apiClient.get<CoursePreviewResponse>(`/courses/${courseId}/preview`),

  getTeacherTodo: (courseId?: string) =>
    apiClient.get<TeacherTodoDashboardResponse>(
      `/courses/teacher/todo${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`
    ),

  getStudentContextReminders: () =>
    apiClient.get<StudentContextReminderFeedResponse>('/courses/student/reminders'),

  getPublished: async () => {
    const response = await apiClient.get<Course[]>('/courses/published');
    const data = Array.isArray(response.data) ? response.data : [];
    return { ...response, data: data.map((course) => normalizeCourse(course)) };
  },

  search: async (query: string) => {
    const response = await apiClient.get<Course[]>('/courses/search', { params: { q: query } });
    const data = Array.isArray(response.data) ? response.data : [];
    return { ...response, data: data.map((course) => normalizeCourse(course)) };
  },

  getByCode: async (code: string) => {
    const response = await apiClient.get<Course>(`/courses/code/${encodeURIComponent(code)}`);
    return { ...response, data: normalizeCourse(response.data) };
  },

  getMyEnrollment: (courseId: string) =>
    apiClient.get(`/courses/${courseId}/enrollment`),

  checkEnrollment: (courseId: string) =>
    apiClient.get<boolean>(`/courses/${courseId}/enrollment/check`),

  dropEnrollment: (courseId: string) =>
    apiClient.post(`/courses/${courseId}/drop`),
};

// Module API - Spring REST hierarchical URLs: /courses/{courseId}/modules
export const modulesApi = {
  getAll: async (courseId: string) => {
    const response = await apiClient.get<Module[]>(`/courses/${courseId}/modules`);
    const data = response.data as unknown;
    const modules = Array.isArray(data) ? data.map(normalizeModule) : [];
    return { ...response, data: modules };
  },

  getById: async (courseId: string, moduleId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}`);
    return { ...response, data: normalizeModule(response.data) };
  },

  create: async (data: { course: string; title: string; description?: string; is_published?: boolean }) => {
    const response = await apiClient.post(`/courses/${data.course}/modules`, {
      title: data.title,
      description: data.description,
      isPublished: data.is_published,
    });
    return { ...response, data: normalizeModule(response.data) };
  },

  update: async (courseId: string, moduleId: string, data: Partial<Module>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}`, data);
    return { ...response, data: normalizeModule(response.data) };
  },

  delete: (courseId: string, moduleId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}`),

  getAssignments: (courseId: string, moduleId: string) =>
    apiClient.get(`/courses/${courseId}/modules/${moduleId}/assignments`),

  publish: async (courseId: string, moduleId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/publish`);
    return { ...response, data: normalizeModule(response.data) };
  },

  unpublish: async (courseId: string, moduleId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/unpublish`);
    return { ...response, data: normalizeModule(response.data) };
  },

  reorder: (courseId: string, moduleIds: string[]) =>
    apiClient.put(`/courses/${courseId}/modules/reorder`, moduleIds),
};

// Resource API - Spring REST hierarchical URLs: /courses/{courseId}/modules/{moduleId}/resources
type ResourceUpdatePayload = Partial<ResourceCreateData> & Partial<Omit<Resource, 'file'>>;

export const resourcesApi = {
  getAll: async (courseId: string, moduleId: string) => {
    const response = await apiClient.get<Resource[]>(`/courses/${courseId}/modules/${moduleId}/resources`);
    const data = response.data as unknown;
    const resources = Array.isArray(data) ? data.map(normalizeResource) : [];
    return { ...response, data: resources };
  },

  getById: async (courseId: string, moduleId: string, resourceId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`);
    return { ...response, data: normalizeResource(response.data) };
  },

  create: async (data: ResourceCreateData) => {
    let response;
    if (data.file) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('resourceType', data.resource_type);
      formData.append('file', data.file);
      if (data.is_downloadable !== undefined) {
        formData.append('isDownloadable', String(data.is_downloadable));
      }
      response = await apiClient.upload<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, formData);
    } else {
      response = await apiClient.post<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, {
        title: data.title,
        description: data.description,
        resourceType: data.resource_type,
        fileUrl: data.file_url,
        externalUrl: data.external_url,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        textContent: data.text_content,
        isDownloadable: data.is_downloadable,
        metadata: data.metadata,
      });
    }
    return { ...response, data: normalizeResource(response.data) };
  },

  update: async (
    courseId: string,
    moduleId: string,
    resourceId: string,
    data: ResourceUpdatePayload
  ) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`, {
      title: data.title,
      description: data.description,
      resourceType: data.resource_type,
      fileUrl: data.file_url,
      externalUrl: data.external_url,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      position: data.position,
      isDownloadable: data.is_downloadable,
      textContent: data.text_content,
      metadata: data.metadata,
    });
    return { ...response, data: normalizeResource(response.data) };
  },

  delete: (courseId: string, moduleId: string, resourceId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`),

  reorder: (courseId: string, moduleId: string, resourceIds: string[]) =>
    apiClient.put(`/courses/${courseId}/modules/${moduleId}/resources/reorder`, resourceIds),

  uploadFile: (courseId: string, moduleId: string, formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload<Resource>(`/courses/${courseId}/modules/${moduleId}/resources`, formData,
      onProgress ? (e: AxiosProgressEvent) => {
        if (e.total) {
          const progress = Math.round((e.loaded * 100) / e.total);
          onProgress(progress);
        }
      } : undefined
    ),
};

// Announcement API
export const announcementsApi = {
  getAll: async (courseId: string) => {
    const response = await apiClient.get<Announcement[]>(`/courses/${courseId}/announcements`);
    const data = response.data as unknown;
    const announcements = Array.isArray(data) ? data.map(normalizeAnnouncement) : [];
    return { ...response, data: announcements };
  },
  getById: async (courseId: string, id: string) => {
    const response = await apiClient.get<Announcement>(`/courses/${courseId}/announcements/${id}`);
    return { ...response, data: normalizeAnnouncement(response.data) };
  },
  create: async (courseId: string, data: { title: string; content: string; is_pinned?: boolean }) => {
    const response = await apiClient.post<Announcement>(`/courses/${courseId}/announcements`, {
      title: data.title,
      content: data.content,
      isPinned: data.is_pinned,
    });
    return { ...response, data: normalizeAnnouncement(response.data) };
  },
  update: async (
    courseId: string,
    id: string,
    data: Partial<{ title: string; content: string; is_pinned?: boolean }>
  ) => {
    const response = await apiClient.put<Announcement>(`/courses/${courseId}/announcements/${id}`, {
      title: data.title,
      content: data.content,
      isPinned: data.is_pinned,
    });
    return { ...response, data: normalizeAnnouncement(response.data) };
  },
  delete: (courseId: string, id: string) => {
    return apiClient.delete(`/courses/${courseId}/announcements/${id}`);
  },
};
