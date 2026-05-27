import { useState } from 'react';
import { apiClient, ApiError } from '@/api/client';

export interface CourseDraft {
  course: {
    title: string;
    code: string;
    description: string;
    syllabusJson?: unknown;
  };
  modules: Array<{
    title: string;
    description: string;
    orderIndex?: number;
    learningItems?: Array<{
      type: string;
      title: string;
      contentJson?: unknown;
    }>;
    assignments?: Array<{
      type: string;
      title: string;
      points?: number;
      instructionsJson?: unknown;
      settings?: unknown;
    }>;
  }>;
}

export function useCreateCourseFromDraft() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createCourse = async (draft: CourseDraft) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.request({
        method: 'POST',
        url: '/v1/courses/from-draft',
        data: draft,
      });
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
    setError(null);
    setIsLoading(false);
  };

  return {
    createCourse,
    reset,
    isLoading,
    error,
  };
}
