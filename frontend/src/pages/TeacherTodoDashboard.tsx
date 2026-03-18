import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  coursesApi,
  TeacherTodoDashboardResponse,
  TeacherTodoDeadlineItem,
  TeacherTodoMissingItem,
  TeacherTodoSubmissionItem,
} from '../api/courses';
import { extractErrorMessage } from '../api/client';
import { Layout, Loading } from '../components';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useCourseStore } from '../store/courseStore';

const formatDateTime = (value?: string) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return format(date, 'MMM d, HH:mm');
};

const relative = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNowStrict(date, { addSuffix: true });
};

const SummaryCard: React.FC<{ title: string; value: number; tone: 'default' | 'warning' | 'danger' }> = ({
  title,
  value,
  tone,
}) => {
  const toneStyles =
    tone === 'danger'
      ? { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', color: 'var(--fn-error)' }
      : tone === 'warning'
        ? { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', color: 'var(--fn-warning)' }
        : { bg: 'var(--bg-elevated)', border: 'var(--border-subtle)', color: 'var(--text-primary)' };

  return (
    <article
      className="rounded-lg border px-4 py-3"
      style={{ background: toneStyles.bg, borderColor: toneStyles.border }}
    >
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: toneStyles.color, fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </article>
  );
};

const PendingItem: React.FC<{ item: TeacherTodoSubmissionItem }> = ({ item }) => (
  <Link
    to={`/speed-grader?assignmentId=${item.assignmentId}`}
    className="block rounded-md border px-3 py-2 transition-colors"
    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
    onMouseLeave={(event) => (event.currentTarget.style.background = 'var(--bg-elevated)')}
  >
    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      {item.assignmentTitle}
    </p>
    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
      {item.courseCode} · {item.studentName}
    </p>
    <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
      Submitted {relative(item.submittedAt)}
    </p>
  </Link>
);

const MissingItem: React.FC<{ item: TeacherTodoMissingItem }> = ({ item }) => (
  <div
    className="rounded-md border px-3 py-2"
    style={{ borderColor: 'rgba(239,68,68,0.20)', background: 'rgba(239,68,68,0.08)' }}
  >
    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      {item.assignmentTitle}
    </p>
    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
      {item.courseCode} · {item.studentName}
    </p>
    <p className="mt-1 text-xs" style={{ color: 'var(--fn-error)' }}>
      {item.daysOverdue} day(s) overdue · due {formatDateTime(item.dueDate)}
    </p>
  </div>
);

const DeadlineItem: React.FC<{ item: TeacherTodoDeadlineItem }> = ({ item }) => {
  const completion = item.expectedStudentCount > 0
    ? Math.round((item.submittedCount / item.expectedStudentCount) * 100)
    : 0;

  return (
    <Link
      to={`/courses/${item.courseId}`}
      className="block rounded-md border px-3 py-2 transition-colors"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(event) => (event.currentTarget.style.background = 'var(--bg-elevated)')}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {item.assignmentTitle}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {item.courseCode} · due {formatDateTime(item.dueDate)}
      </p>
      <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${completion}%`, background: 'var(--text-primary)' }}
        />
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
        {item.submittedCount}/{item.expectedStudentCount} submitted
      </p>
    </Link>
  );
};

export const TeacherTodoDashboard: React.FC = () => {
  const { courses, fetchCourses } = useCourseStore();
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [payload, setPayload] = useState<TeacherTodoDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const managedCourses = useMemo(
    () => (courses || []).filter((course) => course.status !== 'ARCHIVED'),
    [courses]
  );

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await coursesApi.getTeacherTodo(
          selectedCourseId === 'all' ? undefined : selectedCourseId
        );
        if (!isMounted) return;
        setPayload(response.data);
      } catch (err) {
        if (!isMounted) return;
        setError(extractErrorMessage(err));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void run();

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Teacher to-do' },
          ]}
        />

        <header className="rounded-lg border px-5 py-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Teacher To-do
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Ungraded submissions, overdue students, and near deadlines in one place.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="teacher-todo-course" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Course
              </label>
              <select
                id="teacher-todo-course"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="input py-1 text-sm"
              >
                <option value="all">All managed courses</option>
                {managedCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {error && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--fn-error)',
            }}
          >
            {error}
          </div>
        )}

        {!error && payload && (
          <>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SummaryCard title="Pending grading" value={payload.pendingGradingCount} tone="default" />
              <SummaryCard title="Missing submissions" value={payload.missingSubmissionCount} tone="danger" />
              <SummaryCard title="Upcoming deadlines (7d)" value={payload.upcomingDeadlineCount} tone="warning" />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <CheckCircleIcon className="h-4 w-4" />
                  Pending grading
                </h2>
                {payload.pendingGrading.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    Nothing to grade right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payload.pendingGrading.slice(0, 15).map((item) => (
                      <PendingItem key={item.submissionId} item={item} />
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Missing submissions
                </h2>
                {payload.missingSubmissions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    No overdue missing work.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payload.missingSubmissions.slice(0, 15).map((item) => (
                      <MissingItem key={`${item.assignmentId}-${item.studentId}`} item={item} />
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <CalendarDaysIcon className="h-4 w-4" />
                  Upcoming deadlines
                </h2>
                {payload.upcomingDeadlines.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    No deadlines in the next 7 days.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payload.upcomingDeadlines.slice(0, 15).map((item) => (
                      <DeadlineItem key={`${item.assignmentId}-${item.dueDate}`} item={item} />
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        )}

        {!error && !payload && (
          <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
            No data available.
          </div>
        )}

        {payload?.generatedAt && (
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
            <ClockIcon className="h-3.5 w-3.5" />
            Last updated {formatDateTime(payload.generatedAt)}
          </p>
        )}

        <div className="rounded-lg border px-4 py-3 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-faint)' }}>
          <p className="inline-flex items-center gap-1.5">
            <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
            Tip: open this page during grading sessions to reduce context switching.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherTodoDashboard;
