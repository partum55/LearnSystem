import React from 'react';

interface AILoadingStateProps {
  message?: string;
  progress?: number;
  stage?: string;
}

/**
 * AI-specific loading state with progress indicator.
 * Shows animated loading state during AI content generation.
 */
export const AILoadingState: React.FC<AILoadingStateProps> = ({
  message = 'AI is generating content...',
  progress,
  stage,
}) => {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
      <div className="flex flex-col items-center text-center">
        {/* Animated AI Icon */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>

        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          {message}
        </p>

        {stage && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
            {stage}
          </p>
        )}

        {progress !== undefined && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-blue-500 dark:text-blue-400">
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};

export default AILoadingState;

