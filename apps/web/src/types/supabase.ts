export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'SUPERADMIN' | 'TEACHER' | 'STUDENT' | 'TA';
export type UserLocale = 'UK' | 'EN';
export type UserTheme = 'light' | 'dark';

export type UserProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  student_id: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: UserLocale;
  theme: UserTheme | string | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
  email_verified: boolean | null;
  preferences: Json | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UserProfileInsert = {
  id: string;
  email: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole;
  locale?: UserLocale;
  theme?: UserTheme;
  student_id?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
  email_verified?: boolean;
  preferences?: Json;
};

export type UserProfileUpdate = Partial<
  Pick<UserProfileRow, 'display_name' | 'first_name' | 'last_name' | 'bio' | 'locale' | 'theme' | 'avatar_url'>
>;

export type CourseRow = {
  id: string;
  code: string;
  title_uk: string;
  title_en: string | null;
  description_uk: string | null;
  description_en: string | null;
  syllabus: string | null;
  owner_id: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  thumbnail_url: string | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
  department_id: string | null;
  max_students: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  is_published: boolean;
  theme_color: string | null;
  qr_attendance_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseMemberRow = {
  id: string;
  course_id: string;
  user_id: string;
  role_in_course: 'TEACHER' | 'TA' | 'STUDENT';
  added_by: string | null;
  added_at: string;
  updated_at: string;
  enrollment_status: 'active' | 'dropped' | 'completed';
  completion_date: string | null;
  final_grade: number | null;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  content_meta: Json;
  is_published: boolean;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: 'assignment_due' | 'grade_posted' | 'announcement' | 'course_update' | 'submission_graded' | 'peer_review_assigned' | 'system';
  title: string;
  message: string;
  payload: Json | null;
  is_read: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id' | 'created_at'>;
        Update: Partial<Pick<NotificationRow, 'is_read'>>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  learning: {
    Tables: {
      courses: {
        Row: CourseRow;
        Insert: Omit<CourseRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CourseRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'courses_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      course_members: {
        Row: CourseMemberRow;
        Insert: Omit<CourseMemberRow, 'id' | 'added_at' | 'updated_at'>;
        Update: Partial<Omit<CourseMemberRow, 'id' | 'added_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'course_members_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      modules: {
        Row: ModuleRow;
        Insert: Omit<ModuleRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ModuleRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'modules_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
