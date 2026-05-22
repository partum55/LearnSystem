import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';

export const useServicesHealth = (enabled = true) =>
  useQuery({
    queryKey: ['admin', 'services-health'],
    queryFn: adminApi.getServicesHealth,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled,
  });
