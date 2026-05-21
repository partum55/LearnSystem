'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCourseMembers, useCourseModules, useCourseOverview } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';

const paramString = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = paramString(params.id);
  const overview = useCourseOverview(courseId);
  const modules = useCourseModules(courseId);
  const { data: currentUser } = useCurrentUser();
  const members = useCourseMembers(courseId);
  const canSeeStaffTools = currentUser?.role === 'ADMIN' || currentUser?.role === 'TEACHER';

  if (overview.isLoading || modules.isLoading) return <Loading label="Loading course" />;

  return (
    <section>
      <h1 className="text-3xl font-semibold">{overview.data?.title ?? 'Course'}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">{overview.data?.description ?? 'No description'}</p>
      {canSeeStaffTools && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Members</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(members.data?.content ?? []).map((member) => (
              <div key={member.id} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{member.userName || member.userId}</p>
                <p className="text-sm text-slate-500">{member.userEmail}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {member.roleInCourse} · {member.enrollmentStatus}
                </p>
              </div>
            ))}
            {!members.data?.content?.length && <p className="text-sm text-slate-500">No members returned.</p>}
          </div>
        </div>
      )}
      <div className="mt-8 space-y-5">
        {(modules.data?.items ?? []).map((module) => (
          <article key={module.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">{module.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{module.description}</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Learning items</h3>
                <div className="mt-3 space-y-2">
                  {module.learningItems.map((item) => (
                    <Link key={item.id} className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" href={`/learning-items/${item.id}`}>
                      {item.title} <span className="text-xs text-slate-500">({item.type})</span>
                    </Link>
                  ))}
                  {!module.learningItems.length && <p className="text-sm text-slate-500">No learning items.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assignments</h3>
                <div className="mt-3 space-y-2">
                  {module.assignments.map((assignment) => (
                    <Link key={assignment.id} className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" href={`/assignments/${assignment.id}`}>
                      {assignment.title} <span className="text-xs text-slate-500">({assignment.type})</span>
                    </Link>
                  ))}
                  {!module.assignments.length && <p className="text-sm text-slate-500">No assignments.</p>}
                </div>
              </div>
            </div>
          </article>
        ))}
        {!modules.data?.items?.length && <p className="text-sm text-slate-500">No modules yet.</p>}
      </div>
    </section>
  );
}
