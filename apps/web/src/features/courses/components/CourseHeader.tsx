'use client';

import React from 'react';

interface CourseHeaderProps {
  courseId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  courseRole?: string | null;
}

function courseCode(courseId: string) {
  return courseId.slice(0, 8).toUpperCase();
}

export function CourseHeader({
  courseId,
  title,
  description,
  status,
  progress,
  courseRole,
}: CourseHeaderProps) {
  const progressValue = Math.max(0, Math.min(100, progress ?? 0));
  const normalizedStatus = String(status || 'DRAFT').toUpperCase();

  return (
    <header className="rounded-lg border px-5 py-5 md:px-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="max-w-4xl">
        <div className="flex flex-wrap gap-2">
          <span className="badge">Course code: {courseCode(courseId)}</span>
          <span className={statusBadgeClass(normalizedStatus)}>{normalizedStatus}</span>
          {courseRole && <span className="badge">{courseRole}</span>}
        </div>
        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
          {description || 'No course description has been registered yet.'}
        </p>
        <div className="mt-5 max-w-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
            <span>Progress</span>
            <span>{progressValue}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progressValue}%`, background: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'badge badge-success';
    case 'ARCHIVED':
      return 'badge';
    default:
      return 'badge badge-warning';
  }
}
