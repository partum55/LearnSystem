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
  Topic,
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
const normalizeModule = (raw: any): Module => ({
  id: String(raw.id ?? ''),
  course: String(raw.courseId ?? raw.course ?? ''),
  title: String(raw.title ?? ''),
  description: raw.description ?? undefined,
  position: Number(raw.position ?? 0),
  isPublished: Boolean(raw.isPublished ?? false),
  publishDate: raw.publishDate ?? undefined,
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
  resourcesCount: raw.resourceCount ?? undefined,
  contentMeta: raw.contentMeta ?? undefined,
  resources: Array.isArray(raw.resources) ? raw.resources.map(normalizeResource) : undefined,
  assignments: Array.isArray(raw.assignments) ? raw.assignments.map(normalizeAssignment) : undefined,
});

const normalizeResource = (raw: any): Resource => ({
  id: String(raw.id ?? ''),
  module: String(raw.moduleId ?? raw.module ?? ''),
  topicId: raw.topicId ? String(raw.topicId) : undefined,
  title: String(raw.title ?? ''),
  description: raw.description ?? undefined,
  resourceType: String(raw.resourceType ?? 'OTHER') as Resource['resourceType'],
  fileUrl: raw.fileUrl ?? undefined,
  fileSize: raw.fileSize ?? undefined,
  externalUrl: raw.externalUrl ?? undefined,
  textContent: raw.textContent ?? undefined,
  storagePath: raw.storagePath ?? undefined,
  metadata: raw.metadata ?? undefined,
  position: Number(raw.position ?? 0),
  isDownloadable: Boolean(raw.isDownloadable ?? true),
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
  uploadedBy: raw.uploadedBy ?? undefined,
  uploadedByName: raw.uploadedByName ?? undefined,
});

const normalizeAnnouncement = (raw: any): Announcement => ({
  id: String(raw.id ?? ''),
  courseId: String(raw.courseId ?? raw.course ?? ''),
  title: String(raw.title ?? ''),
  content: String(raw.content ?? ''),
  isPinned: Boolean(raw.isPinned ?? false),
  createdBy: String(raw.createdBy ?? ''),
  updatedBy: raw.updatedBy ?? undefined,
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

const normalizeCourse = (raw: any): Course => {
  const titleUk = raw.titleUk ?? undefined;
  const titleEn = raw.titleEn ?? undefined;
  const descriptionUk = raw.descriptionUk ?? undefined;
  const descriptionEn = raw.descriptionEn ?? undefined;
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
    ownerId: raw.ownerId ? String(raw.ownerId) : undefined,
    ownerName: raw.ownerName ?? undefined,
    thumbnailUrl: raw.thumbnailUrl ?? undefined,
    themeColor: raw.themeColor ?? undefined,
    visibility: (visibility === 'PUBLIC' || visibility === 'PRIVATE' || visibility === 'DRAFT'
      ? visibility
      : 'DRAFT') as Course['visibility'],
    status: raw.status ? String(raw.status).toUpperCase() : undefined,
    academicYear: raw.academicYear ?? null,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
    memberCount: raw.memberCount ?? undefined,
    moduleCount: raw.moduleCount ?? undefined,
    isPublished: raw.isPublished ?? undefined,
    startDate: raw.startDate ?? undefined,
    endDate: raw.endDate ?? undefined,
    maxStudents: raw.maxStudents ?? undefined,
  };
};

const normalizeTopic = (raw: any): Topic => ({
  id: String(raw.id ?? ''),
  moduleId: String(raw.moduleId ?? ''),
  title: String(raw.title ?? ''),
  description: raw.description ?? undefined,
  position: Number(raw.position ?? 0),
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

const normalizeAssignment = (raw: any): Assignment => ({
  ...raw,
  id: String(raw.id ?? ''),
  courseId: String(raw.courseId ?? ''),
  moduleId: raw.moduleId ? String(raw.moduleId) : undefined,
  topicId: raw.topicId ? String(raw.topicId) : undefined,
  categoryId: raw.categoryId ? String(raw.categoryId) : undefined,
  assignmentType: String(raw.assignmentType ?? 'FILE_UPLOAD') as Assignment['assignmentType'],
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  dueDate: raw.dueDate ?? undefined,
  maxPoints: Number(raw.maxPoints ?? 100),
  isPublished: Boolean(raw.isPublished ?? false),
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
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

  create: async (data: {
    course: string;
    title: string;
    description?: string;
    is_published?: boolean;
    content_meta?: Record<string, unknown>;
  }) => {
    const response = await apiClient.post(`/courses/${data.course}/modules`, {
      title: data.title,
      description: data.description,
      isPublished: data.is_published,
      contentMeta: data.content_meta,
    });
    return { ...response, data: normalizeModule(response.data) };
  },

  update: async (courseId: string, moduleId: string, data: Partial<Module>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}`, {
      title: data.title,
      description: data.description,
      position: data.position,
      contentMeta: data.contentMeta,
      isPublished: data.isPublished,
      publishDate: data.publishDate,
    });
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

// Topic API - Spring REST hierarchical URLs: /courses/{courseId}/modules/{moduleId}/topics
export const topicsApi = {
  getAll: async (courseId: string, moduleId: string) => {
    const response = await apiClient.get<Topic[]>(`/courses/${courseId}/modules/${moduleId}/topics`);
    const data = response.data as unknown;
    const topics = Array.isArray(data) ? data.map(normalizeTopic) : [];
    return { ...response, data: topics };
  },

  getById: async (courseId: string, moduleId: string, topicId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/topics/${topicId}`);
    return { ...response, data: normalizeTopic(response.data) };
  },

  create: async (courseId: string, moduleId: string, data: { title: string; description?: string; position?: number }) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/topics`, {
      title: data.title,
      description: data.description,
      position: data.position,
    });
    return { ...response, data: normalizeTopic(response.data) };
  },

  update: async (courseId: string, moduleId: string, topicId: string, data: Partial<Topic>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}/topics/${topicId}`, {
      title: data.title,
      description: data.description,
      position: data.position,
    });
    return { ...response, data: normalizeTopic(response.data) };
  },

  delete: (courseId: string, moduleId: string, topicId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}/topics/${topicId}`),

  reorder: (courseId: string, moduleId: string, topicIds: string[]) =>
    apiClient.put(`/courses/${courseId}/modules/${moduleId}/topics/reorder`, topicIds),
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
      formData.append('resourceType', data.resourceType);
      formData.append('file', data.file);
      if (data.isDownloadable !== undefined) {
        formData.append('isDownloadable', String(data.isDownloadable));
      }
      response = await apiClient.upload<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, formData);
    } else {
      response = await apiClient.post<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, {
        title: data.title,
        description: data.description,
        resourceType: data.resourceType,
        fileUrl: data.fileUrl,
        externalUrl: data.externalUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        textContent: data.textContent,
        isDownloadable: data.isDownloadable,
        metadata: data.metadata,
        topicId: data.topicId,
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
      resourceType: data.resourceType,
      fileUrl: data.fileUrl,
      externalUrl: data.externalUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      position: data.position,
      isDownloadable: data.isDownloadable,
      textContent: data.textContent,
      metadata: data.metadata,
      topicId: data.topicId,
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
  create: async (courseId: string, data: { title: string; content: string; isPinned?: boolean }) => {
    const response = await apiClient.post<Announcement>(`/courses/${courseId}/announcements`, {
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
    });
    return { ...response, data: normalizeAnnouncement(response.data) };
  },
  update: async (
    courseId: string,
    id: string,
    data: Partial<{ title: string; content: string; isPinned?: boolean }>
  ) => {
    const response = await apiClient.put<Announcement>(`/courses/${courseId}/announcements/${id}`, {
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
    });
    return { ...response, data: normalizeAnnouncement(response.data) };
  },
  delete: (courseId: string, id: string) => {
    return apiClient.delete(`/courses/${courseId}/announcements/${id}`);
  },
};
