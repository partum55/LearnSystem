'use client';

import Link from 'next/link';
import { useActiveCourses, useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';

export default function CoursesPage() {
  const { data, isLoading, error } = useActiveCourses();
  const { data: currentUser } = useCurrentUser();
  const { data: teachingCourses } = useTeachingCourses();
  const canTeachGlobally = currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';

  if (isLoading) return <Loading label="Loading courses" />;

  return (
    <section>
      <h1 className="text-3xl font-semibold">Courses</h1>
      {error && <p className="mt-4 text-sm text-red-600">Courses are unavailable.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(data ?? []).map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="rounded-lg border border-slate-200 bg-white p-5 hover:bg-slate-50">
            <p className="text-lg font-semibold">{course.title}</p>
            <p className="mt-2 text-sm text-slate-600">{course.description ?? 'No description'}</p>
            <p className="mt-4 text-sm text-slate-500">Progress: {course.progress ?? 0}%</p>
          </Link>
        ))}
        {!data?.length && <p className="text-sm text-slate-500">No active courses yet.</p>}
      </div>
      {canTeachGlobally && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold">Teaching</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(teachingCourses ?? []).map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-lg border border-slate-200 bg-white p-5 hover:bg-slate-50"
              >
                <p className="text-lg font-semibold">{course.title}</p>
                <p className="mt-2 text-sm text-slate-600">{course.description ?? 'No description'}</p>
                <p className="mt-4 text-sm text-slate-500">Course staff access</p>
              </Link>
            ))}
            {!teachingCourses?.length && <p className="text-sm text-slate-500">No teaching courses yet.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
