import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { queryKeys } from '../api/queryClient';

/**
 * AI Usage types
 */
export interface AIUserUsage {
  id: string;
  userId: string;
  usagePeriod: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  failedRequestCount: number;
  estimatedCostUsd: number;
  updatedAt: string;
}

export interface AIUsageSummary {
  period: string;
  totalTokens: number;
  totalRequests: number;
  totalFailedRequests: number;
  totalCostUsd: number;
  activeUsers: number;
  averageTokensPerRequest: number;
  averageLatencyMs: number;
}

export interface AIUsageStats {
  period: string;
  totalTokens: number;
  totalRequests: number;
  failedRequests: number;
  totalCostUsd: number;
  successRate: number;
  byProvider: Record<string, ProviderStats>;
  byContentType: Record<string, ContentTypeStats>;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgLatencyMs: number;
  cacheHits?: number;
  cacheMisses?: number;
  cacheHitRate?: number;
}

export interface ProviderStats {
  provider: string;
  requests: number;
  tokens: number;
  failures: number;
  avgLatencyMs: number;
  estimatedCostUsd: number;
}

export interface ContentTypeStats {
  contentType: string;
  requests: number;
  tokens: number;
  avgLatencyMs: number;
}

/**
 * Get current user's AI usage
 */
export function useMyAIUsage() {
  return useQuery({
    queryKey: queryKeys.ai.usage.me(),
    queryFn: async () => {
      const response = await apiClient.get<AIUserUsage>('/v1/ai/usage/me');
      return response.data;
    },
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get specific user's AI usage (admin)
 */
export function useUserAIUsage(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.usage.user(userId),
    queryFn: async () => {
      const response = await apiClient.get<AIUserUsage>(`/v1/ai/usage/user/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });
}

/**
 * Get user's remaining token quota
 */
export function useRemainingQuota(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.usage.remaining(userId),
    queryFn: async () => {
      const response = await apiClient.get<number>(`/v1/ai/usage/user/${userId}/remaining`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Check if user has remaining quota
 */
export function useHasQuota(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.usage.quota(userId),
    queryFn: async () => {
      const response = await apiClient.get<boolean>(`/v1/ai/usage/user/${userId}/quota`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get system-wide AI usage summary (admin)
 */
export function useAIUsageSummary() {
  return useQuery({
    queryKey: queryKeys.ai.usage.summary(),
    queryFn: async () => {
      const response = await apiClient.get<AIUsageSummary>('/v1/ai/usage/summary');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get detailed AI usage stats (admin)
 */
export function useAIUsageStats() {
  return useQuery({
    queryKey: queryKeys.ai.usage.stats(),
    queryFn: async () => {
      const response = await apiClient.get<AIUsageStats>('/v1/ai/usage/stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get top AI users (admin)
 */
export function useTopAIUsers(limit = 10) {
  return useQuery({
    queryKey: queryKeys.ai.usage.topUsers(limit),
    queryFn: async () => {
      const response = await apiClient.get<AIUserUsage[]>(`/v1/ai/usage/top-users?limit=${limit}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

