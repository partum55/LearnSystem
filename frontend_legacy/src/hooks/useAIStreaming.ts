import { useState, useCallback, useRef, useEffect } from 'react';
import { getAccessToken } from '../api/token';

/**
 * AI Progress event structure from SSE
 */
export interface AIProgressEvent {
  eventType: 'progress' | 'data' | 'complete' | 'error';
  message?: string;
  percentage?: number;
  dataType?: string;
  data?: unknown;
}

/**
 * Options for the useAIStreaming hook
 */
interface UseAIStreamingOptions {
  /** Callback for progress events */
  onProgress?: (event: AIProgressEvent) => void;
  /** Callback when generation completes */
  onComplete?: (data: unknown) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Maximum number of reconnection attempts */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  retryDelay?: number;
}

/**
 * Return type for useAIStreaming hook
 */
interface UseAIStreamingReturn {
  /** Connect to SSE endpoint and start streaming */
  connect: (body?: unknown) => void;
  /** Abort the current streaming connection */
  abort: () => void;
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current error, if any */
  error: Error | null;
  /** All received data events */
  receivedData: unknown[];
}

/**
 * Custom hook for AI streaming via Server-Sent Events (SSE).
 * Provides automatic reconnection with exponential backoff.
 *
 * @param url - The SSE endpoint URL (relative to API base)
 * @param options - Configuration options
 * @returns Streaming control functions and state
 *
 * @example
 * const { connect, abort, isStreaming, progress, error } = useAIStreaming(
 *   '/v1/ai/courses/generate-stream',
 *   {
 *     onProgress: (event) => console.log('Progress:', event.percentage),
 *     onComplete: (data) => console.log('Complete:', data),
 *     onError: (error) => console.error('Error:', error),
 *   }
 * );
 */
export function useAIStreaming(
  url: string,
  options: UseAIStreamingOptions = {}
): UseAIStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [receivedData, setReceivedData] = useState<unknown[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const connectRef = useRef<((body?: unknown) => void) | null>(null);

  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;

  /**
   * Build the full URL with authentication token
   */
  const buildUrl = useCallback((baseUrl: string): string => {
    const token = getAccessToken();
    const apiBase = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || '';
    const fullUrl = `${apiBase}${baseUrl}`;

    // Add token as query parameter for SSE (can't use headers)
    const urlWithToken = token
      ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : fullUrl;

    return urlWithToken;
  }, []);

  /**
   * Connect to the SSE endpoint
   */
  const connect = useCallback((body?: unknown) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsStreaming(true);
    setError(null);
    setProgress(0);
    setReceivedData([]);
    retryCountRef.current = 0;

    const fullUrl = buildUrl(url);

    // For POST requests with body, we need to use fetch first
    // SSE with POST is not directly supported, so we use a workaround
    // The backend should support both GET with params and POST
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      retryCountRef.current = 0; // Reset retry count on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AIProgressEvent = JSON.parse(event.data);

        // Update progress
        if (data.percentage !== undefined) {
          setProgress(data.percentage);
        }

        // Call progress callback
        options.onProgress?.(data);

        // Handle different event types
        switch (data.eventType) {
          case 'data':
            setReceivedData(prev => [...prev, { type: data.dataType, data: data.data }]);
            break;

          case 'complete':
            options.onComplete?.(data.data);
            eventSource.close();
            setIsStreaming(false);
            setProgress(100);
            break;

          case 'error': {
            const err = new Error(data.message || 'AI generation failed');
            setError(err);
            options.onError?.(err);
            eventSource.close();
            setIsStreaming(false);
            break;
          }
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE error:', e);
      eventSource.close();

      // Attempt retry with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);

        console.log(`Retrying SSE connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

        setTimeout(() => {
          if (eventSourceRef.current === eventSource && connectRef.current) {
            connectRef.current(body);
          }
        }, delay);
      } else {
        const err = new Error('AI streaming connection failed after multiple retries');
        setError(err);
        options.onError?.(err);
        setIsStreaming(false);
      }
    };
  }, [url, options, maxRetries, retryDelay, buildUrl]);

  // Store connect function in ref for retry access
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  /**
   * Abort the current streaming connection
   */
  const abort = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    abort,
    isStreaming,
    progress,
    error,
    receivedData,
  };
}

export default useAIStreaming;
