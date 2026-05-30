'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
  ListBulletIcon,
  DocumentTextIcon,
  FilmIcon,
  LinkIcon,
  PaperClipIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  CodeBracketIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type {
  AssignmentListItemDto,
  CourseModuleDto,
  LearningItemDto,
} from '@/features/courses/api/canonical.types';

interface CourseOutlineSidebarProps {
  courseId: string;
  modules: CourseModuleDto[];
}

type OutlineEntry =
  | { kind: 'material'; order: number; item: LearningItemDto }
  | { kind: 'assignment'; order: number; item: AssignmentListItemDto };

const COLLAPSE_KEY = 'course-outline:collapsed';

export function CourseOutlineSidebar({ courseId, modules }: CourseOutlineSidebarProps) {
  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules]
  );

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Restore the collapsed preference once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  // Default every module to expanded as they arrive (without clobbering user toggles).
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const mod of sortedModules) {
        if (!(mod.id in next)) next[mod.id] = true;
      }
      return next;
    });
  }, [sortedModules]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const toggleModule = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (collapsed) {
    return (
      <aside className="sticky top-6 hidden self-start lg:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show course outline"
          aria-label="Show course outline"
          className="flex h-10 w-10 items-center justify-center rounded-lg border text-[var(--text-muted)] transition hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="sticky top-6 hidden w-[264px] shrink-0 flex-col self-start overflow-hidden rounded-lg border lg:flex"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface)',
        maxHeight: 'calc(100vh - 3rem)',
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2.5"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <ListBulletIcon className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Course outline
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Hide course outline"
          aria-label="Hide course outline"
          className="ml-auto grid h-6 w-6 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
        >
          <ChevronDoubleRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {sortedModules.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-[var(--text-faint)]">
            No modules yet. They will appear here once added.
          </p>
        ) : (
          sortedModules.map((mod) => {
            const entries: OutlineEntry[] = [
              ...mod.learningItems.map((item) => ({ kind: 'material' as const, order: item.order, item })),
              ...mod.assignments.map((item) => ({ kind: 'assignment' as const, order: item.order, item })),
            ].sort((a, b) => a.order - b.order);
            const isOpen = expanded[mod.id] ?? true;

            return (
              <div key={mod.id} className="px-1.5">
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition hover:bg-[var(--bg-active)]"
                >
                  {isOpen ? (
                    <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                  ) : (
                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
                    {mod.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--text-faint)]">
                    {entries.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="mb-1 ml-2.5 flex flex-col border-l pl-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                    {entries.length === 0 ? (
                      <span className="px-2 py-1.5 text-[11px] text-[var(--text-faint)]">Empty module</span>
                    ) : (
                      entries.map((entry) =>
                        entry.kind === 'material' ? (
                          <OutlineLink
                            key={`m-${entry.item.id}`}
                            href={`/learning-items/${entry.item.id}?courseId=${courseId}`}
                            icon={materialIcon(entry.item.type)}
                            title={entry.item.title}
                            muted={isHidden(entry.item.visibilityStatus)}
                          />
                        ) : (
                          <OutlineLink
                            key={`a-${entry.item.id}`}
                            href={`/assignments/${entry.item.id}`}
                            icon={assignmentIcon(entry.item.type)}
                            title={entry.item.title}
                            muted={entry.item.status === 'DRAFT' || entry.item.status === 'HIDDEN'}
                            trailing={
                              <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-[var(--text-faint)]">
                                {entry.item.maxPoints}p
                              </span>
                            }
                          />
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <ChevronDoubleLeftIcon className="h-3.5 w-3.5" />
        Collapse outline
      </button>
    </aside>
  );
}

function OutlineLink({
  href,
  icon: Icon,
  title,
  muted = false,
  trailing,
}: {
  href: string;
  icon: typeof DocumentTextIcon;
  title: string;
  muted?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-[var(--bg-active)]"
      title={title}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)] group-hover:text-[var(--accent)]" />
      <span
        className="min-w-0 flex-1 truncate text-[12px]"
        style={{ color: muted ? 'var(--text-faint)' : 'var(--text-secondary)' }}
      >
        {title}
      </span>
      {muted && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--status-draft, var(--fn-warning))' }} />
      )}
      {trailing}
    </Link>
  );
}

function isHidden(status: string) {
  return status === 'HIDDEN' || status === 'ARCHIVED' || status === 'LOCKED';
}

function materialIcon(type: string) {
  switch (type) {
    case 'VIDEO':
      return FilmIcon;
    case 'LINK':
      return LinkIcon;
    case 'FILE':
    case 'PDF':
      return PaperClipIcon;
    default:
      return DocumentTextIcon;
  }
}

function assignmentIcon(type: string) {
  switch (type) {
    case 'QUIZ':
    case 'FORM':
      return ClipboardDocumentCheckIcon;
    case 'FILE_SUBMISSION':
      return PaperClipIcon;
    case 'TEXT_SUBMISSION':
      return PencilSquareIcon;
    case 'VPL':
      return CodeBracketIcon;
    case 'SEMINAR':
      return UserGroupIcon;
    default:
      return ClipboardDocumentCheckIcon;
  }
}
