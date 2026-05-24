'use client';

import { MegaphoneIcon } from '@heroicons/react/24/outline';

export default function StudentAnnouncementsWidget() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <MegaphoneIcon className="h-8 w-8 text-stone-400 dark:text-stone-600 mb-2" />
      <h3 className="text-sm font-medium">No Announcements</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Announcements from your instructors will appear here.
      </p>
    </div>
  );
}
