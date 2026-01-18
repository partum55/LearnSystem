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
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        AI Service Dashboard
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Requests"
          value={summary?.totalRequests.toLocaleString() || '0'}
          subtitle={`${summary?.totalFailedRequests || 0} failed`}
          color="blue"
        />
        <SummaryCard
          title="Total Tokens"
          value={summary?.totalTokens.toLocaleString() || '0'}
          subtitle={`${summary?.averageTokensPerRequest.toFixed(0) || 0} avg/request`}
          color="green"
        />
        <SummaryCard
          title="Active Users"
          value={summary?.activeUsers.toString() || '0'}
          subtitle={`Period: ${summary?.period || 'N/A'}`}
          color="purple"
        />
        <SummaryCard
          title="Avg Latency"
          value={`${summary?.averageLatencyMs.toFixed(0) || 0}ms`}
          subtitle="Response time"
          color="yellow"
        />
      </div>

      {/* Success Rate */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Success Rate
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.successRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Provider Stats
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Failures
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Avg Latency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(stats.byProvider).map(([provider, data]) => (
                  <tr key={provider}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                      {data.tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={data.failures > 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}>
                        {data.failures}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Users by Token Usage
          </h3>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {user.userId}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {user.totalTokens.toLocaleString()} tokens
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latency Percentiles */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
};

interface LatencyCardProps {
  label: string;
  value: number;
}

const LatencyCard: React.FC<LatencyCardProps> = ({ label, value }) => {
  const getColor = (ms: number) => {
    if (ms < 1000) return 'text-green-600 dark:text-green-400';
    if (ms < 3000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
      <p className={`text-xl font-bold mt-1 ${getColor(value)}`}>
        {value.toFixed(0)}ms
      </p>
    </div>
  );
};

export default AIAdminDashboard;

