'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FilmIcon,
  LinkIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import type {
  AssignmentListItemDto,
  CourseModuleDto,
  LearningItemDto,
} from '@/features/courses/api/canonical.types';
import { StatusBadge } from './CoursesPage';

interface ModulesPanelProps {
  modules: CourseModuleDto[];
  courseId: string;
  canManageCourseContent: boolean;
  onEditModule: (module: CourseModuleDto) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLearningItem: (moduleId: string) => void;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (itemId: string) => void;
  onAddAssignment: (moduleId: string) => void;
  onEditAssignment: (assignment: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onAddModule: () => void;
}

export function ModulesPanel({
  modules,
  courseId,
  canManageCourseContent,
  onEditModule,
  onDeleteModule,
  onAddLearningItem,
  onEditLearningItem,
  onDeleteLearningItem,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onAddModule,
}: ModulesPanelProps) {
  if (modules.length === 0) {
    return (
      <div>
        {canManageCourseContent && (
          <div className="flex justify-end mb-3">
            <button type="button" onClick={onAddModule} className="btn btn-primary btn-sm">
              <PlusIcon className="h-3.5 w-3.5" />
              Add module
            </button>
          </div>
        )}
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h4>No modules yet</h4>
            <p>Modules organise your course into a sequence of learning materials and assignments.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-faint)' }}
        >
          {modules.length} module{modules.length !== 1 ? 's' : ''} · one continuous content order
        </span>
        {canManageCourseContent && (
          <button type="button" onClick={onAddModule} className="btn btn-secondary btn-sm">
            <PlusIcon className="h-3.5 w-3.5" />
            Add module
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {modules.map((module, idx) => (
          <ModuleCard
            key={module.id}
            module={module}
            idx={idx}
            courseId={courseId}
            canManageCourseContent={canManageCourseContent}
            onEditModule={onEditModule}
            onDeleteModule={onDeleteModule}
            onAddLearningItem={onAddLearningItem}
            onEditLearningItem={onEditLearningItem}
            onDeleteLearningItem={onDeleteLearningItem}
            onAddAssignment={onAddAssignment}
            onEditAssignment={onEditAssignment}
            onDeleteAssignment={onDeleteAssignment}
          />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  idx,
  courseId,
  canManageCourseContent,
  onEditModule,
  onDeleteModule,
  onAddLearningItem,
  onEditLearningItem,
  onDeleteLearningItem,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: {
  module: CourseModuleDto;
  idx: number;
  courseId: string;
  canManageCourseContent: boolean;
  onEditModule: (m: CourseModuleDto) => void;
  onDeleteModule: (id: string) => void;
  onAddLearningItem: (moduleId: string) => void;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (id: string) => void;
  onAddAssignment: (moduleId: string) => void;
  onEditAssignment: (a: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const learningItems = [...module.learningItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const assignments = [...module.assignments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const itemCount = learningItems.length + assignments.length;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Module header */}
      <div
        className="flex items-center gap-2.5"
        style={{
          padding: '12px 15px',
          borderBottom: open ? '1px solid var(--border-subtle)' : 'none',
        }}
      >
        <button
          type="button"
          className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-faint)' }}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse module' : 'Expand module'}
        >
          {open
            ? <ChevronDownIcon className="h-4 w-4" />
            : <ChevronRightIcon className="h-4 w-4" />}
        </button>

        <span
          className="flex-shrink-0 tabular-nums text-[12px]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', width: 22 }}
        >
          {String(idx + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold" style={{ fontSize: 14, letterSpacing: '-0.01em' }}>
              {module.title}
            </span>
            {module.availabilityStatus && module.availabilityStatus !== 'VISIBLE' && (
              <StatusBadge status={module.availabilityStatus} />
            )}
          </div>
          {module.description && (
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {module.description}
            </p>
          )}
        </div>

        <span
          className="flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px]"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </span>

        {canManageCourseContent && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-md p-1 transition-colors hover:bg-[var(--bg-overlay)]"
              style={{ color: 'var(--text-muted)' }}
              title="Edit module"
              onClick={() => onEditModule(module)}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-500/10"
              title="Delete module"
              onClick={() => onDeleteModule(module.id)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Module body */}
      {open && (
        <div style={{ padding: '4px 15px 10px' }}>
          {/* Learning materials */}
          {learningItems.length > 0 && (
            <div>
              <div
                className="py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Learning material
              </div>
              {learningItems.map((item) => (
                <LearningItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  moduleId={module.id}
                  canManageCourseContent={canManageCourseContent}
                  onEdit={onEditLearningItem}
                  onDelete={onDeleteLearningItem}
                />
              ))}
            </div>
          )}

          {/* Assignments */}
          {assignments.length > 0 && (
            <div>
              <div
                className="py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: 'var(--text-faint)' }}
              >
                Assignments
              </div>
              {assignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  moduleId={module.id}
                  canManageCourseContent={canManageCourseContent}
                  onEdit={onEditAssignment}
                  onDelete={onDeleteAssignment}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {itemCount === 0 && !canManageCourseContent && (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No content added yet.
            </p>
          )}

          {/* Add actions */}
          {canManageCourseContent && (
            <div
              className="flex flex-wrap gap-2 pt-3"
              style={{ borderTop: '1px solid var(--border-subtle)', marginTop: itemCount > 0 ? 4 : 0 }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onAddLearningItem(module.id)}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add material
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onAddAssignment(module.id)}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add assignment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LearningItemRow({
  item,
  courseId,
  moduleId,
  canManageCourseContent,
  onEdit,
  onDelete,
}: {
  item: LearningItemDto;
  courseId: string;
  moduleId: string;
  canManageCourseContent: boolean;
  onEdit: (item: LearningItemDto, moduleId: string) => void;
  onDelete: (id: string) => void;
}) {
  const type = String(item.type).toUpperCase();
  const Icon = learningItemIcon(type);
  const isHidden = item.visibilityStatus === 'HIDDEN' || item.visibilityStatus === 'LOCKED';

  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        padding: '8px 0',
        borderTop: '1px solid var(--border-subtle)',
        opacity: isHidden ? 0.6 : 1,
      }}
    >
      {/* Type icon */}
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      {/* Title + meta */}
      <Link href={`/learning-items/${item.id}?courseId=${courseId}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium">{item.title}</span>
          {isHidden && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--status-arch)' }}
            >
              Hidden
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-faint)' }}>
          <span>{type.replace('_', ' ')}</span>
        </div>
      </Link>

      {/* Actions */}
      {canManageCourseContent && (
        <div className="ml-2 flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded-md p-1 transition-colors hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}
            title="Edit"
            onClick={() => onEdit(item, moduleId)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-500/10"
            title="Delete"
            onClick={() => onDelete(item.id)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AssignmentRow({
  assignment,
  moduleId,
  canManageCourseContent,
  onEdit,
  onDelete,
}: {
  assignment: AssignmentListItemDto;
  moduleId: string;
  canManageCourseContent: boolean;
  onEdit: (a: AssignmentListItemDto, moduleId: string) => void;
  onDelete: (id: string) => void;
}) {
  const type = String(assignment.type).toUpperCase();

  return (
    <div
      className="flex items-center gap-2.5"
      style={{ padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      {/* Type icon — accent for assignments */}
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border"
        style={{ borderColor: 'var(--accent-line)', background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
      </span>

      {/* Title + meta */}
      <Link href={`/assignments/${assignment.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium">{assignment.title}</span>
          {assignment.dueDate && (
            <span
              className="text-[11px] font-semibold"
              style={{ color: 'var(--status-draft)', fontFamily: 'var(--font-mono)' }}
            >
              {formatDue(assignment.dueDate)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-faint)' }}>
          <span>{type.replace('_', ' ')}</span>
        </div>
      </Link>

      {/* Points badge */}
      {assignment.maxPoints > 0 && (
        <span className="points-badge flex-shrink-0">{assignment.maxPoints} pts</span>
      )}

      {/* Actions */}
      {canManageCourseContent && (
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded-md p-1 transition-colors hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}
            title="Edit"
            onClick={() => onEdit(assignment, moduleId)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-red-400 transition-colors hover:bg-red-500/10"
            title="Delete"
            onClick={() => onDelete(assignment.id)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function learningItemIcon(type: string) {
  switch (type) {
    case 'VIDEO': return FilmIcon;
    case 'LINK': return LinkIcon;
    case 'FILE': return PaperClipIcon;
    case 'QUIZ': return ClipboardDocumentCheckIcon;
    default: return DocumentTextIcon;
  }
}

function formatDue(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
