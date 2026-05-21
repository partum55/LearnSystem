import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { dashboardApi } from '../api/dashboard.api';

export const useStudentDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard.student(),
    queryFn: dashboardApi.getStudentDashboard,
    staleTime: 2 * 60 * 1000,
  });
