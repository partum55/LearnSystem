import apiClient from '@/api/client';

export type AiProvider = 'GEMINI';
export type AiKeySource = 'USER_KEY' | 'SYSTEM_KEY' | 'NONE';
export type AiKeyStatus = 'ACTIVE' | 'REVOKED';

export interface AiSettingsResponse {
  aiEnabled: boolean;
  provider: AiProvider;
  hasUserApiKey: boolean;
  maskedKey?: string | null;
  userKeyStatus?: AiKeyStatus | null;
  hasSystemKeyAvailableForAdmin: boolean;
  effectiveProvider: AiProvider;
  effectiveKeySource: AiKeySource;
  lastUsedAt?: string | null;
}

export interface SaveAiApiKeyRequest {
  provider: AiProvider;
  apiKey: string;
}

export interface AiConnectionTestResponse {
  status: 'OK' | 'AI_PROVIDER_RATE_LIMITED' | 'AI_PROVIDER_AUTH_FAILED' | 'AI_PROVIDER_UNAVAILABLE' | 'AI_OUTPUT_INVALID' | 'AI_KEY_REQUIRED' | string;
  message: string;
}

export const aiSettingsApi = {
  getSettings: () =>
    apiClient.request<AiSettingsResponse>({ url: '/v1/users/me/ai-settings' }),

  saveApiKey: (request: SaveAiApiKeyRequest) =>
    apiClient.request<AiSettingsResponse>({
      method: 'PUT',
      url: '/v1/users/me/ai-settings/api-key',
      data: request,
    }),

  deleteApiKey: () =>
    apiClient.request<AiSettingsResponse>({
      method: 'DELETE',
      url: '/v1/users/me/ai-settings/api-key',
    }),

  validateApiKey: (request: SaveAiApiKeyRequest) =>
    apiClient.request<{ valid: boolean }>({
      method: 'POST',
      url: '/v1/users/me/ai-settings/api-key/validate',
      data: request,
    }),

  testConnection: () =>
    apiClient.request<AiConnectionTestResponse>({
      method: 'POST',
      url: '/v1/users/me/ai-settings/test-connection',
    }),
};
