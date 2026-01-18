import React from 'react';
import { useMyAIUsage, useRemainingQuota } from '../../queries/useAIUsageQueries';

interface AIUsageMeterProps {
  userId: string;
  showDetails?: boolean;
}

/**
 * Component showing current user's AI usage and remaining quota.
 */
export const AIUsageMeter: React.FC<AIUsageMeterProps> = ({
  userId,
  showDetails = false
}) => {
  const { data: usage, isLoading: usageLoading } = useMyAIUsage();
  const { data: remaining, isLoading: remainingLoading } = useRemainingQuota(userId);

  const isLoading = usageLoading || remainingLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <p className="text-sm text-green-700 dark:text-green-300">
          No AI usage this period
        </p>
      </div>
    );
  }

  const totalLimit = (remaining || 0) + usage.totalTokens;
  const percentUsed = totalLimit > 0 ? (usage.totalTokens / totalLimit) * 100 : 0;
  const isNearLimit = percentUsed > 80;
  const isOverLimit = percentUsed >= 100;

  const progressColor = isOverLimit
    ? 'bg-red-500'
    : isNearLimit
      ? 'bg-yellow-500'
      : 'bg-blue-500';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          AI Usage This Month
        </h4>
        <span className={`text-xs font-semibold ${
          isOverLimit ? 'text-red-600 dark:text-red-400' : 
          isNearLimit ? 'text-yellow-600 dark:text-yellow-400' : 
          'text-blue-600 dark:text-blue-400'
        }`}>
          {percentUsed.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Token counts */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{usage.totalTokens.toLocaleString()} tokens used</span>
        <span>{(remaining || 0).toLocaleString()} remaining</span>
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Requests</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {usage.requestCount}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Failed</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {usage.failedRequestCount}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Prompt Tokens</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {usage.promptTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Completion Tokens</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {usage.completionTokens.toLocaleString()}
              </p>
            </div>
          </div>

          {usage.estimatedCostUsd > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">Estimated Cost</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                ${usage.estimatedCostUsd.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warning message */}
      {isNearLimit && !isOverLimit && (
        <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ You're approaching your monthly AI usage limit
        </p>
      )}
      {isOverLimit && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          🚫 You've reached your monthly AI usage limit
        </p>
      )}
    </div>
  );
};

export default AIUsageMeter;

