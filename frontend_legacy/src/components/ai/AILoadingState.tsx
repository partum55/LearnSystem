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
    <div className="p-6 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div className="flex flex-col items-center text-center">
        {/* Animated AI Icon */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full animate-pulse" style={{ border: '4px solid var(--border-default)' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 animate-bounce"
              style={{ color: 'var(--text-primary)' }}
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

        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>

        {stage && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {stage}
          </p>
        )}

        {progress !== undefined && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, background: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};

export default AILoadingState;
