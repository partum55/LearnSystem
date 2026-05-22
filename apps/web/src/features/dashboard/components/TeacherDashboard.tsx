'use client';

import { BookOpenIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import type { UserProfileDto } from '@/features/users/api/users.types';
import {
  CourseSummaryCard,
  DashboardError,
  DashboardLayout,
  DashboardLink,
  EmptyState,
  SectionHeader,
  Shortcut,
  StatCard,
  displayName,
} from './DashboardLayout';

export function TeacherDashboard({ currentUser }: { currentUser: UserProfileDto }) {
  const { data: courses, isLoading, error } = useTeachingCourses(true);
  const teachingCourses = courses ?? [];
  const publishedCount = teachingCourses.filter((course) => course.status === 'PUBLISHED').length;

  if (isLoading) return <Loading label="Loading teacher dashboard..." />;
  if (error) return <DashboardError />;

  return (
    <DashboardLayout
      eyebrow="Teacher dashboard"
      title={`Teaching workspace, ${displayName(currentUser)}`}
      description="Manage active teaching courses, open gradebooks, review assignments, and jump back into course authoring."
      actions={<DashboardLink href="/courses" label="Manage courses" />}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={BookOpenIcon} label="Teaching courses" value={teachingCourses.length} />
        <StatCard icon={ChartBarIcon} label="Published courses" value={publishedCount} tone="success" />
        <StatCard icon={DocumentTextIcon} label="Draft or archived" value={Math.max(teachingCourses.length - publishedCount, 0)} tone="warning" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card">
          <SectionHeader title="Teaching courses" actionHref="/courses" actionLabel="Open courses" />
          <div className="card-body grid gap-3 md:grid-cols-2">
            {teachingCourses.length > 0 ? (
              teachingCourses.map((course) => <CourseSummaryCard key={course.id} course={course} staff />)
            ) : (
              <EmptyState title="No teaching courses" description="Courses where you teach will appear here." />
            )}
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Teacher shortcuts" />
          <div className="card-body space-y-2">
            <Shortcut href="/courses" label="Course authoring" description="Open modules, learning items, assignments, and members." />
            <Shortcut href="/gradebook" label="Gradebook" description="Review student grade state by course." />
            <Shortcut href="/teacher/todo" label="To-do view" description="Focused teaching queue based on canonical courses." />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
