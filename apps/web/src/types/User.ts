export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: 'STUDENT' | 'TEACHER' | 'SUPERADMIN' | 'TA';
  locale: 'EN' | 'UK';
  theme: 'light' | 'dark';
  avatarUrl?: string;
  bio?: string;
  isActive: boolean;
  emailVerified: boolean;
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

