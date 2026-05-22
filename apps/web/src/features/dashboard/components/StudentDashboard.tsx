'use client';

import { AcademicCapIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import type { UserProfileDto } from '@/features/users/api/users.types';
import { useStudentDashboard } from '../hooks/useDashboardQueries';
import {
  CourseSummaryCard,
  DashboardError,
  DashboardLayout,
  DashboardLink,
  DeadlineCard,
  EmptyState,
  SectionHeader,
  StatCard,
  displayName,
} from './DashboardLayout';

export function StudentDashboard({ currentUser }: { currentUser: UserProfileDto }) {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) return <Loading label="Loading student dashboard..." />;
  if (error) return <DashboardError />;

  const courses = data?.activeCourses ?? [];
  const deadlines = data?.upcomingDeadlines ?? [];

  return (
    <DashboardLayout
      eyebrow="Student dashboard"
      title={`Welcome back, ${displayName(currentUser)}`}
      description="Track active courses, pending work, deadlines, and recent learning progress."
      actions={<DashboardLink href="/courses" label="Browse courses" />}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={AcademicCapIcon} label="Active courses" value={data?.activeCourseCount ?? courses.length} />
        <StatCard icon={ClockIcon} label="Upcoming deadlines" value={data?.upcomingDeadlineCount ?? deadlines.length} tone="warning" />
        <StatCard icon={DocumentTextIcon} label="Pending submissions" value={data?.pendingSubmissionCount ?? 0} tone="danger" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card">
          <SectionHeader title="My courses" actionHref="/courses" actionLabel="All courses" />
          <div className="card-body space-y-3">
            {courses.length > 0 ? (
              courses.map((course) => <CourseSummaryCard key={course.id} course={course} />)
            ) : (
              <EmptyState title="No active courses" description="Your active enrollments will appear here." />
            )}
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Next deadlines" />
          <div className="card-body space-y-3">
            {deadlines.length > 0 ? (
              deadlines.slice(0, 6).map((deadline) => <DeadlineCard key={deadline.assignmentId} deadline={deadline} />)
            ) : (
              <EmptyState title="No upcoming deadlines" description="You are clear for now." compact />
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
