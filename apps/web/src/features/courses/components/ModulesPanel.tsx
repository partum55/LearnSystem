'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
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
                onAddLearningItem={onAddLearningItem}
                onEditAssignment={onEditAssignment}
                onDeleteAssignment={onDeleteAssignment}
                onAddAssignment={onAddAssignment}
              />
            </div>
          </article>
        ))
      )}
    </div>
  );
}

interface ModuleContentListProps {
  module: CourseModuleDto;
  courseId: string;
  canManageCourseContent: boolean;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (itemId: string) => void;
  onAddLearningItem: (moduleId: string) => void;
  onEditAssignment: (assignment: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onAddAssignment: (moduleId: string) => void;
}

function ModuleContentList({
  module,
  courseId,
  canManageCourseContent,
  onEditLearningItem,
  onDeleteLearningItem,
  onAddLearningItem,
  onEditAssignment,
  onDeleteAssignment,
  onAddAssignment,
}: ModuleContentListProps) {
  const learningItems = [...module.learningItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const assignments = [...module.assignments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (learningItems.length === 0 && assignments.length === 0 && !canManageCourseContent) {
    return <EmptyState title="No module contents" description="Materials and assignments will appear here." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ContentGroup
        title="Learning materials"
        count={learningItems.length}
        emptyTitle="No learning materials"
        emptyDescription="Add readings, links, videos, files, or lesson pages for this module."
        action={canManageCourseContent ? (
          <button
            type="button"
            onClick={() => onAddLearningItem(module.id)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add material</span>
          </button>
        ) : null}
      >
        {learningItems.map((item) => (
            <LearningItemRow
              key={item.id}
              item={item}
              courseId={courseId}
              moduleId={module.id}
              canManageCourseContent={canManageCourseContent}
              onEditLearningItem={onEditLearningItem}
              onDeleteLearningItem={onDeleteLearningItem}
            />
        ))}
      </ContentGroup>

      <ContentGroup
        title="Assignments"
        count={assignments.length}
        emptyTitle="No assignments"
        emptyDescription="Add graded tasks, quizzes, VPL labs, or submission activities."
        action={canManageCourseContent ? (
          <button
            type="button"
            onClick={() => onAddAssignment(module.id)}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add assignment</span>
          </button>
        ) : null}
      >
        {assignments.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              moduleId={module.id}
              canManageCourseContent={canManageCourseContent}
              onEditAssignment={onEditAssignment}
              onDeleteAssignment={onDeleteAssignment}
            />
        ))}
      </ContentGroup>
    </div>
  );
}

function ContentGroup({
  title,
  count,
  emptyTitle,
  emptyDescription,
  action,
  children,
}: {
  title: string;
  count: number;
  emptyTitle: string;
  emptyDescription: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            {title}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{count} item{count === 1 ? '' : 's'}</p>
        </div>
        {action}
      </div>
      {count > 0 ? (
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {children}
        </div>
      ) : (
        <div className="p-3">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
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
