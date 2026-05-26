import { useState } from 'react';
import { apiClient, ApiError } from '@/api/client';

export type AiTaskType = 
  | 'GENERATE_COURSE' 
  | 'GENERATE_RTE_MATERIAL' 
  | 'GENERATE_ASSIGNMENT' 
  | 'IMPROVE_ASSIGNMENT_INSTRUCTIONS' 
  | 'SUGGEST_GRADE';

export interface AiTaskRequest {
  type: AiTaskType;
  context?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

export interface AiTaskResponse<T = unknown> {
  generationId: string;
  type: AiTaskType;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  output: T;
  errorCode?: string;
  errorMessage?: string;
}

export function useAiTask<T = unknown>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<AiTaskResponse<T> | null>(null);

  const executeTask = async (request: AiTaskRequest) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await apiClient.request<AiTaskResponse<T>>({
        method: 'POST',
        url: '/v1/ai/tasks',
        data: request,
      });
      setData(response);
      return response;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return {
    executeTask,
    reset,
    isLoading,
    error,
    data,
  };
}
