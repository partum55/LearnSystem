'use client';

import { useStudentDashboard } from '../../../hooks/useDashboardQueries';
import { EmptyState } from '../../DashboardLayout';
import { Loading } from '@/components/Loading';
import Link from 'next/link';

export default function StudentProgressWidget() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Loading progress..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading progress.
      </div>
    );
  }

  const courses = data?.activeCourses ?? [];

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      {courses.length > 0 ? (
        courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block rounded-lg border p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{course.title}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {course.progress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(course.progress ?? 0, 100))}%`,
                  background: 'var(--text-primary)',
                }}
              />
            </div>
          </Link>
        ))
      ) : (
        <EmptyState title="No course progress" description="Join a course to see your progress here." compact />
      )}
    </div>
  );
}
