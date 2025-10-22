import apiClient from './client';
import { Course, Module, Resource, ResourceCreateData, CourseCreateData } from '../types';

// Course API
export const coursesApi = {
  getAll: () => apiClient.get<{ results: Course[] }>('/courses/'),

  getById: (id: string) => apiClient.get<Course>(`/courses/${id}/`),

  create: (data: CourseCreateData) => apiClient.post<Course>('/courses/', data),

  update: (id: string, data: Partial<Course>) =>
    apiClient.patch<Course>(`/courses/${id}/`, data),

  delete: (id: string) => apiClient.delete(`/courses/${id}/`),

  enrollStudents: (courseId: string, emails: string[], role: string = 'STUDENT') =>
    apiClient.post(`/courses/${courseId}/enroll_students/`, {
      student_emails: emails,
      role,
    }),

  getMembers: (courseId: string, role?: string) => {
    const params = role ? `?role=${role}` : '';
    return apiClient.get(`/courses/${courseId}/members/${params}`);
  },
};

// Module API
export const modulesApi = {
  getAll: (courseId?: string) => {
    const params = courseId ? `?course=${courseId}` : '';
    return apiClient.get<{ results: Module[] }>(`/courses/modules/${params}`);
  },

  getById: (id: string) => apiClient.get<Module>(`/courses/modules/${id}/`),

  create: (data: { course: string; title: string; description?: string; is_published?: boolean }) =>
    apiClient.post<Module>('/courses/modules/', data),

  update: (id: string, data: Partial<Module>) =>
    apiClient.patch<Module>(`/courses/modules/${id}/`, data),

  delete: (id: string) => apiClient.delete(`/courses/modules/${id}/`),

  getAssignments: (moduleId: string) =>
    apiClient.get(`/courses/modules/${moduleId}/assignments/`),
};

// Resource API
export const resourcesApi = {
  getAll: (moduleId?: string) => {
    const params = moduleId ? `?module=${moduleId}` : '';
    return apiClient.get<{ results: Resource[] }>(`/courses/resources/${params}`);
  },

  getById: (id: string) => apiClient.get<Resource>(`/courses/resources/${id}/`),

  create: (data: ResourceCreateData) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('module', data.module);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('resource_type', data.resource_type);
      formData.append('file', data.file);
      if (data.is_downloadable !== undefined) {
        formData.append('is_downloadable', String(data.is_downloadable));
      }
      return apiClient.upload<Resource>('/courses/resources/', formData);
    } else {
      return apiClient.post<Resource>('/courses/resources/', {
        module: data.module,
        title: data.title,
        description: data.description,
        resource_type: data.resource_type,
        external_url: data.external_url,
        text_content: data.text_content,
        is_downloadable: data.is_downloadable,
      });
    }
  },

  update: (id: string, data: Partial<Resource>) =>
    apiClient.patch<Resource>(`/courses/resources/${id}/`, data),

  delete: (id: string) => apiClient.delete(`/courses/resources/${id}/`),

  uploadFile: (formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload<Resource>('/courses/resources/', formData,
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
    const params = courseId ? `?course=${courseId}` : '';
    return apiClient.get(`/courses/announcements/${params}`);
  },

  getById: (id: string) => apiClient.get(`/courses/announcements/${id}/`),

  create: (data: { course: string; title: string; content: string; is_pinned?: boolean }) =>
    apiClient.post('/courses/announcements/', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/courses/announcements/${id}/`, data),

  delete: (id: string) => apiClient.delete(`/courses/announcements/${id}/`),
};

