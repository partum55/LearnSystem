'use client';

import { useServicesHealth } from '@/features/admin/hooks/useAdminMonitoring';
import { ServerIcon } from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';

export default function AdminSystemHealthWidget() {
  const { data: health, isLoading, error } = useServicesHealth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loading label="Probing services..." />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <ServerIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
        <h3 className="text-sm font-medium">Health Unavailable</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Gateway admin health endpoint did not respond.
        </p>
      </div>
    );
  }

  const services = health.services ?? [];

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded border p-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Total</p>
          <p className="mt-0.5 text-base font-semibold">{health.totalServices}</p>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Healthy</p>
          <p className="mt-0.5 text-base font-semibold" style={{ color: 'var(--fn-success)' }}>
            {health.healthyServices}
          </p>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Issues</p>
          <p className="mt-0.5 text-base font-semibold" style={{ color: health.unhealthyServices > 0 ? 'var(--fn-error)' : 'var(--fn-success)' }}>
            {health.unhealthyServices}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {services.slice(0, 4).map((service) => {
          const isUp = service.status === 'UP';
          return (
            <div
              key={service.instanceId}
              className="flex items-center justify-between gap-4 rounded-md border px-3 py-1.5"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{service.serviceName}</p>
                <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {service.host}:{service.port}
                </p>
              </div>
              <span className={`badge ${isUp ? 'badge-success' : 'badge-error'} text-[10px] py-0.5 px-1.5`}>
                {service.status.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
