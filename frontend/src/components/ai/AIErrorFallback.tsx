import React from 'react';

interface AIErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

/**
 * AI-specific error fallback component.
 * Provides user-friendly messaging for AI service failures.
 */
export const AIErrorFallback: React.FC<AIErrorFallbackProps> = ({
  error,
  onRetry,
  title = 'AI Service Unavailable',
  description = 'The AI assistant is temporarily unavailable. Please try again later.',
}) => {
  // Determine if error is transient (can retry) or permanent
  const isTransient = error?.message?.includes('timeout') ||
                      error?.message?.includes('temporarily') ||
                      error?.message?.includes('try again');

  return (
    <div className="p-6 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
      <div className="flex flex-col items-center text-center">
        {/* AI Robot Icon */}
        <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full" style={{ background: 'var(--bg-overlay)' }}>
          <svg
            className="w-8 h-8"
            style={{ color: 'var(--fn-warning)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>

        <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>

        {error?.message && (
          <details className="mb-4 text-left w-full max-w-md">
            <summary className="text-xs cursor-pointer hover:underline" style={{ color: 'var(--text-muted)' }}>
              Technical details
            </summary>
            <pre className="mt-2 p-2 text-xs rounded overflow-x-auto" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          {isTransient && onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary inline-flex items-center"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIErrorFallback;
