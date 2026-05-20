import apiClient from '../api/client';

export function usePluginApi(pluginId: string) {
  return {
    get: <T>(path: string, params?: Record<string, unknown>) =>
      apiClient.get<T>(`/plugins/${pluginId}${path}`, { params }),
    post: <T>(path: string, data?: unknown) =>
      apiClient.post<T>(`/plugins/${pluginId}${path}`, data),
    put: <T>(path: string, data?: unknown) =>
      apiClient.put<T>(`/plugins/${pluginId}${path}`, data),
    delete: <T>(path: string) =>
      apiClient.delete<T>(`/plugins/${pluginId}${path}`),
  };
}
