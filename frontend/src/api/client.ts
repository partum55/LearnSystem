import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './token';

// Use REACT_APP_API_URL set at build time. If not set, fall back to a relative path '/api'
// so the frontend can work when served from the same origin as the backend.
let API_BASE_URL = process.env.REACT_APP_API_URL || '';

if (!API_BASE_URL) {
  // If running in a browser, detect the host. For the hosted frontend (learn-system.onrender.com)
  // the API actually lives at learn-ucu-backend.onrender.com. Make that the default in production.
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host === 'learn-system.onrender.com' || host.endsWith('.learn-system.onrender.com')) {
      API_BASE_URL = 'https://learn-ucu-backend.onrender.com/api';
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
      withCredentials: true,
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFToken',
    });

    this.setupInterceptors();
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.client
      .post<{ access?: string }>('/auth/refresh/')
      .then((res) => {
        const access = res.data?.access || null;
        setAccessToken(access);
        return access;
      })
      .catch((err) => {
        setAccessToken(null);
        throw err;
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  private isAuthEndpoint(url?: string) {
    if (!url) return false;
    return url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/users');
  }

  private setupInterceptors() {
    // Add Authorization header from in-memory token (no localStorage)
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig & { _retry?: boolean; _retry429?: boolean }) => {
        const token = getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // For unsafe methods, ensure CSRF cookie is set by calling the csrf endpoint
        const method = (config.method || 'get').toLowerCase();
        const unsafe = ['post', 'put', 'patch', 'delete'];
        const isAuth = this.isAuthEndpoint(config.url);

        if (unsafe.includes(method) && !isAuth) {
          try {
            // Call the backend csrf endpoint to ensure the cookie is present
            // We don't await long; the server will set cookie in response
            await this.client.get('/auth/csrf/');
          } catch (e) {
            // Ignore errors here; the request will likely fail later with a clearer message
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
        const url = originalRequest?.url;

        // 429 Too Many Requests: retry once after delay
        if (status === 429 && originalRequest && !originalRequest._retry429) {
          originalRequest._retry429 = true;
          const retryAfterHeader = error.response?.headers?.['retry-after'] as string | undefined;
          const retryAfterJson = (error.response?.data as any)?.retry_after as number | undefined;
          const retrySeconds = Math.min(
            10,
            Number(retryAfterHeader) || (typeof retryAfterJson === 'number' ? retryAfterJson : 1)
          );
          await delay(retrySeconds * 1000);
          return this.client(originalRequest);
        }

        // 401 Unauthorized: attempt refresh once, de-duped, except on auth endpoints
        if (
          status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !this.isAuthEndpoint(url || '')
        ) {
          originalRequest._retry = true;
          try {
            const access = await this.refreshAccessToken();
            if (access && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${access}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Redirect to login on refresh failure
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
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

  public get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  public post<T>(url: string, data?: any, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  public put<T>(url: string, data?: any, config = {}) {
    return this.client.put<T>(url, data, config);
  }

  public patch<T>(url: string, data?: any, config = {}) {
    return this.client.patch<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }

  public upload<T>(url: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void) {
    return this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
