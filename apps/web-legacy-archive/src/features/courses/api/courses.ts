import apiClient from '@/api/client';
import {
  Assignment,
  Announcement,
  Course,
  CourseCreateData,
  Module,
  Resource,
  ResourceCreateData,
  Topic,
} from '@/api/types';
import { canonicalCoursesApi } from './canonical-courses.api';
import { learningItemsApi } from '@/features/lesson/api/learning-items.api';
import type {
  AssignmentListItemDto,
  CourseModuleDto,
  CourseSummaryDto,
  LearningItemDto,
} from './canonical.types';

type UnknownRecord = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

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

const normalizeModule = (raw: UnknownRecord): Module => ({
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

const normalizeResource = (raw: UnknownRecord): Resource => ({
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

const normalizeAnnouncement = (raw: UnknownRecord): Announcement => ({
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

const normalizeCourse = (raw: UnknownRecord): Course => {
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

const normalizeAssignment = (raw: UnknownRecord): Assignment => ({
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

const canonicalCourseToCourse = (raw: CourseSummaryDto): Course => normalizeCourse({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  status: raw.status,
  ownerName: raw.teacherName,
  progress: raw.progress,
  grade: raw.grade,
  visibility: raw.status === 'PUBLISHED' ? 'PUBLIC' : 'DRAFT',
  isPublished: raw.status === 'PUBLISHED',
});

const canonicalLearningItemToResource = (item: LearningItemDto): Resource => {
  const settings = item.settings || {};
  const type = String(item.type || '').toLowerCase();
  const resourceType =
    type === 'pdf' ? 'PDF' :
      type === 'video' ? 'VIDEO' :
        type === 'link' ? 'LINK' :
          type === 'rte' ? 'TEXT' :
            type === 'lesson' ? 'TEXT' :
              type === 'file' ? 'OTHER' : 'OTHER';

  return normalizeResource({
    id: item.id,
    moduleId: item.moduleId,
    title: item.title,
    description: item.description,
    resourceType,
    position: item.order,
    externalUrl: settings.url,
    fileUrl: settings.fileUrl || settings.url,
    textContent: settings.textContent || settings.content,
    isDownloadable: settings.downloadable,
    metadata: {
      ...settings,
      canonicalType: item.type,
      visibilityStatus: item.visibilityStatus,
    },
  });
};

const canonicalAssignmentToAssignment = (assignment: AssignmentListItemDto, courseId?: string): Assignment => normalizeAssignment({
  id: assignment.id,
  courseId,
  moduleId: assignment.moduleId,
  assignmentType: assignment.type,
  title: assignment.title,
  maxPoints: assignment.maxPoints,
  dueDate: assignment.dueDate,
  isPublished: assignment.status === 'VISIBLE' || assignment.status === 'PUBLISHED',
});

const canonicalModuleToModule = (raw: CourseModuleDto, courseId: string): Module => normalizeModule({
  id: raw.id,
  courseId,
  title: raw.title,
  description: raw.description,
  position: raw.order,
  isPublished: raw.availabilityStatus !== 'HIDDEN',
  resources: raw.learningItems.map(canonicalLearningItemToResource),
  assignments: raw.assignments.map((assignment) => canonicalAssignmentToAssignment(assignment, courseId)),
  resourcesCount: raw.learningItems.length,
});

// Course API - canonical LMS screens use /v1 endpoints. Methods without /v1
// below are retained only for non-canonical admin/auth tooling that has no
// replacement endpoint yet.
export const coursesApi = {
  getAll: async () => {
    const data = await canonicalCoursesApi.getMyActive();
    const values = data.map(canonicalCourseToCourse);
    return {
      data: values,
    };
  },

  getById: async (id: string) => {
    const overview = await canonicalCoursesApi.getOverview(id);
    return { data: normalizeCourse(overview as unknown as UnknownRecord) };
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
    Promise.reject(new Error(`TODO canonical API: teacher todo dashboard${courseId ? ` for ${courseId}` : ''}`)),

  getStudentContextReminders: () =>
    Promise.reject(new Error('TODO canonical API: student context reminders are now part of /v1/dashboard/student')),

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
    const response = await canonicalCoursesApi.getModules(courseId);
    return { data: response.items.map((module) => canonicalModuleToModule(module, courseId)) };
  },

  getById: async (courseId: string, moduleId: string) => {
    const response = await canonicalCoursesApi.getModules(courseId);
    const module = response.items.find((item) => item.id === moduleId);
    if (!module) throw new Error('Module not found');
    return { data: canonicalModuleToModule(module, courseId) };
  },

  create: async (data: {
    course: string;
    title: string;
    description?: string;
    is_published?: boolean;
    content_meta?: Record<string, unknown>;
  }) => {
    const response = await canonicalCoursesApi.createModule(data.course, {
      title: data.title,
      description: data.description,
      visible: data.is_published,
    });
    return { data: canonicalModuleToModule(response as CourseModuleDto, data.course) };
  },

  update: async (courseId: string, moduleId: string, data: Partial<Module>) => {
    const response = await canonicalCoursesApi.updateModule(moduleId, {
      title: data.title,
      description: data.description,
      order: data.position,
      visible: data.isPublished,
    });
    return { data: canonicalModuleToModule(response as CourseModuleDto, courseId) };
  },

  delete: (courseId: string, moduleId: string) =>
    canonicalCoursesApi.deleteModule(moduleId).then(() => ({ data: undefined })),

  getAssignments: (courseId: string, moduleId: string) =>
    modulesApi.getById(courseId, moduleId).then((response) => ({ data: response.data.assignments || [] })),

  publish: async (courseId: string, moduleId: string) => {
    const data = await canonicalCoursesApi.updateModule(moduleId, { visible: true });
    return { data: canonicalModuleToModule(data, courseId) };
  },

  unpublish: async (courseId: string, moduleId: string) => {
    const data = await canonicalCoursesApi.updateModule(moduleId, { visible: false });
    return { data: canonicalModuleToModule(data, courseId) };
  },

  reorder: (courseId: string, moduleIds: string[]) => {
    void courseId;
    void moduleIds;
    return Promise.reject(new Error('TODO canonical API: module reorder endpoint is not available yet.'));
  },
};

// TODO canonical API: Topic is legacy. Course modules should use LearningItem arrays.
export const topicsApi = {
  getAll: (courseId: string, moduleId: string) => {
    void courseId;
    void moduleId;
    return Promise.resolve({ data: [] as Topic[] });
  },

  getById: (courseId: string, moduleId: string, topicId: string) => {
    void courseId;
    void moduleId;
    void topicId;
    return Promise.reject(new Error('TODO canonical API: topics were replaced by module.learningItems.'));
  },

  create: (courseId: string, moduleId: string, data: { title: string; description?: string; position?: number }) => {
    void courseId;
    void moduleId;
    void data;
    return Promise.reject(new Error('TODO canonical API: topics were replaced by module.learningItems.'));
  },

  update: (courseId: string, moduleId: string, topicId: string, data: Partial<Topic>) => {
    void courseId;
    void moduleId;
    void topicId;
    void data;
    return Promise.reject(new Error('TODO canonical API: topics were replaced by module.learningItems.'));
  },

  delete: (courseId: string, moduleId: string, topicId: string) => {
    void courseId;
    void moduleId;
    void topicId;
    return Promise.reject(new Error('TODO canonical API: topics were replaced by module.learningItems.'));
  },

  reorder: (courseId: string, moduleId: string, topicIds: string[]) => {
    void courseId;
    void moduleId;
    void topicIds;
    return Promise.reject(new Error('TODO canonical API: topics were replaced by module.learningItems.'));
  },
};

// Resource API compatibility facade backed by canonical LearningItem endpoints.
type ResourceUpdatePayload = Partial<ResourceCreateData> & Partial<Omit<Resource, 'file'>>;

export const resourcesApi = {
  getAll: async (courseId: string, moduleId: string) => {
    const response = await canonicalCoursesApi.getModules(courseId);
    const module = response.items.find((item) => item.id === moduleId);
    return { data: (module?.learningItems || []).map(canonicalLearningItemToResource) };
  },

  getById: async (courseId: string, moduleId: string, resourceId: string) => {
    void courseId;
    void moduleId;
    const item = await learningItemsApi.get(resourceId);
    return { data: canonicalLearningItemToResource(item) };
  },

  create: async (data: ResourceCreateData) => {
    const type = data.resourceType === 'VIDEO' ? 'video' :
      data.resourceType === 'LINK' ? 'link' :
        data.resourceType === 'PDF' || data.resourceType === 'SLIDE' ? 'pdf' :
          data.resourceType === 'TEXT' ? 'rte' : 'file';
    const item = await learningItemsApi.create(data.courseId, data.module, {
      type,
      title: data.title,
      description: data.description,
      url: data.externalUrl || data.fileUrl,
      textContent: data.textContent,
      downloadable: data.isDownloadable,
      settings: {
        ...(data.metadata || {}),
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
    return { data: canonicalLearningItemToResource(item) };
  },

  update: async (
    courseId: string,
    moduleId: string,
    resourceId: string,
    data: ResourceUpdatePayload
  ) => {
    void courseId;
    void moduleId;
    const item = await learningItemsApi.update(resourceId, {
      type: data.resourceType ? String(data.resourceType).toLowerCase() : undefined,
      title: data.title || '',
      description: data.description,
      order: data.position,
      url: data.externalUrl || data.fileUrl,
      textContent: data.textContent,
      downloadable: data.isDownloadable,
      settings: data.metadata,
    });
    return { data: canonicalLearningItemToResource(item) };
  },

  delete: (courseId: string, moduleId: string, resourceId: string) =>
    {
      void courseId;
      void moduleId;
      return learningItemsApi.archive(resourceId).then(() => ({ data: undefined }));
    },

  reorder: (courseId: string, moduleId: string, resourceIds: string[]) =>
    {
      void courseId;
      void moduleId;
      void resourceIds;
      return Promise.reject(new Error('TODO canonical API: learning item reorder endpoint is not available yet.'));
    },

  uploadFile: (courseId: string, moduleId: string, formData: FormData, onProgress?: (progress: number) => void) => {
    void courseId;
    void moduleId;
    void formData;
    void onProgress;
    return Promise.reject(new Error('TODO canonical API: file storage upload boundary is not implemented in /api/v1.'));
  },
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
