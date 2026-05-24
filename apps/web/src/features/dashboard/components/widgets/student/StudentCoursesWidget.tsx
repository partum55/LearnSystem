'use client';

import { useStudentDashboard } from '../../../hooks/useDashboardQueries';
import { CourseSummaryCard, EmptyState } from '../../DashboardLayout';
import { Loading } from '@/components/Loading';

export default function StudentCoursesWidget() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Loading courses..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading courses.
      </div>
    );
  }

  const courses = data?.activeCourses ?? [];

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      {courses.length > 0 ? (
        courses.map((course) => (
          <CourseSummaryCard key={course.id} course={course} />
        ))
      ) : (
        <EmptyState title="No active courses" description="Your active enrollments will appear here." />
      )}
    </div>
  );
}
