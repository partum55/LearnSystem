'use client';

import { BookOpenIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import type { UserProfileDto } from '@/features/users/api/users.types';
import {
  DashboardError,
  DashboardLayout,
  DashboardLink,
  StatCard,
  displayName,
} from './DashboardLayout';
import { DashboardGrid } from './DashboardGrid';

export function TeacherDashboard({ currentUser }: { currentUser: UserProfileDto }) {
  const { data: courses, isLoading, error } = useTeachingCourses();
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

      <DashboardGrid dashboardType="TEACHER" />
    </DashboardLayout>
  );
}
