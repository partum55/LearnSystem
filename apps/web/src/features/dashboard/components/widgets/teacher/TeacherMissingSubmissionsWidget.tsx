'use client';

import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function TeacherMissingSubmissionsWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <ExclamationCircleIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">No Missing Submissions</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        No students have missed recent assignment deadlines.
      </p>
    </div>
  );
}
