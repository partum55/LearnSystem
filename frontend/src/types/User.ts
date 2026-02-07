export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: 'STUDENT' | 'TEACHER' | 'SUPERADMIN';
  locale: 'en' | 'ua';
  theme: 'light' | 'dark';
  avatarUrl?: string;
  bio?: string;
  isActive: boolean;
  isStaff: boolean;
  emailVerified: boolean;
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

