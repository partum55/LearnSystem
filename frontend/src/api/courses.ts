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

interface PageResponse<T> {
  content: T[];
}

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
    return {
      ...response,
      data: Array.isArray(data) ? data : (data.content || []),
    };
  },

  getById: (id: string) => apiClient.get<Course>(`/courses/${id}`),

  create: (data: CourseCreateData) => apiClient.post<Course>('/courses', {
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
  }),

  update: (id: string, data: Partial<Course>) =>
    apiClient.put<Course>(`/courses/${id}`, {
      titleUk: data.titleUk ?? data.title,
      titleEn: data.titleEn ?? data.title,
      descriptionUk: data.descriptionUk ?? data.description,
      descriptionEn: data.descriptionEn ?? data.description,
      visibility: data.visibility,
      isPublished: data.isPublished,
    }),

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

  publish: (courseId: string, payload?: { forcePublish?: boolean; overrideReason?: string }) =>
    apiClient.post<Course>(`/courses/${courseId}/publish`, payload || {}),

  unpublish: (courseId: string) =>
    apiClient.post<Course>(`/courses/${courseId}/unpublish`),
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
        externalUrl: data.external_url,
        textContent: data.text_content,
        isDownloadable: data.is_downloadable,
      });
    }
    return { ...response, data: normalizeResource(response.data) };
  },

  update: async (courseId: string, moduleId: string, resourceId: string, data: Partial<Resource>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`, data);
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
