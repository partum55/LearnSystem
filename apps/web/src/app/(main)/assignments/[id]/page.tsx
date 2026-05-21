'use client';

import { useParams } from 'next/navigation';
import { useCanonicalAssignment } from '@/features/assignments/hooks/useAssignmentQueries';
import { Loading } from '@/components/Loading';

const paramString = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = paramString(params.id);
  const { data, isLoading, error } = useCanonicalAssignment(assignmentId);

  if (isLoading) return <Loading label="Loading assignment" />;
  if (error) return <p className="text-sm text-red-600">Assignment is unavailable.</p>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{data?.type}</p>
      <h1 className="mt-2 text-3xl font-semibold">{data?.title ?? 'Assignment'}</h1>
      <p className="mt-3 text-slate-600">{data?.description ?? data?.instructions ?? 'No instructions yet.'}</p>
      <dl className="mt-6 grid gap-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-slate-500">Max points</dt>
          <dd className="font-medium">{data?.maxPoints ?? 0}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Due date</dt>
          <dd className="font-medium">{data?.dueDate ?? 'No due date'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Submission</dt>
          <dd className="font-medium">{data?.studentState?.status ?? 'Not started'}</dd>
        </div>
      </dl>
    </section>
  );
}
