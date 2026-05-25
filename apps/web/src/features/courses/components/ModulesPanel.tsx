'use client';

import React from 'react';
import Link from 'next/link';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';
import type {
  CourseModuleDto,
  LearningItemDto,
  AssignmentListItemDto,
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
  if (modules.length === 0) {
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
        <EmptyState framed title="No modules yet" description="There are no active modules registered for this course." />
      </div>
    );
  }

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
      {modules.map((module) => (
        <article key={module.id} className="card">
          <div className="card-header flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Module {module.order}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{module.title}</h2>
                {module.description && <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{module.description}</p>}
              </div>
              {canManageCourseContent && (
                <div className="flex gap-1 ml-4 mt-5">
                  <button
                    onClick={() => onEditModule(module)}
                    className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    title="Edit Module"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteModule(module.id)}
                    className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                    title="Delete Module"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {canManageCourseContent && <span className="badge">{module.availabilityStatus || 'VISIBLE'}</span>}
          </div>

          <div className="card-body grid gap-6 lg:grid-cols-2">
            <ModuleColumn
              title="Learning materials"
              count={module.learningItems.length}
              isCourseStaff={canManageCourseContent}
              onAddClick={() => onAddLearningItem(module.id)}
            >
              {module.learningItems.length > 0 ? (
                module.learningItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:bg-[var(--bg-overlay)]"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                  >
                    <Link href={`/learning-items/${item.id}?courseId=${courseId}`} className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.description || String(item.type).toUpperCase()}
                      </p>
                    </Link>
                    {canManageCourseContent && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onEditLearningItem(item, module.id);
                          }}
                          className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition cursor-pointer"
                          title="Edit Material"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onDeleteLearningItem(item.id);
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete Material"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title="No learning items" description="Materials will appear here." />
              )}
            </ModuleColumn>

            <ModuleColumn
              title="Assignments"
              count={module.assignments.length}
              isCourseStaff={canManageCourseContent}
              onAddClick={() => onAddAssignment(module.id)}
            >
              {module.assignments.length > 0 ? (
                module.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="group relative flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:bg-[var(--bg-overlay)]"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                  >
                    <Link href={`/assignments/${assignment.id}`} className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{assignment.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {String(assignment.type).replaceAll('_', ' ')} · {assignment.maxPoints} pts
                          </p>
                        </div>
                        <span className="badge">{assignment.grade?.points ?? assignment.status}</span>
                      </div>
                    </Link>
                    {canManageCourseContent && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onEditAssignment(assignment, module.id);
                          }}
                          className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition cursor-pointer"
                          title="Edit Assignment"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onDeleteAssignment(assignment.id);
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete Assignment"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title="No assignments" description="Assignments will appear here." />
              )}
            </ModuleColumn>
          </div>
        </article>
      ))}
    </div>
  );
}

interface ModuleColumnProps {
  title: string;
  count: number;
  onAddClick?: () => void;
  isCourseStaff?: boolean;
  children: React.ReactNode;
}

function ModuleColumn({
  title,
  count,
  onAddClick,
  isCourseStaff,
  children,
}: ModuleColumnProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)]" style={{ color: 'var(--text-muted)' }}>{count}</span>
        </div>
        {isCourseStaff && onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
