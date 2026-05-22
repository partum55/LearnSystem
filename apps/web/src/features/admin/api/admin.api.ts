import apiClient from '@/api/client';

export interface ServiceStatusDto {
  serviceName: string;
  instanceId: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | string;
  host: string;
  port: number;
  healthUrl: string;
  lastUpdated: string;
}

export interface SystemHealthDto {
  overallStatus: string;
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  services: ServiceStatusDto[];
  systemInfo: Record<string, unknown>;
  timestamp: string;
}

export const adminApi = {
  getServicesHealth: () => apiClient.request<SystemHealthDto>({ url: '/v1/admin/services' }),
};
