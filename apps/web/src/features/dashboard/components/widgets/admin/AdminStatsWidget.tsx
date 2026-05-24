'use client';

import { useAdminCourses } from '@/features/courses/hooks/useCourseQueries';
import { useAdminUsers } from '@/features/users/hooks/useUserQueries';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';

export default function AdminStatsWidget() {
  const { data: users, isLoading: usersLoading, error: usersError } = useAdminUsers({ size: 1 });
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useAdminCourses({ size: 1 });

  if (usersLoading || coursesLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Loading stats..." />
      </div>
    );
  }

  if (usersError || coursesError) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading statistics.
      </div>
    );
  }

  const userCount = users?.totalElements ?? users?.content?.length ?? 0;
  const courseCount = courses?.totalElements ?? courses?.content?.length ?? 0;

  return (
    <div className="h-full flex flex-col justify-around gap-3">
      <div
        className="flex items-center gap-4 rounded-lg border p-4"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
      >
        <UserGroupIcon className="h-8 w-8 text-sky-500" />
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Total Registered Users
          </p>
          <p className="text-2xl font-bold">{userCount}</p>
        </div>
      </div>

      <div
        className="flex items-center gap-4 rounded-lg border p-4"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
      >
        <AcademicCapIcon className="h-8 w-8 text-emerald-500" />
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Total Created Courses
          </p>
          <p className="text-2xl font-bold">{courseCount}</p>
        </div>
      </div>
    </div>
  );
}
