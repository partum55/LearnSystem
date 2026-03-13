import apiClient from './client';
import type { InstalledPlugin, PluginType, PluginStatus } from '../plugins/types';

// Re-export the canonical types so consumers can import from one place.
export type { InstalledPlugin, PluginType, PluginStatus };

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
}

// Plugin config is a flat key-value map; values arrive as strings from the
// backend but may be coerced to numbers / booleans in the UI.
export type PluginConfig = Record<string, string | number | boolean>;

const PLUGINS_BASE = '/admin/plugins';

export const getInstalledPlugins = async (): Promise<InstalledPlugin[]> => {
  const response = await apiClient.get<InstalledPlugin[]>(PLUGINS_BASE);
  return response.data;
};

export const enablePlugin = async (pluginId: string): Promise<InstalledPlugin> => {
  const response = await apiClient.post<InstalledPlugin>(`${PLUGINS_BASE}/${pluginId}/enable`);
  return response.data;
};

export const disablePlugin = async (pluginId: string): Promise<InstalledPlugin> => {
  const response = await apiClient.post<InstalledPlugin>(`${PLUGINS_BASE}/${pluginId}/disable`);
  return response.data;
};

export const uninstallPlugin = async (pluginId: string): Promise<void> => {
  await apiClient.delete(`${PLUGINS_BASE}/${pluginId}`);
};

export const getPluginConfig = async (pluginId: string): Promise<PluginConfig> => {
  const response = await apiClient.get<PluginConfig>(`${PLUGINS_BASE}/${pluginId}/config`);
  return response.data;
};

export const updatePluginConfig = async (pluginId: string, config: PluginConfig): Promise<PluginConfig> => {
  const response = await apiClient.put<PluginConfig>(`${PLUGINS_BASE}/${pluginId}/config`, config);
  return response.data;
};
