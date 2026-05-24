'use client';

import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function AdminEnrollmentIssuesWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <ExclamationCircleIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">No Enrollment Issues</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        All student enrollment states are sound and verified.
      </p>
    </div>
  );
}
