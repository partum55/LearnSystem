'use client';

import { AcademicCapIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import type { UserProfileDto } from '@/features/users/api/users.types';
import { useStudentDashboard } from '../hooks/useDashboardQueries';
import {
  DashboardError,
  DashboardLayout,
  DashboardLink,
  StatCard,
  displayName,
} from './DashboardLayout';
import { DashboardGrid } from './DashboardGrid';

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

      <DashboardGrid dashboardType="STUDENT" />
    </DashboardLayout>
  );
}
