import type { DashboardWidgetDefinition, DashboardWidgetId } from './dashboard.types';
import StudentDeadlinesWidget from './components/widgets/student/StudentDeadlinesWidget';
import StudentGradesWidget from './components/widgets/student/StudentGradesWidget';
import StudentCoursesWidget from './components/widgets/student/StudentCoursesWidget';
import StudentAnnouncementsWidget from './components/widgets/student/StudentAnnouncementsWidget';
import StudentProgressWidget from './components/widgets/student/StudentProgressWidget';
import TeacherNeedsGradingWidget from './components/widgets/teacher/TeacherNeedsGradingWidget';
import TeacherMissingSubmissionsWidget from './components/widgets/teacher/TeacherMissingSubmissionsWidget';
import TeacherDeadlinesWidget from './components/widgets/teacher/TeacherDeadlinesWidget';
import TeacherSetupWarningsWidget from './components/widgets/teacher/TeacherSetupWarningsWidget';
import TeacherRecentSubmissionsWidget from './components/widgets/teacher/TeacherRecentSubmissionsWidget';
import AdminSystemHealthWidget from './components/widgets/admin/AdminSystemHealthWidget';
import AdminEnrollmentIssuesWidget from './components/widgets/admin/AdminEnrollmentIssuesWidget';
import AdminSetupWarningsWidget from './components/widgets/admin/AdminSetupWarningsWidget';
import AdminEventsWidget from './components/widgets/admin/AdminEventsWidget';
import AdminStatsWidget from './components/widgets/admin/AdminStatsWidget';

const ALL_SIZES: [number, number][] = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [4, 1],
  [4, 2],
];

export const WIDGET_REGISTRY: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  // Student widgets
  student_deadlines: {
    id: 'student_deadlines',
    title: 'Upcoming Deadlines',
    description: 'Upcoming assignments and their due dates.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['STUDENT'],
    component: StudentDeadlinesWidget,
  },
  student_grades: {
    id: 'student_grades',
    title: 'Recent Grades',
    description: 'Latest grades in your enrolled courses.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['STUDENT'],
    component: StudentGradesWidget,
  },
  student_courses: {
    id: 'student_courses',
    title: 'Active Courses',
    description: 'Your currently active enrollments.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['STUDENT'],
    component: StudentCoursesWidget,
  },
  student_announcements: {
    id: 'student_announcements',
    title: 'Course Announcements',
    description: 'Important news from instructors.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['STUDENT'],
    component: StudentAnnouncementsWidget,
  },
  student_progress: {
    id: 'student_progress',
    title: 'Course Progress',
    description: 'Track your completion status in enrolled courses.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['STUDENT'],
    component: StudentProgressWidget,
  },

  // Teacher widgets
  teacher_needs_grading: {
    id: 'teacher_needs_grading',
    title: 'Needs Grading',
    description: 'Student submissions waiting for review.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['TEACHER'],
    component: TeacherNeedsGradingWidget,
  },
  teacher_missing_submissions: {
    id: 'teacher_missing_submissions',
    title: 'Missing Submissions',
    description: 'Students who have missed recent deadlines.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['TEACHER'],
    component: TeacherMissingSubmissionsWidget,
  },
  teacher_deadlines: {
    id: 'teacher_deadlines',
    title: 'Course Deadlines',
    description: 'Deadlines set across active courses.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['TEACHER'],
    component: TeacherDeadlinesWidget,
  },
  teacher_setup_warnings: {
    id: 'teacher_setup_warnings',
    title: 'Course Setup Warnings',
    description: 'Configuration issues or draft statuses in courses.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['TEACHER'],
    component: TeacherSetupWarningsWidget,
  },
  teacher_recent_submissions: {
    id: 'teacher_recent_submissions',
    title: 'Recent Submissions',
    description: 'All recent submissions by course.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['TEACHER'],
    component: TeacherRecentSubmissionsWidget,
  },

  // Admin widgets
  admin_system_health: {
    id: 'admin_system_health',
    title: 'System Health',
    description: 'Real-time status of backend service instances.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['ADMIN'],
    component: AdminSystemHealthWidget,
  },
  admin_stats: {
    id: 'admin_stats',
    title: 'System Statistics',
    description: 'Summary metrics for registered users and courses.',
    defaultSize: [2, 2],
    allowedSizes: ALL_SIZES,
    roles: ['ADMIN'],
    component: AdminStatsWidget,
  },
  admin_enrollment_issues: {
    id: 'admin_enrollment_issues',
    title: 'Enrollment Issues',
    description: 'Student and teacher synchronization errors.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['ADMIN'],
    component: AdminEnrollmentIssuesWidget,
  },
  admin_setup_warnings: {
    id: 'admin_setup_warnings',
    title: 'Setup Warnings',
    description: 'Platform warnings for unconfigured features.',
    defaultSize: [2, 1],
    allowedSizes: ALL_SIZES,
    roles: ['ADMIN'],
    component: AdminSetupWarningsWidget,
  },
  admin_events: {
    id: 'admin_events',
    title: 'Recent Administrative Events',
    description: 'Platform audit log stream.',
    defaultSize: [4, 1],
    allowedSizes: ALL_SIZES,
    roles: ['ADMIN'],
    component: AdminEventsWidget,
  },
};
