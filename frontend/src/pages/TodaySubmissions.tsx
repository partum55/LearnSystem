import React, { useEffect, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Loading } from '../components';
import { useCourseStore } from '../store/courseStore';
import { Course } from '../types';
import { useCourseDeadlines } from '../hooks/useCourseDeadlines';

const buildSubmissionPath = (
  courseId: string,
  assignmentId: string,
  moduleId?: string
) => {
  if (moduleId) {
    return `/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`;
  }
  return `/assignments/${assignmentId}`;
};

const byDueDateAsc = (a: string, b: string) => Date.parse(a) - Date.parse(b);

export const TodaySubmissions: React.FC = () => {
  const { t } = useTranslation();
  const { courses, fetchCourses, isLoading } = useCourseStore();

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const activeCourses = useMemo(
    () => (courses || []).filter((course: Course) => course.status !== 'ARCHIVED'),
    [courses]
  );
  const { deadlines, isLoading: deadlinesLoading } = useCourseDeadlines(activeCourses, {
    enabled: activeCourses.length > 0,
  });

  const todayItems = useMemo(
    () =>
      deadlines
        .filter((item) => isToday(new Date(item.dueDate)))
        .sort((a, b) => byDueDateAsc(a.dueDate, b.dueDate)),
    [deadlines]
  );

  const overdueItems = useMemo(
    () =>
      deadlines
        .filter((item) => item.status === 'overdue' && !isToday(new Date(item.dueDate)))
        .sort((a, b) => byDueDateAsc(b.dueDate, a.dueDate))
        .slice(0, 6),
    [deadlines]
  );

  const nextItems = useMemo(
    () =>
      deadlines
        .filter((item) => item.status === 'upcoming' && !isToday(new Date(item.dueDate)))
        .sort((a, b) => byDueDateAsc(a.dueDate, b.dueDate))
        .slice(0, 8),
    [deadlines]
  );

  if (isLoading || deadlinesLoading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-lg border px-5 py-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {t('today.title', 'What to submit today')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('today.subtitle', 'Deadlines for today, plus the closest next tasks.')}
          </p>
        </div>

        <section className="rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('today.dueToday', 'Due today')} ({todayItems.length})
            </h2>
          </div>

          {todayItems.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('today.noDueToday', 'No deadlines for today.')}
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {todayItems.map((item) => (
                <Link
                  key={item.assignmentId}
                  to={buildSubmissionPath(item.courseId, item.assignmentId, item.moduleId)}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors"
                  onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.courseCode} · {item.courseTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fn-warning)' }}>
                    <ClockIcon className="h-4 w-4" />
                    {format(new Date(item.dueDate), 'HH:mm')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {(overdueItems.length > 0 || nextItems.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
              <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('today.overdue', 'Overdue')}
                </h2>
              </div>
              {overdueItems.length === 0 ? (
                <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('today.noOverdue', 'No overdue tasks.')}
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {overdueItems.map((item) => (
                    <Link
                      key={item.assignmentId}
                      to={buildSubmissionPath(item.courseId, item.assignmentId, item.moduleId)}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors"
                      onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.courseCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fn-error)' }}>
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        {format(new Date(item.dueDate), 'MMM d')}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
              <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('today.nextUp', 'Next up')}
                </h2>
              </div>
              {nextItems.length === 0 ? (
                <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('today.noNext', 'No upcoming tasks.')}
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {nextItems.map((item) => (
                    <Link
                      key={item.assignmentId}
                      to={buildSubmissionPath(item.courseId, item.assignmentId, item.moduleId)}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors"
                      onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.courseCode}
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {format(new Date(item.dueDate), 'MMM d, HH:mm')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TodaySubmissions;
