'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function TeacherRecentSubmissionsWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <ArrowPathIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">No Recent Submissions</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        New submissions from your students will appear here.
      </p>
    </div>
  );
}
