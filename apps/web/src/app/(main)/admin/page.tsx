'use client';

import { Loading } from '@/components/Loading';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

export default function AdminPage() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.globalRole === 'ADMIN';

  if (isLoading) return <Loading label="Loading admin dashboard..." />;

  if (!currentUser || !isAdmin) {
    return (
      <section className="card">
        <div className="card-body">
          <h1 className="text-xl font-semibold">Admin dashboard</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Admin access is required.
          </p>
        </div>
      </section>
    );
  }

  return <AdminDashboard currentUser={currentUser} />;
}
