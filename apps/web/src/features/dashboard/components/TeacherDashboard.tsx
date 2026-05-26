'use client';

import { useState } from 'react';
import { BookOpenIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
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
  const [showAiPlaceholder, setShowAiPlaceholder] = useState(false);
  const teachingCourses = courses ?? [];
  const publishedCount = teachingCourses.filter((course) => course.status === 'PUBLISHED').length;

  if (isLoading) return <Loading label="Loading teacher dashboard..." />;
  if (error) return <DashboardError />;

  return (
    <DashboardLayout
      eyebrow="Teacher dashboard"
      title={`Teaching workspace, ${displayName(currentUser)}`}
      description="Manage active teaching courses, open gradebooks, review assignments, and jump back into course authoring."
      actions={(
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setShowAiPlaceholder((current) => !current)}>
            Create course with AI
          </button>
          <DashboardLink href="/courses" label="Manage courses" />
        </div>
      )}
    >
      {showAiPlaceholder && (
        <AiFeatureGate>
          <div
            className="rounded-lg border p-4 text-sm"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-muted)' }}
          >
            AI course generation is coming next.
          </div>
        </AiFeatureGate>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={BookOpenIcon} label="Teaching courses" value={teachingCourses.length} />
        <StatCard icon={ChartBarIcon} label="Published courses" value={publishedCount} tone="success" />
        <StatCard icon={DocumentTextIcon} label="Draft or archived" value={Math.max(teachingCourses.length - publishedCount, 0)} tone="warning" />
      </section>

      <DashboardGrid dashboardType="TEACHER" />
    </DashboardLayout>
  );
}
