'use client';

import React from 'react';

interface CourseHeaderProps {
  courseId: string;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  moduleCount: number;
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
  teacherName,
  moduleCount,
  progress,
  courseRole,
}: CourseHeaderProps) {
  return (
    <header className="rounded-lg border p-5 md:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="badge">Course code: {courseCode(courseId)}</span>
            {courseRole && <span className="badge">{courseRole}</span>}
          </div>
          <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {description || 'No course description has been registered yet.'}
          </p>
        </div>

        <div className="grid min-w-72 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
          <Metric label="Instructor" value={teacherName || 'Faculty'} />
          <Metric label="Modules" value={String(moduleCount)} />
          <Metric label="Progress" value={`${progress ?? 0}%`} />
        </div>
      </div>
    </header>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
