import {
  AdminCourse,
  AdminCourseVisibility,
  AdminUser,
  AdminUserLocale,
  AdminUserRole,
} from '../../api/admin';

export type AdminTab = 'services' | 'users' | 'courses' | 'course-manager' | 'import-export' | 'test-lab';

export type Feedback = {
  type: 'success' | 'error';
  message: string;
} | null;

export interface CreateUserForm {
  email: string;
  password: string;
  displayName: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: AdminUserRole;
  locale: AdminUserLocale;
}

export interface UpdateUserForm {
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  locale: AdminUserLocale;
  theme: 'light' | 'dark';
}

export interface CreateCourseForm {
  code: string;
  titleUk: string;
  titleEn: string;
  descriptionUk: string;
  descriptionEn: string;
  visibility: AdminCourseVisibility;
  maxStudents: string;
  isPublished: boolean;
}

export interface UpdateCourseForm {
  titleUk: string;
  titleEn: string;
  descriptionUk: string;
  descriptionEn: string;
  visibility: AdminCourseVisibility;
  maxStudents: string;
  isPublished: boolean;
}

export const initialCreateUserForm: CreateUserForm = {
  email: '',
  password: '',
  displayName: '',
  firstName: '',
  lastName: '',
  studentId: '',
  role: 'STUDENT',
  locale: 'UK',
};

export const initialUpdateUserForm: UpdateUserForm = {
  displayName: '',
  firstName: '',
  lastName: '',
  bio: '',
  locale: 'UK',
  theme: 'light',
};

export const initialCreateCourseForm: CreateCourseForm = {
  code: '',
  titleUk: '',
  titleEn: '',
  descriptionUk: '',
  descriptionEn: '',
  visibility: 'PRIVATE',
  maxStudents: '',
  isPublished: false,
};

export const initialUpdateCourseForm: UpdateCourseForm = {
  titleUk: '',
  titleEn: '',
  descriptionUk: '',
  descriptionEn: '',
  visibility: 'PRIVATE',
  maxStudents: '',
  isPublished: false,
};

export const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const formatDate = (value?: string): string => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export const displayUserName = (user: AdminUser): string => {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName;
  }
  const firstLast = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return firstLast.length > 0 ? firstLast : user.email;
};

export const filterCoursesBySearch = (
  courses: AdminCourse[],
  searchInput: string,
): AdminCourse[] => {
  const search = searchInput.trim().toLowerCase();
  if (!search) {
    return courses;
  }

  return courses.filter((course) => {
    const title = `${course.titleUk ?? ''} ${course.titleEn ?? ''}`.toLowerCase();
    return course.code.toLowerCase().includes(search) || title.includes(search);
  });
};
