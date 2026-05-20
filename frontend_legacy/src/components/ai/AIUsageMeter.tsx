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
      <div className="animate-pulse rounded-lg p-4" style={{ background: 'var(--bg-surface)' }}>
        <div className="h-4 rounded w-24 mb-2" style={{ background: 'var(--bg-overlay)' }}></div>
        <div className="h-2 rounded w-full" style={{ background: 'var(--bg-overlay)' }}></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="rounded-lg p-4" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
        <p className="text-sm" style={{ color: 'var(--fn-success)' }}>
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
    ? 'var(--fn-error)'
    : isNearLimit
      ? 'var(--fn-warning)'
      : 'var(--text-primary)';

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          AI Usage This Month
        </h4>
        <span className="text-xs font-semibold" style={{
          color: isOverLimit ? 'var(--fn-error)' : isNearLimit ? 'var(--fn-warning)' : 'var(--text-secondary)'
        }}>
          {percentUsed.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-2 mb-3" style={{ background: 'var(--bg-overlay)' }}>
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentUsed, 100)}%`, background: progressColor }}
        />
      </div>

      {/* Token counts */}
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{usage.totalTokens.toLocaleString()} tokens used</span>
        <span>{(remaining || 0).toLocaleString()} remaining</span>
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Requests</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage.requestCount}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Failed</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage.failedRequestCount}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Prompt Tokens</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage.promptTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }}>Completion Tokens</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {usage.completionTokens.toLocaleString()}
              </p>
            </div>
          </div>

          {usage.estimatedCostUsd > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Estimated Cost</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                ${usage.estimatedCostUsd.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warning message */}
      {isNearLimit && !isOverLimit && (
        <p className="mt-3 text-xs" style={{ color: 'var(--fn-warning)' }}>
          You're approaching your monthly AI usage limit
        </p>
      )}
      {isOverLimit && (
        <p className="mt-3 text-xs" style={{ color: 'var(--fn-error)' }}>
          You've reached your monthly AI usage limit
        </p>
      )}
    </div>
  );
};

export default AIUsageMeter;
