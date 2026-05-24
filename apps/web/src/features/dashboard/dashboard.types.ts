import type { ComponentType } from 'react';

export type DashboardType = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type DashboardWidgetId =
  // Student widgets
  | 'student_deadlines'
  | 'student_grades'
  | 'student_courses'
  | 'student_announcements'
  | 'student_progress'
  // Teacher widgets
  | 'teacher_needs_grading'
  | 'teacher_missing_submissions'
  | 'teacher_deadlines'
  | 'teacher_setup_warnings'
  | 'teacher_recent_submissions'
  // Admin widgets
  | 'admin_system_health'
  | 'admin_enrollment_issues'
  | 'admin_setup_warnings'
  | 'admin_events'
  | 'admin_stats';

export type WidgetSize = [number, number]; // [w, h]

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  title: string;
  description?: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  roles: DashboardType[];
  component: ComponentType<{ size: WidgetSize; isCustomizing: boolean }>;
}

export interface DashboardLayoutItem {
  id: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
}

export interface DashboardLayout {
  version: number;
  dashboardType: DashboardType;
  widgets: DashboardLayoutItem[];
}
