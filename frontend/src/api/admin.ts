import apiClient from './client';

export interface ServiceStatus {
  serviceName: string;
  instanceId: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  host: string;
  port: number;
  healthUrl: string;
  lastUpdated: string;
}

export interface SystemHealth {
  overallStatus: string;
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  services: ServiceStatus[];
  systemInfo: {
    javaVersion: string;
    javaVendor: string;
    osName: string;
    osVersion: string;
    availableProcessors: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
    maxMemoryMB: number;
  };
  timestamp: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface UsersListResponse {
  users: UserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Get system health status and all registered services
export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await apiClient.get<SystemHealth>('/admin/services');
  return response.data;
};

// Get specific service instances
export const getServiceInstances = async (serviceName: string): Promise<ServiceStatus[]> => {
  const response = await apiClient.get<ServiceStatus[]>(`/admin/services/${serviceName}`);
  return response.data;
};

// Get list of all service names
export const getServiceNames = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>('/admin/services/names');
  return response.data;
};

// Get all users (admin only)
export const getAllUsers = async (page = 0, size = 20): Promise<UsersListResponse> => {
  const response = await apiClient.get<UsersListResponse>(`/users?page=${page}&size=${size}`);
  return response.data;
};

// Update user role (admin only)
export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  await apiClient.put(`/users/${userId}/role`, { role });
};

// Deactivate user (admin only)
export const deactivateUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/deactivate`);
};

// Activate user (admin only)
export const activateUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/activate`);
};
