import apiClient from './client';

export interface ServiceStatus {
  serviceName: string;
  instanceId: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  host: string;
  port: number;
  healthUrl: string;
  lastUpdated: string;
}

export interface SystemHealth {
  overallStatus: string;
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  services: ServiceStatus[];
  systemInfo: {
    javaVersion: string;
    javaVendor: string;
    osName: string;
    osVersion: string;
    availableProcessors: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
    maxMemoryMB: number;
  };
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type AdminUserRole = 'SUPERADMIN' | 'TEACHER' | 'STUDENT' | 'TA';
export type AdminUserLocale = 'UK' | 'EN';
export type AdminCourseVisibility = 'PUBLIC' | 'PRIVATE' | 'DRAFT';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  role: AdminUserRole;
  locale?: AdminUserLocale;
  theme?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
  isStaff: boolean;
  emailVerified: boolean;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  role: AdminUserRole;
  locale?: AdminUserLocale;
}

export interface UpdateAdminUserRequest {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  locale?: AdminUserLocale;
  theme?: 'light' | 'dark';
}

export interface AdminCourse {
  id: string;
  code: string;
  titleUk: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  ownerId: string;
  ownerName?: string;
  visibility: AdminCourseVisibility;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  currentEnrollment?: number;
  isPublished?: boolean;
  status?: string;
  moduleCount?: number;
  memberCount?: number;
  createdAt: string;
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

export interface PublishCourseBlockedPayload {
  message: string;
  checklist: CoursePublishChecklist;
}

export interface CreateAdminCourseRequest {
  code: string;
  titleUk: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  visibility?: AdminCourseVisibility;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  isPublished?: boolean;
}

export interface UpdateAdminCourseRequest {
  titleUk?: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  visibility?: AdminCourseVisibility;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  isPublished?: boolean;
}

// Get system health status and all registered services
export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await apiClient.get<SystemHealth>('/admin/services');
  return response.data;
};

// Get specific service instances
export const getServiceInstances = async (serviceName: string): Promise<ServiceStatus[]> => {
  const response = await apiClient.get<ServiceStatus[]>(`/admin/services/${serviceName}`);
  return response.data;
};

// Get list of all service names
export const getServiceNames = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>('/admin/services/names');
  return response.data;
};

export const getAdminUsers = async (params?: {
  query?: string;
  role?: AdminUserRole;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminUser>> => {
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set('query', params.query);
  if (params?.role) searchParams.set('role', params.role);
  searchParams.set('page', String(params?.page ?? 0));
  searchParams.set('size', String(params?.size ?? 20));
  const query = searchParams.toString();
  const response = await apiClient.get<PageResponse<AdminUser>>(`/users?${query}`);
  return response.data;
};

export const createAdminUser = async (payload: CreateAdminUserRequest): Promise<AdminUser> => {
  const response = await apiClient.post<AdminUser>('/users', payload);
  return response.data;
};

export const updateAdminUser = async (userId: string, payload: UpdateAdminUserRequest): Promise<AdminUser> => {
  const response = await apiClient.put<AdminUser>(`/users/${userId}`, payload);
  return response.data;
};

export const deactivateAdminUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/deactivate`);
};

export const activateAdminUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/activate`);
};

export const deleteAdminUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/users/${userId}`);
};

export const getAdminCourses = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminCourse>> => {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params?.page ?? 0));
  searchParams.set('size', String(params?.size ?? 20));
  const response = await apiClient.get<PageResponse<AdminCourse>>(`/courses?${searchParams.toString()}`);
  return response.data;
};

export const createAdminCourse = async (payload: CreateAdminCourseRequest): Promise<AdminCourse> => {
  const response = await apiClient.post<AdminCourse>('/courses', payload);
  return response.data;
};

export const updateAdminCourse = async (
  courseId: string,
  payload: UpdateAdminCourseRequest
): Promise<AdminCourse> => {
  const response = await apiClient.put<AdminCourse>(`/courses/${courseId}`, payload);
  return response.data;
};

export const deleteAdminCourse = async (courseId: string): Promise<void> => {
  await apiClient.delete(`/courses/${courseId}`);
};

export const getAdminCoursePublishChecklist = async (courseId: string): Promise<CoursePublishChecklist> => {
  const response = await apiClient.get<CoursePublishChecklist>(`/courses/${courseId}/publish-checklist`);
  return response.data;
};

export const publishAdminCourse = async (
  courseId: string,
  payload?: { forcePublish?: boolean; overrideReason?: string }
): Promise<AdminCourse> => {
  const response = await apiClient.post<AdminCourse>(`/courses/${courseId}/publish`, payload || {});
  return response.data;
};

export const unpublishAdminCourse = async (courseId: string): Promise<AdminCourse> => {
  const response = await apiClient.post<AdminCourse>(`/courses/${courseId}/unpublish`);
  return response.data;
};
