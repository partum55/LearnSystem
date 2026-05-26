'use client';

import Link from 'next/link';
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PencilIcon,
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';
import type {
  AssignmentListItemDto,
  CourseModuleDto,
  LearningItemDto,
} from '@/features/courses/api/canonical.types';

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
  return (
    <div className="space-y-4">
      {canManageCourseContent && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAddModule}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Module</span>
          </button>
        </div>
      )}

      {modules.length === 0 ? (
        <EmptyState framed title="No modules yet" description="There are no active modules registered for this course." />
      ) : (
        modules.map((module) => (
          <article key={module.id} className="card">
            <div className="card-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Module {module.order}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{module.title}</h2>
                {module.description && (
                  <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--text-muted)' }}>
                    {module.description}
                  </p>
                )}
              </div>

              {canManageCourseContent && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge">{module.availabilityStatus || 'VISIBLE'}</span>
                  <IconButton title="Edit module" onClick={() => onEditModule(module)} icon={PencilIcon} />
                  <IconButton title="Delete module" onClick={() => onDeleteModule(module.id)} icon={TrashIcon} danger />
                  <button
                    type="button"
                    onClick={() => onAddLearningItem(module.id)}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add learning material</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddAssignment(module.id)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add assignment</span>
                  </button>
                </div>
              )}
            </div>

            <div className="card-body">
              <ModuleContentList
                module={module}
                courseId={courseId}
                canManageCourseContent={canManageCourseContent}
                onEditLearningItem={onEditLearningItem}
                onDeleteLearningItem={onDeleteLearningItem}
                onEditAssignment={onEditAssignment}
                onDeleteAssignment={onDeleteAssignment}
              />
            </div>
          </article>
        ))
      )}
    </div>
  );
}

type ModuleContentItem =
  | { kind: 'learning-item'; order: number; item: LearningItemDto }
  | { kind: 'assignment'; order: number; item: AssignmentListItemDto };

interface ModuleContentListProps {
  module: CourseModuleDto;
  courseId: string;
  canManageCourseContent: boolean;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (itemId: string) => void;
  onEditAssignment: (assignment: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}

function ModuleContentList({
  module,
  courseId,
  canManageCourseContent,
  onEditLearningItem,
  onDeleteLearningItem,
  onEditAssignment,
  onDeleteAssignment,
}: ModuleContentListProps) {
  const contents: ModuleContentItem[] = [
    ...module.learningItems.map((item) => ({ kind: 'learning-item' as const, order: item.order ?? 0, item })),
    ...module.assignments.map((item) => ({ kind: 'assignment' as const, order: item.order ?? 0, item })),
  ].sort((a, b) => a.order - b.order || (a.kind === 'learning-item' ? -1 : 1));

  if (contents.length === 0) {
    return <EmptyState title="No module contents" description="Materials and assignments will appear here." />;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        Module contents
      </h3>
      <div className="divide-y rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
        {contents.map((entry) =>
          entry.kind === 'learning-item' ? (
            <LearningItemRow
              key={`learning-${entry.item.id}`}
              item={entry.item}
              courseId={courseId}
              moduleId={module.id}
              canManageCourseContent={canManageCourseContent}
              onEditLearningItem={onEditLearningItem}
              onDeleteLearningItem={onDeleteLearningItem}
            />
          ) : (
            <AssignmentRow
              key={`assignment-${entry.item.id}`}
              assignment={entry.item}
              moduleId={module.id}
              canManageCourseContent={canManageCourseContent}
              onEditAssignment={onEditAssignment}
              onDeleteAssignment={onDeleteAssignment}
            />
          )
        )}
      </div>
    </section>
  );
}

function LearningItemRow({
  item,
  courseId,
  moduleId,
  canManageCourseContent,
  onEditLearningItem,
  onDeleteLearningItem,
}: {
  item: LearningItemDto;
  courseId: string;
  moduleId: string;
  canManageCourseContent: boolean;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (itemId: string) => void;
}) {
  const type = String(item.type).toUpperCase();
  const Icon = type === 'VIDEO' ? PlayCircleIcon : DocumentTextIcon;

  return (
    <div className="flex items-center gap-3 px-3 py-3 transition hover:bg-[var(--bg-overlay)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
        <Icon className="h-4.5 w-4.5" style={{ color: 'var(--text-muted)' }} />
      </div>
      <Link href={`/learning-items/${item.id}?courseId=${courseId}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>{type}</span>
          {item.visibilityStatus && <span className="badge">{item.visibilityStatus}</span>}
        </div>
      </Link>
      {canManageCourseContent && (
        <RowActions
          editTitle="Edit material"
          deleteTitle="Delete material"
          onEdit={() => onEditLearningItem(item, moduleId)}
          onDelete={() => onDeleteLearningItem(item.id)}
        />
      )}
    </div>
  );
}

function AssignmentRow({
  assignment,
  moduleId,
  canManageCourseContent,
  onEditAssignment,
  onDeleteAssignment,
}: {
  assignment: AssignmentListItemDto;
  moduleId: string;
  canManageCourseContent: boolean;
  onEditAssignment: (assignment: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}) {
  const type = String(assignment.type).replaceAll('_', ' ');

  return (
    <div className="flex items-center gap-3 px-3 py-3 transition hover:bg-[var(--bg-overlay)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
        <ClipboardDocumentListIcon className="h-4.5 w-4.5" style={{ color: 'var(--text-muted)' }} />
      </div>
      <Link href={`/assignments/${assignment.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{assignment.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>{type}</span>
          <span>{assignment.maxPoints} pts</span>
          {assignment.status && <span className="badge">{assignment.status}</span>}
        </div>
      </Link>
      {canManageCourseContent && (
        <RowActions
          editTitle="Edit assignment"
          deleteTitle="Delete assignment"
          onEdit={() => onEditAssignment(assignment, moduleId)}
          onDelete={() => onDeleteAssignment(assignment.id)}
        />
      )}
    </div>
  );
}

function RowActions({
  editTitle,
  deleteTitle,
  onEdit,
  onDelete,
}: {
  editTitle: string;
  deleteTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="ml-2 flex shrink-0 gap-1">
      <IconButton title={editTitle} onClick={onEdit} icon={PencilIcon} />
      <IconButton title={deleteTitle} onClick={onDelete} icon={TrashIcon} danger />
    </div>
  );
}

function IconButton({
  title,
  onClick,
  icon: Icon,
  danger,
}: {
  title: string;
  onClick: () => void;
  icon: typeof PencilIcon;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={danger
        ? 'rounded-md p-1 text-red-500 transition hover:bg-red-500/10'
        : 'rounded-md p-1 text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
