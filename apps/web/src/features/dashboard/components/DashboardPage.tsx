'use client';

import { Loading } from '@/components/Loading';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { AdminDashboard } from './AdminDashboard';
import { DashboardError } from './DashboardLayout';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';

export function DashboardPage() {
  const { data: currentUser, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <Loading label="Loading dashboard..." />;
  }

  if (error || !currentUser) {
    return <DashboardError />;
  }

  if (currentUser.role === 'ADMIN' || currentUser.globalRole === 'ADMIN') {
    return <AdminDashboard currentUser={currentUser} embedded />;
  }

  if (currentUser.role === 'TEACHER' || currentUser.globalRole === 'TEACHER') {
    return <TeacherDashboard currentUser={currentUser} />;
  }

  return <StudentDashboard currentUser={currentUser} />;
}
