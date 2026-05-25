'use client';

import React from 'react';
import Link from 'next/link';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface StaffToolbarProps {
  courseId: string;
  onAddModule: () => void;
  onAddLearningItem: () => void;
  onAddAssignment: () => void;
}

export function StaffToolbar({
  courseId,
  onAddModule,
  onAddLearningItem,
  onAddAssignment,
}: StaffToolbarProps) {
  return (
    <section className="card">
      <div className="card-body flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--bg-overlay)' }}>
            <Cog6ToothIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Course staff tools</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage modules, learning items, assignments and members.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={onAddModule}>
            Manage modules
          </button>
          <button type="button" className="btn btn-primary" onClick={onAddLearningItem}>
            + Learning item
          </button>
          <button type="button" className="btn btn-primary" onClick={onAddAssignment}>
            + Assignment
          </button>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-secondary">
            Open gradebook
          </Link>
        </div>
      </div>
    </section>
  );
}
