'use client';

import React from 'react';
import Link from 'next/link';
import { EmptyState } from './EmptyState';
import { StudentGradesView } from '@/features/gradebook/components/StudentGradesView';
import type { StudentGradebookDto } from '@/features/gradebook/api/gradebook.types';

interface GradesPanelProps {
  courseId: string;
  isCourseStaff: boolean;
  gradebook?: StudentGradebookDto;
}

export function GradesPanel({
  courseId,
  isCourseStaff,
  gradebook,
}: GradesPanelProps) {
  if (isCourseStaff) {
    return (
      <section className="card">
        <div className="card-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Teacher gradebook</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Review students, draft points, and publish grades from the course gradebook.
            </p>
          </div>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-primary">
            Open gradebook
          </Link>
        </div>
      </section>
    );
  }

  if (!gradebook || !gradebook.modules || gradebook.modules.length === 0) {
    return <EmptyState framed title="No grades yet" description="Published grades will appear here after assignments are reviewed." />;
  }

  return <StudentGradesView gradebook={gradebook} />;
}
