'use client';

import { useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import Link from 'next/link';

export default function TeacherSetupWarningsWidget() {
  const { data: courses, isLoading, error } = useTeachingCourses();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Analyzing courses..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading course data.
      </div>
    );
  }

  const draftCourses = (courses ?? []).filter((c) => c.status === 'DRAFT');

  return (
    <div className="h-full overflow-y-auto pr-1">
      {draftCourses.length > 0 ? (
        <div className="space-y-2">
          {draftCourses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="flex items-start gap-2 rounded-lg border p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
            >
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                  Course Draft
                </p>
                <p className="truncate text-sm font-medium">{course.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This course is in DRAFT status and is not visible to students.
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--fn-success)' }}>
            All courses active
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            No draft or configuration issues detected.
          </p>
        </div>
      )}
    </div>
  );
}
