'use client';

import { Suspense } from 'react';
import { StudentGradebookPage } from '@/features/gradebook/components/StudentGradebookPage';
import { Loading } from '@/components/Loading';

export default function StudentGradebookRoute() {
  return (
    <Suspense fallback={<Loading label="Loading student gradebook records..." />}>
      <StudentGradebookPage />
    </Suspense>
  );
}
