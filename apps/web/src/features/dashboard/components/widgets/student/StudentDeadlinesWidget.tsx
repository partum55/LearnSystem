'use client';

import { useStudentDashboard } from '../../../hooks/useDashboardQueries';
import { DeadlineCard, EmptyState } from '../../DashboardLayout';
import { Loading } from '@/components/Loading';

export default function StudentDeadlinesWidget() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Loading deadlines..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-red-500">
        Error loading deadlines.
      </div>
    );
  }

  const deadlines = data?.upcomingDeadlines ?? [];

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      {deadlines.length > 0 ? (
        deadlines.map((deadline) => (
          <DeadlineCard key={deadline.assignmentId} deadline={deadline} />
        ))
      ) : (
        <EmptyState title="No upcoming deadlines" description="You are clear for now." compact />
      )}
    </div>
  );
}
