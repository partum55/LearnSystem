import { ReactNode, useEffect } from 'react';
import { useAIStreaming, AIProgressEvent } from '../../hooks/useAIStreaming';
import { AILoadingState } from './AILoadingState';
import { AIErrorFallback } from './AIErrorFallback';

interface AIStreamingWrapperProps {
  /** SSE endpoint URL (relative to API base) */
  endpoint: string;
  /** Whether to auto-start the stream */
  autoStart?: boolean;
  /** Request body for the stream */
  requestBody?: any;
  /** Progress callback */
  onProgress?: (event: AIProgressEvent) => void;
  /** Complete callback */
  onComplete?: (data: any) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Children to render when not streaming */
  children?: ReactNode;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom error component */
  errorComponent?: (error: Error, retry: () => void) => ReactNode;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Generation type for display */
  generationType?: string;
}

/**
 * Wrapper component for AI streaming operations.
 * Handles loading states, errors, and progress automatically.
 */
export function AIStreamingWrapper({
  endpoint,
  autoStart = false,
  requestBody,
  onProgress,
  onComplete,
  onError,
  children,
  loadingComponent,
  errorComponent,
  showProgress = true,
  generationType = 'content',
}: AIStreamingWrapperProps) {
  const {
    connect,
    abort,
    isStreaming,
    progress,
    error,
  } = useAIStreaming(endpoint, {
    onProgress,
    onComplete,
    onError,
    maxRetries: 3,
  });

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      connect(requestBody);
    }
    return () => abort();
  }, [autoStart, requestBody, connect, abort]);

  // Show error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent(error, () => connect(requestBody))}</>;
    }
    return (
      <AIErrorFallback
        error={error}
        onRetry={() => connect(requestBody)}
        title={`AI ${generationType} generation failed`}
        description={error.message || 'An error occurred during generation. Please try again.'}
      />
    );
  }

  // Show loading state
  if (isStreaming) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <AILoadingState
        progress={showProgress ? progress : undefined}
        message={`Generating ${generationType}...`}
        stage={progress > 0 ? `${progress}% complete` : undefined}
      />
    );
  }

  // Render children when not streaming
  return <>{children}</>;
}

/**
 * Hook-based streaming component with render props pattern
 */
interface AIStreamingRenderProps {
  endpoint: string;
  children: (props: {
    connect: (body?: any) => void;
    abort: () => void;
    isStreaming: boolean;
    progress: number;
    error: Error | null;
    receivedData: any[];
  }) => ReactNode;
  onComplete?: (data: any) => void;
}

export function AIStreamingProvider({
  endpoint,
  children,
  onComplete,
}: AIStreamingRenderProps) {
  const streamingProps = useAIStreaming(endpoint, {
    onComplete,
  });

  return <>{children(streamingProps)}</>;
}

export default AIStreamingWrapper;

