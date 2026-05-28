import axios, { AxiosError, AxiosInstance, AxiosProgressEvent, InternalAxiosRequestConfig } from 'axios';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';

export interface ApiErrorShape {
  message: string;
  code?: string;
  fieldErrors: Record<string, string>;
  status?: number;
}

export class ApiError extends Error implements ApiErrorShape {
  code?: string;
  fieldErrors: Record<string, string>;
  status?: number;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.fieldErrors = error.fieldErrors;
    this.status = error.status;
  }
}

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

if (!API_BASE_URL) {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (host === 'localhost' || host === '127.0.0.1') {
      API_BASE_URL = `${protocol}//localhost:8080/api`;
    }
  }
}

if (!API_BASE_URL) API_BASE_URL = '/api';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const structuredAiErrorCodes = new Set([
  'AI_PROVIDER_RATE_LIMITED',
  'AI_PROVIDER_AUTH_FAILED',
  'AI_PROVIDER_UNAVAILABLE',
  'AI_OUTPUT_INVALID',
  'AI_KEY_REQUIRED',
]);

export const normalizeApiError = (error: unknown): ApiErrorShape => {
  if (error instanceof ApiError) {
    return error;
  }

  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    errorCode?: string;
    errorMessage?: string;
    detail?: string;
    non_field_errors?: string[];
    code?: string;
    status?: string | number;
    retry_after?: number;
    fieldErrors?: Record<string, string>;
  }>;
  const data = axiosError?.response?.data;

  if (data) {
    if (typeof data === 'string') {
      return { message: data, fieldErrors: {}, status: axiosError.response?.status };
    }

    const message =
      typeof data.message === 'string' ? data.message :
        typeof data.error === 'string' ? data.error :
          typeof data.errorMessage === 'string' ? data.errorMessage :
          typeof data.detail === 'string' ? data.detail :
            Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string'
              ? data.non_field_errors[0]
              : typeof data.code === 'string' && typeof data.retry_after !== 'undefined'
                ? 'Too many requests, please try again shortly.'
                : 'Request failed';

    const code =
      typeof data.code === 'string' ? data.code :
        typeof data.errorCode === 'string' ? data.errorCode :
          typeof data.status === 'string' && data.status.startsWith('AI_') ? data.status :
            undefined;

    return {
      message,
      code,
      fieldErrors: data.fieldErrors && typeof data.fieldErrors === 'object' ? data.fieldErrors : {},
      status: axiosError.response?.status,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Request failed',
    fieldErrors: {},
    status: axiosError?.response?.status,
  };
};

export const extractErrorMessage = (error: unknown): string => normalizeApiError(error).message;

const toApiError = (error: unknown): ApiError => {
  const normalized = normalizeApiError(error);
  return error instanceof ApiError ? error : new ApiError(normalized);
};

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

const isCanonicalApiPath = (url: string) => url === '/v1' || url.startsWith('/v1/');

const assertCanonicalApiPath = (url: string) => {
  if (!isCanonicalApiPath(url)) {
    throw new ApiError({
      message: `Canonical frontend API calls must use /v1 paths. Received: ${url}`,
      code: 'NON_CANONICAL_API_PATH',
      fieldErrors: {},
    });
  }
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private handleAuthFailure() {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('auth-storage');
      } catch {
        // ignore storage errors
      }
    }
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig & { _retry?: boolean; _retry429?: boolean }) => {
        const hasAuthorizationHeader = Boolean(
          config.headers &&
          (
            (config.headers as Record<string, unknown>).Authorization ||
            (config.headers as Record<string, unknown>).authorization
          )
        );

        if (!hasAuthorizationHeader && typeof window !== 'undefined') {
          const supabase = getSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _retry429?: boolean }) | undefined;
        const status = error.response?.status;

        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const responseCode =
          responseData && typeof responseData === 'object'
            ? String(responseData.errorCode ?? responseData.code ?? responseData.error ?? '')
            : '';

        if (status === 429 && originalRequest && !originalRequest._retry429 && !structuredAiErrorCodes.has(responseCode)) {
          originalRequest._retry429 = true;
          const retryAfterHeader = error.response?.headers?.['retry-after'] as string | undefined;
          const retryAfterJson = (error.response?.data as Record<string, unknown>)?.retry_after as number | undefined;
          const retrySeconds = Math.min(10, Number(retryAfterHeader) || (typeof retryAfterJson === 'number' ? retryAfterJson : 1));
          await delay(retrySeconds * 1000);
          return this.client(originalRequest);
        }

        if (status === 401 && originalRequest && !originalRequest._retry) {
          this.handleAuthFailure();
        }

        const normalized = normalizeApiError(error);
        if (error.response?.data && typeof error.response.data === 'object') {
          const dataObj = error.response.data as Record<string, unknown>;
          if (typeof dataObj.error !== 'string') {
            dataObj.error = normalized.message;
          }
        }
        if (normalized.message && normalized.message !== error.message) {
          try { (error as Error).message = normalized.message; } catch { /* ignore assignment error */ }
        }

        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, config = {}) { return this.client.get<T>(url, config); }
  public post<T>(url: string, data?: unknown, config = {}) { return this.client.post<T>(url, data, config); }
  public put<T>(url: string, data?: unknown, config = {}) { return this.client.put<T>(url, data, config); }
  public patch<T>(url: string, data?: unknown, config = {}) { return this.client.patch<T>(url, data, config); }
  public delete<T>(url: string, config = {}) { return this.client.delete<T>(url, config); }

  public upload<T>(url: string, formData: FormData, onUploadProgress?: (progressEvent: AxiosProgressEvent) => void) {
    return this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  }

  public async request<T>(config: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
  }): Promise<T> {
    assertCanonicalApiPath(config.url);

    try {
      const response = await this.client.request<T>({
        method: config.method || 'GET',
        url: config.url,
        data: config.data,
        params: config.params,
        headers: {
          ...(isFormData(config.data) ? { 'Content-Type': 'multipart/form-data' } : undefined),
          ...config.headers,
        },
      });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
