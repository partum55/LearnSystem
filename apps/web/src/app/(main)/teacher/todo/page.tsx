'use client';

import { Loading } from '@/components/Loading';
import { TeacherDashboard } from '@/features/dashboard/components/TeacherDashboard';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

export default function TeacherTodoPage() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const isTeacher =
    currentUser?.role === 'TEACHER' ||
    currentUser?.globalRole === 'TEACHER' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.globalRole === 'ADMIN';

  if (isLoading) return <Loading label="Loading teaching workspace..." />;

  if (!currentUser || !isTeacher) {
    return (
      <section className="card">
        <div className="card-body">
          <h1 className="text-xl font-semibold">Teacher workspace</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Teacher or admin access is required.
          </p>
        </div>
      </section>
    );
  }

  return <TeacherDashboard currentUser={currentUser} />;
}
