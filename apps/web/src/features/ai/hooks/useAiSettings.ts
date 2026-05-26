import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { aiSettingsApi, type SaveAiApiKeyRequest } from '../api/aiSettings.api';

export const useAiSettings = () =>
  useQuery({
    queryKey: queryKeys.ai.settings(),
    queryFn: aiSettingsApi.getSettings,
  });

export const useSaveAiApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveAiApiKeyRequest) => aiSettingsApi.saveApiKey(request),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.ai.settings(), settings);
    },
  });
};

export const useDeleteAiApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.deleteApiKey,
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.ai.settings(), settings);
    },
  });
};
