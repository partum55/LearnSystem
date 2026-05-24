'use client';

import { useStudentDashboard } from '../../../hooks/useDashboardQueries';
import { EmptyState } from '../../DashboardLayout';
import { Loading } from '@/components/Loading';
import Link from 'next/link';

export default function StudentGradesWidget() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Loading grades..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading grades.
      </div>
    );
  }

  const courses = data?.activeCourses ?? [];
  const gradedCourses = courses.filter((c) => c.grade !== undefined && c.grade !== null);

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      {gradedCourses.length > 0 ? (
        gradedCourses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block rounded-lg border p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{course.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Course Grade
                </p>
              </div>
              <span className="text-lg font-semibold" style={{ color: 'var(--fn-success)' }}>
                {course.grade}%
              </span>
            </div>
          </Link>
        ))
      ) : (
        <EmptyState title="No course grades available" description="Grades will appear when courses are evaluated." compact />
      )}
    </div>
  );
}
