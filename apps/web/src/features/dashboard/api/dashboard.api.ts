import apiClient from '@/api/client';
import type { StudentDashboardDto } from '@/features/courses/api/canonical.types';

export const dashboardApi = {
  getStudentDashboard: () =>
    apiClient.request<StudentDashboardDto>({ url: '/v1/dashboard/student' }),
};
