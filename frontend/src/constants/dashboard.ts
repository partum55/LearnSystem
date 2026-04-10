import { DashboardWidgetConfig } from '../components/DashboardBuilder';

export const DASHBOARD_WIDGETS_STORAGE_KEY = 'dashboardWidgets';

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'stats-1', type: 'stats', title: 'Statistics', visible: true, order: 0, size: 'full' },
  { id: 'courses-1', type: 'courses', title: 'My Courses', visible: true, order: 1, size: 'medium' },
  { id: 'due-today-1', type: 'due-today', title: 'Due Today', visible: true, order: 2, size: 'medium' },
  { id: 'deadlines-1', type: 'deadlines', title: 'Upcoming Deadlines', visible: true, order: 3, size: 'medium' },
  { id: 'notifications-1', type: 'notifications', title: 'Recent Activity', visible: true, order: 4, size: 'medium' },
  { id: 'progress-1', type: 'progress', title: 'Course Progress', visible: true, order: 5, size: 'medium' },
  { id: 'streak-1', type: 'streak', title: 'Learning Streak', visible: true, order: 6, size: 'small' },
  { id: 'completed-1', type: 'completed-today', title: 'Completed Today', visible: true, order: 7, size: 'small' },
  { id: 'calendar-1', type: 'calendar', title: 'Calendar', visible: true, order: 8, size: 'medium' },
  { id: 'grades-1', type: 'grade-distribution', title: 'Grade Distribution', visible: true, order: 9, size: 'medium' },
];
