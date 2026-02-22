import React from 'react';
import { SystemHealth } from '../../api/admin';
import { Loading } from '../../components/Loading';
import { formatDate } from './adminDashboardTypes';

interface AdminServicesTabProps {
  servicesLoading: boolean;
  systemHealth: SystemHealth | null;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({
  servicesLoading,
  systemHealth,
}) => (
  <div className="space-y-4">
    {servicesLoading && !systemHealth ? (
      <Loading />
    ) : (
      <>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Overall', value: systemHealth?.overallStatus ?? 'UNKNOWN' },
            { label: 'Total services', value: systemHealth?.totalServices ?? 0 },
            { label: 'Healthy', value: systemHealth?.healthyServices ?? 0, color: 'var(--fn-success)' },
            { label: 'Unhealthy', value: systemHealth?.unhealthyServices ?? 0, color: 'var(--fn-error)' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-lg font-semibold mt-0.5" style={{ fontFamily: 'var(--font-display)', color: stat.color || 'var(--text-primary)' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="table-container rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Instance</th>
                <th>Status</th>
                <th>Host</th>
                <th>Port</th>
              </tr>
            </thead>
            <tbody>
              {(systemHealth?.services ?? []).map((service) => (
                <tr key={`${service.serviceName}-${service.instanceId}-${service.host}-${service.port}`}>
                  <td style={{ color: 'var(--text-primary)' }}>{service.serviceName}</td>
                  <td>{service.instanceId}</td>
                  <td>{service.status}</td>
                  <td>{service.host}</td>
                  <td>{service.port}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right text-xs" style={{ color: 'var(--text-faint)' }}>
          Updated: {formatDate(systemHealth?.timestamp)}
        </div>
      </>
    )}
  </div>
);
