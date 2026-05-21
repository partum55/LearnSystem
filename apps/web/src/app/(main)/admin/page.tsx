'use client';

import Link from 'next/link';
import { Loading } from '@/components/Loading';
import { useAdminCourses } from '@/features/courses/hooks/useCourseQueries';
import { useAdminUsers, useCurrentUser } from '@/features/users/hooks/useUserQueries';

export default function AdminPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.globalRole === 'ADMIN';
  const { data: users, isLoading: usersLoading } = useAdminUsers({ size: 10 });
  const { data: courses, isLoading: coursesLoading } = useAdminCourses({ size: 10 });

  if (userLoading) return <Loading label="Loading admin context" />;

  if (!isAdmin) {
    return (
      <section>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-4 text-sm text-slate-600">Admin access is required.</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Canonical admin surface for users, courses, and course memberships.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Users</h2>
          {usersLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading users...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(users?.content ?? []).map((user) => (
                <div key={user.id} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">{user.displayName || user.email}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">{user.role}</p>
                </div>
              ))}
              {!users?.content?.length && <p className="text-sm text-slate-500">No users returned.</p>}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Courses</h2>
          {coursesLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading courses...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(courses?.content ?? []).map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <p className="font-medium">{course.titleEn || course.titleUk}</p>
                  <p className="text-sm text-slate-500">{course.descriptionEn || course.descriptionUk || 'No description'}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">{course.status}</p>
                </Link>
              ))}
              {!courses?.content?.length && <p className="text-sm text-slate-500">No courses returned.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
