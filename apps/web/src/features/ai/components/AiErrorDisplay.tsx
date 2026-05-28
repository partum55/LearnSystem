import React from 'react';
import { ApiError } from '@/api/client';

interface AiErrorDisplayProps {
  error: ApiError | null;
}

const AI_ERROR_MESSAGES: Record<string, string> = {
  AI_PROVIDER_RATE_LIMITED: 'Gemini rate limit reached. Wait and try again later, or use another Gemini API key.',
  AI_PROVIDER_AUTH_FAILED: 'Gemini API key is invalid or revoked.',
  AI_PROVIDER_UNAVAILABLE: 'Gemini is temporarily unavailable.',
  AI_OUTPUT_INVALID: 'AI returned an invalid draft. Try regenerating.',
  AI_KEY_REQUIRED: 'Add your Gemini API key in Profile → AI Settings.',
};

export const aiErrorMessage = (error: ApiError | null | undefined) => {
  if (!error) return '';
  if (error.code && AI_ERROR_MESSAGES[error.code]) {
    return AI_ERROR_MESSAGES[error.code];
  }
  return error.message || 'AI request failed.';
};

export const AiErrorDisplay: React.FC<AiErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  const message = aiErrorMessage(error);

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg my-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            AI Generation Failed
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>{message}</p>
            {error.code && (
              <p className="mt-2 text-xs font-semibold opacity-80">
                Code: {error.code}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
