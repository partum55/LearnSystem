'use client';

import { CalendarIcon } from '@heroicons/react/24/outline';

export default function TeacherDeadlinesWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <CalendarIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">No Upcoming Deadlines</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Create an assignment with a due date to see teacher deadlines here.
      </p>
    </div>
  );
}
