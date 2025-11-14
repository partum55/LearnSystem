import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosProgressEvent } from 'axios';
import { getAccessToken, setAccessToken } from './token';

// Prefer explicit REACT_APP_API_URL, otherwise default to local Spring backend in dev
let API_BASE_URL = process.env.REACT_APP_API_URL || '';

if (!API_BASE_URL) {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    // Local dev default
    if (host === 'localhost' || host === '127.0.0.1') {
      API_BASE_URL = 'http://localhost:8080/api';
    }
  }
}

// Final fallback: same-origin relative path
if (!API_BASE_URL) API_BASE_URL = '/api';

// Helper to delay in ms
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Extract a safe, human-readable error message
const extractErrorMessage = (error: AxiosError): string => {
  const data: any = error.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.non_field_errors?.[0] === 'string') return data.non_field_errors[0];
    if (typeof data.code === 'string' && typeof data.retry_after !== 'undefined') {
      // e.g., rate-limit object
      return data.message || 'Too many requests, please try again shortly.';
    }
  }
  return error.message || 'Request failed';
};

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

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

  // Disable refresh flow for now (backend exposes refresh but UI can re-login)
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = Promise.resolve(null).finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  private isAuthEndpoint(url?: string) {
    if (!url) return false;
    return url.includes('/auth/login') || url.includes('/auth/refresh');
  }

  private setupInterceptors() {
    // Add Authorization header from in-memory token (no localStorage)
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig & { _retry?: boolean; _retry429?: boolean }) => {
        const token = getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
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
          const retryAfterJson = (error.response?.data as any)?.retry_after as number | undefined;
          const retrySeconds = Math.min(10, Number(retryAfterHeader) || (typeof retryAfterJson === 'number' ? retryAfterJson : 1));
          await delay(retrySeconds * 1000);
          return this.client(originalRequest);
        }

        // 401 Unauthorized: attempt refresh once, de-duped, except on auth endpoints
        if (status === 401 && originalRequest && !originalRequest._retry && !this.isAuthEndpoint(originalRequest.url || '')) {
          originalRequest._retry = true;
          try {
            const access = await this.refreshAccessToken();
            if (access && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${access}`;
              setAccessToken(access);
              return this.client(originalRequest);
            }
          } catch {
            // fall through
          }
        }

        // Normalize error so consumers don't render objects
        const normalizedMessage = extractErrorMessage(error);
        if (error.response?.data && typeof (error.response.data as any) === 'object') {
          const dataObj = error.response.data as any;
          if (typeof dataObj.error !== 'string') {
            dataObj.error = normalizedMessage;
          }
        }
        if (normalizedMessage && normalizedMessage !== error.message) {
          try { (error as any).message = normalizedMessage; } catch {}
        }

        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, config = {}) { return this.client.get<T>(url, config); }
  public post<T>(url: string, data?: any, config = {}) { return this.client.post<T>(url, data, config); }
  public put<T>(url: string, data?: any, config = {}) { return this.client.put<T>(url, data, config); }
  public patch<T>(url: string, data?: any, config = {}) { return this.client.patch<T>(url, data, config); }
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
