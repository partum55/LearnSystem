import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosProgressEvent } from 'axios';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';

// Prefer explicit NEXT_PUBLIC_API_URL, otherwise default to local Spring backend in dev
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

if (!API_BASE_URL) {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol; // 'https:' or 'http:'
    // Local dev default — matches whatever protocol the page was loaded with
    if (host === 'localhost' || host === '127.0.0.1') {
      API_BASE_URL = `${protocol}//localhost:8080/api`;
    }
  }
}

// Final fallback: same-origin relative path (inherits page protocol)
if (!API_BASE_URL) API_BASE_URL = '/api';

// Helper to delay in ms
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Extract a safe, human-readable error message
export const extractErrorMessage = (error: unknown): string => {
  const data = (error as AxiosError<{ message?: string; error?: string; detail?: string; non_field_errors?: string[]; code?: string; retry_after?: number }>)?.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
      return data.non_field_errors[0];
    }
    if (typeof data.code === 'string' && typeof data.retry_after !== 'undefined') {
      // e.g., rate-limit object
      return ((data.message as unknown) as string) || 'Too many requests, please try again shortly.';
    }
  }
  return (error as Error).message || 'Request failed';
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
      // Rely on AuthGuard/React state to redirect
    }
  }

  private setupInterceptors() {
    // Add Authorization header from Supabase session
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

    // Response interceptor to handle 401/429 and normalize error messages
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _retry429?: boolean }) | undefined;
        const status = error.response?.status;

        // 429 Too Many Requests: retry once after delay
        if (status === 429 && originalRequest && !originalRequest._retry429) {
          originalRequest._retry429 = true;
          const retryAfterHeader = error.response?.headers?.['retry-after'] as string | undefined;
          const retryAfterJson = (error.response?.data as Record<string, unknown>)?.retry_after as number | undefined;
          const retrySeconds = Math.min(10, Number(retryAfterHeader) || (typeof retryAfterJson === 'number' ? retryAfterJson : 1));
          await delay(retrySeconds * 1000);
          return this.client(originalRequest);
        }

        // 401 Unauthorized: Trigger auth failure handling
        if (status === 401 && originalRequest && !originalRequest._retry) {
           this.handleAuthFailure();
        }

        // Normalize error so consumers don't render objects
        const normalizedMessage = extractErrorMessage(error);
        if (error.response?.data && typeof error.response.data === 'object') {
          const dataObj = error.response.data as Record<string, unknown>;
          if (typeof dataObj.error !== 'string') {
            dataObj.error = normalizedMessage;
          }
        }
        if (normalizedMessage && normalizedMessage !== error.message) {
          try { (error as Error).message = normalizedMessage; } catch { /* ignore assignment error */ }
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
}

export const apiClient = new ApiClient();
export default apiClient;
