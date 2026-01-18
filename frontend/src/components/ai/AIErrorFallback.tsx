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
    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
      <div className="flex flex-col items-center text-center">
        {/* AI Robot Icon */}
        <div className="w-16 h-16 mb-4 flex items-center justify-center bg-amber-100 dark:bg-amber-800 rounded-full">
          <svg
            className="w-8 h-8 text-amber-600 dark:text-amber-300"
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

        <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
          {title}
        </h3>

        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4 max-w-md">
          {description}
        </p>

        {error?.message && (
          <details className="mb-4 text-left w-full max-w-md">
            <summary className="text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline">
              Technical details
            </summary>
            <pre className="mt-2 p-2 text-xs bg-amber-100 dark:bg-amber-900/50 rounded overflow-x-auto">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          {isTransient && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-200 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIErrorFallback;

