'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTeacherGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { Loading } from '@/components/Loading';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function TeacherGradebookPage() {
  return (
    <Suspense fallback={<Loading label="Loading teacher gradebook" />}>
      <TeacherGradebookContent />
    </Suspense>
  );
}

function TeacherGradebookContent() {
  const courseId = useSearchParams().get('courseId') ?? undefined;
  const gradebook = useTeacherGradebook(courseId);

  if (!courseId) return <PlaceholderPage title="Teacher gradebook" />;
  if (gradebook.isLoading) return <Loading label="Loading teacher gradebook" />;

  return (
    <section>
      <h1 className="text-3xl font-semibold">Teacher gradebook</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Student</th>
              {gradebook.data?.assignments.map((assignment) => (
                <th key={assignment.id} className="px-4 py-3">{assignment.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gradebook.data?.students.map((student) => (
              <tr key={student.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{student.displayName}</td>
                {gradebook.data?.assignments.map((assignment) => {
                  const grade = gradebook.data?.grades.find((cell) => cell.studentId === student.id && cell.assignmentId === assignment.id);
                  return <td key={assignment.id} className="px-4 py-3">{grade?.publishedPoints ?? grade?.draftPoints ?? '-'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
