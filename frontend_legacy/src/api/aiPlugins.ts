import apiClient from './client';

// ─── Request/Response Types ──────────────────────────────────────────────────

export interface PluginGenerationRequest {
  description: string;
  pluginType?: string;
  pluginName?: string;
  pluginId?: string;
  permissions?: string[];
  language?: string;
  additionalDetails?: string;
}

export interface PluginGenerationResponse {
  pluginId: string;
  pluginName: string;
  pluginJson: string;
  mainPy: string;
  requirementsTxt: string;
}

export interface PluginGenerateAndInstallResponse extends PluginGenerationResponse {
  installed: boolean;
  installMessage: string;
}

export interface PluginDiagnosisRequest {
  symptoms?: string;
  recentLogLines?: number;
}

export interface PluginDiagnosisResponse {
  pluginId: string;
  rootCause: string;
  suggestedFixes: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
}

export interface PluginConfigSuggestionRequest {
  goal?: string;
  currentConfig?: Record<string, string>;
}

export interface PluginConfigSuggestionResponse {
  pluginId: string;
  suggestedConfig: Record<string, string>;
  reasoning: string;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

const AI_PLUGINS_BASE = '/v1/ai/plugins';

export const generatePlugin = async (
  request: PluginGenerationRequest,
): Promise<PluginGenerationResponse> => {
  const response = await apiClient.post<PluginGenerationResponse>(
    `${AI_PLUGINS_BASE}/generate`,
    request,
  );
  return response.data;
};

export const generateAndInstallPlugin = async (
  request: PluginGenerationRequest,
): Promise<PluginGenerateAndInstallResponse> => {
  const response = await apiClient.post<PluginGenerateAndInstallResponse>(
    `${AI_PLUGINS_BASE}/generate-and-install`,
    request,
  );
  return response.data;
};

export const diagnosePlugin = async (
  pluginId: string,
  request: PluginDiagnosisRequest,
): Promise<PluginDiagnosisResponse> => {
  const response = await apiClient.post<PluginDiagnosisResponse>(
    `${AI_PLUGINS_BASE}/${pluginId}/diagnose`,
    request,
  );
  return response.data;
};

export const suggestPluginConfig = async (
  pluginId: string,
  request: PluginConfigSuggestionRequest,
): Promise<PluginConfigSuggestionResponse> => {
  const response = await apiClient.post<PluginConfigSuggestionResponse>(
    `${AI_PLUGINS_BASE}/${pluginId}/suggest-config`,
    request,
  );
  return response.data;
};
