'use client';

import { DocumentCheckIcon } from '@heroicons/react/24/outline';

export default function TeacherNeedsGradingWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <DocumentCheckIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">All Caught Up</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        No submissions are currently waiting for grading.
      </p>
    </div>
  );
}
