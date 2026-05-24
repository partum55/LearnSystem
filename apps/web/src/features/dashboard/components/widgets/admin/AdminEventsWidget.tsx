'use client';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function AdminEventsWidget() {
  return (
    <div className="flex h-full items-center justify-center gap-3 p-4 text-center">
      <ShieldCheckIcon className="h-6 w-6 text-stone-400 dark:text-stone-600" />
      <div>
        <h3 className="text-sm font-medium">Recent Admin Events</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          System event logs and audit records are running in clean diagnostic mode.
        </p>
      </div>
    </div>
  );
}
