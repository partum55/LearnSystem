import React from 'react';

interface AiGenerationPreviewProps {
  data: unknown;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
}

export const AiGenerationPreview: React.FC<AiGenerationPreviewProps> = ({ 
  data, 
  onAccept, 
  onReject, 
  isAccepting = false 
}) => {
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden my-4 shadow-sm">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Generated Draft
        </h3>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Review before saving</span>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
        <button
          onClick={onReject}
          disabled={isAccepting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Discard
        </button>
        <button
          onClick={onAccept}
          disabled={isAccepting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
        >
          {isAccepting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Accept & Save'
          )}
        </button>
      </div>
    </div>
  );
};
