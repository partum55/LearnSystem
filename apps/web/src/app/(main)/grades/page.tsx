'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStudentGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { Loading } from '@/components/Loading';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function GradesPage() {
  return (
    <Suspense fallback={<Loading label="Loading gradebook" />}>
      <GradesContent />
    </Suspense>
  );
}

function GradesContent() {
  const courseId = useSearchParams().get('courseId') ?? undefined;
  const gradebook = useStudentGradebook(courseId);

  if (!courseId) return <PlaceholderPage title="Student gradebook" />;
  if (gradebook.isLoading) return <Loading label="Loading gradebook" />;

  return (
    <section>
      <h1 className="text-3xl font-semibold">{gradebook.data?.courseTitle ?? 'Gradebook'}</h1>
      <p className="mt-2 text-slate-600">
        Total: {gradebook.data?.total.points ?? 0}/{gradebook.data?.total.maxPoints ?? 0}
      </p>
      <div className="mt-6 space-y-4">
        {gradebook.data?.modules.map((module) => (
          <article key={module.moduleId} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{module.title}</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {module.assignments.map((assignment) => (
                <div key={assignment.assignmentId} className="flex justify-between py-3 text-sm">
                  <span>{assignment.title}</span>
                  <span>{assignment.points ?? '-'} / {assignment.maxPoints}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
