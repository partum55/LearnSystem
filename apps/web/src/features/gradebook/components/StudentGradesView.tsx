'use client';

import Link from 'next/link';
import {
  AcademicCapIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import type { StudentGradebookDto } from '../api/gradebook.types';

interface StudentGradesViewProps {
  gradebook: StudentGradebookDto;
}

export function StudentGradesView({ gradebook }: StudentGradesViewProps) {
  const { total, modules, courseTitle } = gradebook;

  // Helper for assignment type badges
  const getTypeBadgeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'QUIZ':
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
      case 'VPL':
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  // Helper to determine score color
  const getScoreColorClass = (percentage: number | undefined | null) => {
    if (percentage === undefined || percentage === null) return 'text-[var(--text-muted)] bg-[var(--bg-elevated)]';
    if (percentage >= 90) return 'text-[var(--fn-success)] bg-[var(--bg-elevated)]';
    if (percentage >= 75) return 'text-[var(--text-primary)] bg-[var(--bg-elevated)]';
    if (percentage >= 60) return 'text-[var(--fn-warning)] bg-[var(--bg-elevated)]';
    return 'text-[var(--fn-error)] bg-[var(--bg-elevated)]';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Course Scorecard Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Score */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between transition hover:border-[var(--border-strong)]">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
              Course Total Score
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                {total.points.toFixed(1)}
              </span>
              <span className="text-sm text-[var(--text-faint)] font-medium">
                / {total.maxPoints.toFixed(1)} pts
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] shrink-0">
            <AcademicCapIcon className="h-6 w-6 text-[var(--text-secondary)]" />
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between transition hover:border-[var(--border-strong)]">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
              Progress Percentage
            </span>
            <span className="text-3xl font-extrabold text-[var(--text-primary)] block">
              {total.percentage !== undefined && total.percentage !== null
                ? `${Math.round(total.percentage)}%`
                : `${Math.round((total.points / (total.maxPoints || 1)) * 100)}%`}
            </span>
          </div>
          <div className={`rounded-xl p-3 shrink-0 border ${getScoreColorClass(
            total.percentage !== undefined && total.percentage !== null
              ? total.percentage
              : (total.points / (total.maxPoints || 1)) * 100
          )}`}>
            <CheckBadgeIcon className="h-6 w-6" />
          </div>
        </div>

        {/* Enrolled Course */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between transition hover:border-[var(--border-strong)]">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
              Course Enrolled
            </span>
            <span className="text-base font-bold text-[var(--text-primary)] block truncate max-w-[200px]" title={courseTitle}>
              {courseTitle}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] shrink-0">
            <BookOpenIcon className="h-6 w-6 text-[var(--text-secondary)]" />
          </div>
        </div>
      </div>

      {/* Modules and Submissions breakdown list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Module Breakdown</h2>
          <span className="text-xs text-[var(--text-muted)] font-semibold">
            {modules.length} {modules.length === 1 ? 'Module' : 'Modules'}
          </span>
        </div>

        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center text-xs text-[var(--text-faint)]">
            No published academic module records found for this course.
          </div>
        ) : (
          <div className="space-y-6">
            {modules.map((mod) => (
              <div
                key={mod.moduleId}
                className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs transition hover:border-[var(--border-strong)]"
              >
                {/* Module Header block */}
                <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {mod.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wide">Module Total:</span>
                    <span className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                      {mod.total.points.toFixed(1)} / {mod.total.maxPoints.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Assignment items list */}
                {mod.assignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-faint)]">
                    No assignments published inside this module.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {mod.assignments.map((assignment) => (
                      <div
                        key={assignment.assignmentId}
                        className="p-5 space-y-3 hover:bg-[var(--bg-base)]/20 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <Link
                                href={`/assignments/${assignment.assignmentId}`}
                                className="text-xs font-bold text-[var(--text-primary)] hover:underline"
                              >
                                {assignment.title}
                              </Link>
                              <span className={`rounded-md border px-2 py-0.2 text-[8px] font-bold tracking-wide uppercase ${getTypeBadgeColor(
                                assignment.type
                              )}`}>
                                {assignment.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                              <span>Status:</span>
                              <span className="font-bold uppercase text-[var(--text-secondary)] text-[9px]">
                                {assignment.status?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Individual Assignment score badge */}
                          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                            <div className="text-right">
                              <span className="block text-[8px] uppercase font-bold text-[var(--text-faint)] tracking-wide leading-none">
                                Grade Points
                              </span>
                              <div className="flex items-baseline gap-0.5 mt-0.5 leading-none">
                                <span className="text-sm font-extrabold text-[var(--text-primary)]">
                                  {assignment.points !== undefined && assignment.points !== null
                                    ? assignment.points.toFixed(1)
                                    : '-'}
                                </span>
                                <span className="text-[10px] text-[var(--text-faint)] font-semibold">
                                  / {assignment.maxPoints.toFixed(1)}
                                </span>
                              </div>
                            </div>

                            {assignment.points !== undefined && assignment.points !== null && (
                              <div className={`h-8 w-11 rounded-lg border font-extrabold text-[10px] flex items-center justify-center shrink-0 ${getScoreColorClass(
                                (assignment.points / (assignment.maxPoints || 1)) * 100
                              )}`}>
                                {Math.round((assignment.points / (assignment.maxPoints || 1)) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Comment text block from instructor */}
                        {assignment.comment && (
                          <div className="rounded-lg border border-[var(--border-subtle)] p-3.5 space-y-1 bg-[var(--bg-base)]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)] flex items-center gap-1.5 leading-none">
                              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                              <span>Instructor Feedback</span>
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed whitespace-pre-wrap">
                              "{assignment.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
