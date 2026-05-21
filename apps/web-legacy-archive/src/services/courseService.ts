import { apiClient } from '../api/client';

export type CourseDto = {
  id: string;
  code: string;
  titleUk: string;
  titleEn: string | null;
  descriptionUk: string | null;
  descriptionEn: string | null;
  syllabus: string | null;
  ownerId: string;
  ownerName: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  thumbnailUrl: string | null;
  themeColor: string | null;
  startDate: string | null;
  endDate: string | null;
  academicYear: string | null;
  departmentId: string | null;
  maxStudents: number | null;
  currentEnrollment: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  hasCapacity: boolean | null;
  isActive: boolean | null;
  moduleCount: number | null;
  memberCount: number | null;
};

type PageResponse<T> = {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CourseCreatePayload = {
  code: string;
  titleUk: string;
  titleEn?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  syllabus?: string | null;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  thumbnailUrl?: string | null;
  themeColor?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  academicYear?: string | null;
  departmentId?: string | null;
  maxStudents?: number | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublished?: boolean;
};

export type CourseUpdatePayload = Partial<Omit<CourseCreatePayload, 'code'>>;

export const courseService = {
  async getMyCourses(): Promise<CourseDto[]> {
    // Domain action: getting user-specific course list with roles
    const { data } = await apiClient.get<PageResponse<CourseDto>>('/courses/my');
    return data.content;
  },

  async getCourseById(id: string): Promise<CourseDto> {
    // Could be direct Supabase if protected by RLS, but user said important actions go through Java.
    // We'll use Java to ensure we fetch modules and membership status correctly.
    const { data } = await apiClient.get<CourseDto>(`/courses/${id}`);
    return data;
  },

  async createCourse(course: CourseCreatePayload): Promise<CourseDto> {
    // Domain action: creation MUST go through Java
    const { data } = await apiClient.post<CourseDto>('/courses', course);
    return data;
  },

  async updateCourse(id: string, updates: CourseUpdatePayload): Promise<CourseDto> {
    // Domain action: update MUST go through Java
    const { data } = await apiClient.patch<CourseDto>(`/courses/${id}`, updates);
    return data;
  },

  async publishCourse(id: string): Promise<CourseDto> {
    const { data } = await apiClient.post<CourseDto>(`/courses/${id}/publish`);
    return data;
  }
};
