'use client';

import { Loading } from '@/components/Loading';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { AdminDashboard } from './AdminDashboard';
import { DashboardError } from './DashboardLayout';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';

function resolvedRole(role?: string | null, globalRole?: string | null) {
  return String(globalRole ?? role ?? '').toUpperCase();
}

export function DashboardPage() {
  const { data: currentUser, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <Loading label="Loading dashboard..." />;
  }

  if (error || !currentUser) {
    return <DashboardError />;
  }

  const role = resolvedRole(currentUser.role, currentUser.globalRole);

  if (role === 'ADMIN') {
    return <AdminDashboard currentUser={currentUser} />;
  }

  if (role === 'TEACHER') {
    return <TeacherDashboard currentUser={currentUser} />;
  }

  return <StudentDashboard currentUser={currentUser} />;
}
