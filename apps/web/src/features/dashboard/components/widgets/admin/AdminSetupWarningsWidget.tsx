'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AdminSetupWarningsWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <ExclamationTriangleIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">All Setup Validated</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        No course configurations or global settings require attention.
      </p>
    </div>
  );
}
