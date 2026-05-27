'use client';

import React from 'react';
import {
  AcademicCapIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ListBulletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { CourseDraft } from '@/features/ai/hooks/useCreateCourseFromDraft';

interface GeneratedCoursePreviewProps {
  draft: CourseDraft;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
}

export function GeneratedCoursePreview({
  draft,
  onAccept,
  onReject,
  isAccepting = false,
}: GeneratedCoursePreviewProps) {
  const modules = draft.modules ?? [];
  const materialCount = modules.reduce((sum, module) => sum + (module.learningItems?.length ?? 0), 0);
  const assignmentCount = modules.reduce((sum, module) => sum + (module.assignments?.length ?? 0), 0);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--text-muted)]">
              <AcademicCapIcon className="h-4 w-4" />
              Draft course preview
            </div>
            <div>
              <h3 className="break-words text-2xl font-semibold text-[var(--text-primary)]">
                {draft.course.title || 'Untitled course'}
              </h3>
              <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                {draft.course.code || 'NO-CODE'}
              </p>
            </div>
            {draft.course.description && (
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                {draft.course.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-72">
            <Stat label="Modules" value={modules.length} />
            <Stat label="Materials" value={materialCount} />
            <Stat label="Assignments" value={assignmentCount} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {modules.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[var(--text-muted)]">
            No modules were generated. Try a more specific course topic.
          </div>
        ) : (
          modules
            .slice()
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .map((module, index) => (
              <article key={`${module.title}-${index}`} className="px-5 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-muted)]">
                      <BookOpenIcon className="h-4 w-4" />
                      Module {module.orderIndex ?? index + 1}
                    </div>
                    <h4 className="mt-1 break-words text-lg font-semibold text-[var(--text-primary)]">
                      {module.title || `Module ${index + 1}`}
                    </h4>
                    {module.description && (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {module.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <PreviewList
                    title="Learning materials"
                    icon={<DocumentTextIcon className="h-4 w-4" />}
                    empty="No materials generated for this module."
                    items={(module.learningItems ?? []).map((item) => ({
                      title: item.title,
                      meta: normalizeType(item.type),
                    }))}
                  />
                  <PreviewList
                    title="Assignments"
                    icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
                    empty="No assignments generated for this module."
                    items={(module.assignments ?? []).map((assignment) => ({
                      title: assignment.title,
                      meta: [
                        normalizeType(assignment.type),
                        typeof assignment.points === 'number' ? `${assignment.points} pts` : null,
                      ].filter(Boolean).join(' · '),
                    }))}
                  />
                </div>
              </article>
            ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Creating this course keeps generated content as draft content. Nothing is published automatically.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onReject}
            disabled={isAccepting}
            className="btn btn-secondary"
          >
            <XMarkIcon className="h-4 w-4" />
            Start over
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isAccepting || modules.length === 0}
            className="btn btn-primary"
          >
            <CheckCircleIcon className="h-4 w-4" />
            {isAccepting ? 'Creating...' : 'Create draft course'}
          </button>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function PreviewList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ title?: string; meta?: string }>;
  empty: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`} className="flex gap-2 rounded-md bg-[var(--surface)] p-2">
              <ListBulletIcon className="mt-0.5 h-4 w-4 flex-none text-[var(--text-muted)]" />
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--text-primary)]">
                  {item.title || `Item ${index + 1}`}
                </p>
                {item.meta && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.meta}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function normalizeType(type?: string) {
  if (!type) return 'Draft';
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
