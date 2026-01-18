import apiClient from './client';
import { Course, Module, Resource, ResourceCreateData, CourseCreateData } from '../types';

// Course API - Spring backend uses /courses/** endpoints
export const coursesApi = {
  getAll: () => apiClient.get<Course[]>('/courses/'),

  getById: (id: string) => apiClient.get<Course>(`/courses/${id}`),

  create: (data: CourseCreateData) => apiClient.post<Course>('/courses/', data),

  update: (id: string, data: Partial<Course>) =>
    apiClient.put<Course>(`/courses/${id}`, data),

  delete: (id: string) => apiClient.delete(`/courses/${id}`),

  enrollStudents: (courseId: string, emails: string[], role: string = 'STUDENT') =>
    apiClient.post(`/courses/${courseId}/members`, {
      emails: emails,
      role,
    }),

  getMembers: (courseId: string, role?: string) => {
    const params = role ? `?role=${role}` : '';
    return apiClient.get(`/courses/${courseId}/members${params}`);
  },
};

// Module API - Spring REST hierarchical URLs: /courses/{courseId}/modules
export const modulesApi = {
  getAll: (courseId: string) => {
    return apiClient.get<Module[]>(`/courses/${courseId}/modules`);
  },

  getById: (courseId: string, moduleId: string) =>
    apiClient.get<Module>(`/courses/${courseId}/modules/${moduleId}`),

  create: (data: { course: string; title: string; description?: string; is_published?: boolean }) =>
    apiClient.post<Module>(`/courses/${data.course}/modules`, {
      title: data.title,
      description: data.description,
      isPublished: data.is_published,
    }),

  update: (courseId: string, moduleId: string, data: Partial<Module>) =>
    apiClient.put<Module>(`/courses/${courseId}/modules/${moduleId}`, data),

  delete: (courseId: string, moduleId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}`),

  getAssignments: (courseId: string, moduleId: string) =>
    apiClient.get(`/courses/${courseId}/modules/${moduleId}/assignments`),

  publish: (courseId: string, moduleId: string) =>
    apiClient.post<Module>(`/courses/${courseId}/modules/${moduleId}/publish`),

  unpublish: (courseId: string, moduleId: string) =>
    apiClient.post<Module>(`/courses/${courseId}/modules/${moduleId}/unpublish`),

  reorder: (courseId: string, moduleIds: string[]) =>
    apiClient.put(`/courses/${courseId}/modules/reorder`, moduleIds),
};

// Resource API - Spring REST hierarchical URLs: /courses/{courseId}/modules/{moduleId}/resources
export const resourcesApi = {
  getAll: (courseId: string, moduleId: string) => {
    return apiClient.get<Resource[]>(`/courses/${courseId}/modules/${moduleId}/resources`);
  },

  getById: (courseId: string, moduleId: string, resourceId: string) =>
    apiClient.get<Resource>(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`),

  create: (data: ResourceCreateData) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('resourceType', data.resource_type);
      formData.append('file', data.file);
      if (data.is_downloadable !== undefined) {
        formData.append('isDownloadable', String(data.is_downloadable));
      }
      return apiClient.upload<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, formData);
    } else {
      return apiClient.post<Resource>(`/courses/${data.courseId}/modules/${data.module}/resources`, {
        title: data.title,
        description: data.description,
        resourceType: data.resource_type,
        externalUrl: data.external_url,
        textContent: data.text_content,
        isDownloadable: data.is_downloadable,
      });
    }
  },

  update: (courseId: string, moduleId: string, resourceId: string, data: Partial<Resource>) =>
    apiClient.put<Resource>(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`, data),

  delete: (courseId: string, moduleId: string, resourceId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`),

  uploadFile: (courseId: string, moduleId: string, formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload<Resource>(`/courses/${courseId}/modules/${moduleId}/resources`, formData,
      onProgress ? (e: any) => {
        if (e.total) {
          const progress = Math.round((e.loaded * 100) / e.total);
          onProgress(progress);
        }
      } : undefined
    ),
};

// Announcement API
export const announcementsApi = {
  getAll: (courseId?: string) => {
    const params = courseId ? `?courseId=${courseId}` : '';
    return apiClient.get(`/courses/announcements${params}`);
  },

  getById: (id: string) => apiClient.get(`/courses/announcements/${id}`),

  create: (data: { course: string; title: string; content: string; is_pinned?: boolean }) =>
    apiClient.post('/courses/announcements', data),

  update: (id: string, data: any) =>
    apiClient.put(`/courses/announcements/${id}`, data),

  delete: (id: string) => apiClient.delete(`/courses/announcements/${id}`),
};
