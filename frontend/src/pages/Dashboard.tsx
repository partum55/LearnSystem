import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict, isToday } from 'date-fns';
import { Layout } from '../components';
import { Loading } from '../components';
import { Button } from '../components';
import { DashboardWidgetConfig } from '../components';
import { WidgetRenderer } from '../components';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { Course } from '../types';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useCourseDeadlines } from '../hooks/useCourseDeadlines';
import {
  coursesApi,
  StudentContextReminderItem,
  TeacherTodoDashboardResponse,
} from '../api/courses';
import { extractErrorMessage } from '../api/client';

interface DashboardCourse extends Course {
  completion_percentage?: number;
}

type DashboardStatusFilter = 'active' | 'archived' | 'all';

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
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

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading: coursesLoading } = useCourseStore();
  const { notifications, fetchNotifications } = useNotificationStore();
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('active');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [teacherTodo, setTeacherTodo] = useState<TeacherTodoDashboardResponse | null>(null);
  const [studentReminders, setStudentReminders] = useState<StudentContextReminderItem[]>([]);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    fetchCourses();
    fetchNotifications();
  }, [fetchCourses, fetchNotifications]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboardWidgets' && e.newValue) {
        setWidgets(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isInstructorRole =
    user?.role === 'TEACHER' || user?.role === 'TA' || user?.role === 'SUPERADMIN';
  const isStudentRole = user?.role === 'STUDENT';

  useEffect(() => {
    let isMounted = true;
    const loadInsights = async () => {
      setInsightsError(null);
      try {
        if (isInstructorRole) {
          const response = await coursesApi.getTeacherTodo();
          if (!isMounted) return;
          setTeacherTodo(response.data);
          setStudentReminders([]);
          return;
        }
        if (isStudentRole) {
          const response = await coursesApi.getStudentContextReminders();
          if (!isMounted) return;
          setStudentReminders(response.data.reminders || []);
          setTeacherTodo(null);
          return;
        }
        if (!isMounted) return;
        setTeacherTodo(null);
        setStudentReminders([]);
      } catch (err) {
        if (!isMounted) return;
        setInsightsError(extractErrorMessage(err));
      }
    };

    void loadInsights();
    return () => {
      isMounted = false;
    };
  }, [isInstructorRole, isStudentRole]);

  const dashboardCourses = (courses || []) as DashboardCourse[];
  const semesters = Array.from(
    new Set(
      dashboardCourses
        .map((course) => course.academicYear)
        .filter((year): year is string => Boolean(year))
    )
  ).sort((a, b) => b.localeCompare(a));

  const filteredCourses = dashboardCourses.filter((course) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'archived'
          ? course.status === 'ARCHIVED'
          : course.status !== 'ARCHIVED';

    const matchesSemester =
      semesterFilter === 'all' || course.academicYear === semesterFilter;

    return matchesStatus && matchesSemester;
  });

  const { deadlines: courseDeadlines, isLoading: deadlinesLoading } = useCourseDeadlines(filteredCourses, {
    enabled: filteredCourses.length > 0,
  });

  if (coursesLoading) return <Loading />;
  const now = new Date();

  const upcomingDeadlines = courseDeadlines
    .filter((item) => item.status === 'upcoming' && new Date(item.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6)
    .map((item) => ({
      course: item.courseTitle,
      courseCode: item.courseCode,
      title: item.title,
      deadline: item.dueDate,
      id: item.assignmentId,
    }));

  const todayDeadlines = courseDeadlines
    .filter((item) => isToday(new Date(item.dueDate)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6)
    .map((item) => ({
      course: item.courseTitle,
      courseCode: item.courseCode,
      title: item.title,
      deadline: item.dueDate,
      id: item.assignmentId,
      path: item.moduleId
        ? `/courses/${item.courseId}/modules/${item.moduleId}/assignments/${item.assignmentId}`
        : `/assignments/${item.assignmentId}`,
    }));

  const widgetData = {
    courses: filteredCourses.map((course) => ({
      ...course,
      progress: course.completion_percentage || 0,
    })),
    deadlines: upcomingDeadlines,
    todayDeadlines,
    notifications: (notifications || []).slice(0, 10),
  };

  const firstName = user?.display_name?.split(' ')[0] || user?.display_name;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-display)' }}>
              {t('dashboard.title')}
            </p>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {getGreeting()}, {firstName}
            </h1>
          </div>
          <Button
            onClick={() => navigate('/dashboard/customize')}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Cog6ToothIcon className="h-3.5 w-3.5" />
            <span>{t('dashboard.customize', 'Customize')}</span>
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {(['active', 'archived', 'all'] as DashboardStatusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: statusFilter === filter ? 'var(--bg-active)' : 'transparent',
                  color: statusFilter === filter ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {t(`courses.filter_${filter}`, filter)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-semester-filter" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              {t('courses.semester', 'Semester')}
            </label>
            <select
              id="dashboard-semester-filter"
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="input py-1 text-sm"
            >
              <option value="all">{t('courses.filter_all', 'All')}</option>
              {semesters.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isInstructorRole && teacherTodo && (
          <section
            className="mb-6 rounded-lg border p-4"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('dashboard.teacherTodo', 'Teacher to-do')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {t('dashboard.teacherTodoHint', 'Ungraded submissions, missing work, and nearest deadlines')}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/teacher/todo')}>
                {t('dashboard.openTeacherTodo', 'Open full view')}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  {t('dashboard.pendingGrading', 'Pending grading')}
                </p>
                <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {teacherTodo.pendingGradingCount}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  {t('dashboard.missingSubmissions', 'Missing submissions')}
                </p>
                <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--fn-error)' }}>
                  {teacherTodo.missingSubmissionCount}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  {t('dashboard.upcomingDeadlines7d', 'Deadlines in 7 days')}
                </p>
                <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--fn-warning)' }}>
                  {teacherTodo.upcomingDeadlineCount}
                </p>
              </div>
            </div>
          </section>
        )}

        {isStudentRole && studentReminders.length > 0 && (
          <section
            className="mb-6 rounded-lg border p-4"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <h2
              className="mb-1 text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('dashboard.contextReminders', 'Context reminders')}
            </h2>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-faint)' }}>
              {t('dashboard.contextRemindersHint', 'Priority recommendations based on your progress and due dates')}
            </p>
            <div className="space-y-2">
              {studentReminders.slice(0, 5).map((item) => {
                const severityColor =
                  item.severity === 'OVERDUE'
                    ? 'var(--fn-error)'
                    : item.severity === 'TODAY'
                      ? 'var(--fn-warning)'
                      : 'var(--text-faint)';
                return (
                  <Link
                    key={`${item.assignmentId}-${item.dueDate}`}
                    to={`/assignments/${item.assignmentId}`}
                    className="block rounded-md border px-3 py-2 transition-colors"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                    onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(event) => (event.currentTarget.style.background = 'var(--bg-elevated)')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.assignmentTitle}
                      </p>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: severityColor }}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.courseCode} · {item.recommendation}
                    </p>
                    {item.dueDate && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                        Due {formatDistanceToNowStrict(new Date(item.dueDate), { addSuffix: true })}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Widgets */}
        {widgets.filter(w => w.visible).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
            {widgets
              .filter(w => w.visible)
              .sort((a, b) => a.order - b.order)
              .map(widget => (
                <WidgetRenderer key={widget.id} widget={widget} data={widgetData} />
              ))}
          </div>
        ) : (
          <div
            className="text-center py-20 rounded-lg"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <Cog6ToothIcon className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
            <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('dashboard.builder.emptyState', 'No widgets to display')}
            </h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {t('dashboard.builder.emptyStateDesc', 'Customize your dashboard to add widgets')}
            </p>
            <Button onClick={() => navigate('/dashboard/customize')} size="sm">
              {t('dashboard.customize', 'Customize')}
            </Button>
          </div>
        )}

        {deadlinesLoading && (
          <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
            {t('dashboard.loadingDeadlines', 'Refreshing deadlines...')}
          </p>
        )}

        {insightsError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--fn-error)' }}>
            {insightsError}
          </p>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
