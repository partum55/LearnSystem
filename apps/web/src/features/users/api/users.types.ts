import type { Uuid } from '@/api/types';

export type GlobalRole = 'ADMIN' | 'TEACHER' | 'USER';
export type CourseRole = 'OWNER' | 'TEACHER' | 'TA' | 'STUDENT';
export type UserStatus = 'active' | 'inactive' | string;
export type UserLocale = 'UK' | 'EN' | 'uk' | 'en' | string;
export type UserTheme = 'dark' | 'light' | string;

export interface UserProfileDto {
  id: Uuid;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  role: GlobalRole;
  globalRole?: GlobalRole;
  locale?: UserLocale | null;
  theme?: UserTheme | null;
  avatarUrl?: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateCurrentUserRequest {
  firstName?: string | null;
  lastName?: string | null;
  locale?: 'UK' | 'EN';
  theme?: 'dark' | 'light';
  avatarUrl?: string | null;
}

export interface AdminUpdateUserRequest {
  role?: GlobalRole;
  isActive?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
