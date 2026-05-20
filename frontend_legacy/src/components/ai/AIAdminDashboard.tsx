import React from 'react';
import { useAIUsageSummary, useAIUsageStats, useTopAIUsers } from '../../queries/useAIUsageQueries';

/**
 * Admin dashboard for AI service monitoring.
 */
export const AIAdminDashboard: React.FC = () => {
  const { data: summary, isLoading: summaryLoading } = useAIUsageSummary();
  const { data: stats, isLoading: statsLoading } = useAIUsageStats();
  const { data: topUsers, isLoading: topUsersLoading } = useTopAIUsers(5);

  const isLoading = summaryLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg h-24" style={{ background: 'var(--bg-surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        AI Service Dashboard
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Requests"
          value={summary?.totalRequests.toLocaleString() || '0'}
          subtitle={`${summary?.totalFailedRequests || 0} failed`}
        />
        <SummaryCard
          title="Total Tokens"
          value={summary?.totalTokens.toLocaleString() || '0'}
          subtitle={`${summary?.averageTokensPerRequest.toFixed(0) || 0} avg/request`}
        />
        <SummaryCard
          title="Active Users"
          value={summary?.activeUsers.toString() || '0'}
          subtitle={`Period: ${summary?.period || 'N/A'}`}
        />
        <SummaryCard
          title="Avg Latency"
          value={`${summary?.averageLatencyMs.toFixed(0) || 0}ms`}
          subtitle="Response time"
        />
      </div>

      {/* Success Rate */}
      {stats && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Success Rate
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full rounded-full h-4" style={{ background: 'var(--bg-overlay)' }}>
                <div
                  className="h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats.successRate}%`, background: 'var(--fn-success)' }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--fn-success)' }}>
              {stats.successRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Provider Stats
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    Provider
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    Failures
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                    Avg Latency
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byProvider).map(([provider, data]) => (
                  <tr key={provider} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-4 py-3 text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                      {provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-muted)' }}>
                      {data.tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span style={{ color: data.failures > 0 ? 'var(--fn-error)' : 'var(--text-muted)' }}>
                        {data.failures}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-muted)' }}>
                      {data.avgLatencyMs.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Users */}
      {!topUsersLoading && topUsers && topUsers.length > 0 && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Top Users by Token Usage
          </h3>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
                    {index + 1}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {user.userId}
                  </span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {user.totalTokens.toLocaleString()} tokens
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latency Percentiles */}
      {stats && (
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Response Time Percentiles
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <LatencyCard label="Avg" value={stats.avgLatencyMs} />
            <LatencyCard label="P50" value={stats.p50LatencyMs} />
            <LatencyCard label="P95" value={stats.p95LatencyMs} />
            <LatencyCard label="P99" value={stats.p99LatencyMs} />
          </div>
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>
    </div>
  );
};

interface LatencyCardProps {
  label: string;
  value: number;
}

const LatencyCard: React.FC<LatencyCardProps> = ({ label, value }) => {
  const getColor = (ms: number) => {
    if (ms < 1000) return 'var(--fn-success)';
    if (ms < 3000) return 'var(--fn-warning)';
    return 'var(--fn-error)';
  };

  return (
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
      <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: getColor(value) }}>
        {value.toFixed(0)}ms
      </p>
    </div>
  );
};

export default AIAdminDashboard;
