'use client';

import Link from 'next/link';
import { useStudentDashboard } from '@/features/dashboard/hooks/useDashboardQueries';
import { Loading } from '@/components/Loading';

export default function DashboardPage() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) return <Loading label="Loading dashboard" />;

  return (
    <section>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      {error && <p className="mt-4 text-sm text-red-600">Dashboard data is unavailable.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Active courses" value={data?.activeCourseCount ?? 0} />
        <Metric label="Upcoming deadlines" value={data?.upcomingDeadlineCount ?? 0} />
        <Metric label="Pending submissions" value={data?.pendingSubmissionCount ?? 0} />
      </div>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Active courses</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {(data?.activeCourses ?? []).map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="block px-5 py-4 hover:bg-slate-50">
              <p className="font-medium">{course.title}</p>
              <p className="text-sm text-slate-500">{course.teacherName ?? 'Teacher not assigned'}</p>
            </Link>
          ))}
          {!data?.activeCourses?.length && <p className="px-5 py-4 text-sm text-slate-500">No active courses yet.</p>}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
