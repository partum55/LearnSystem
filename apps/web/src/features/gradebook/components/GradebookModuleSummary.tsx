'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';
import { GradebookAssignmentActions } from './GradebookAssignmentActions';

interface ModuleDto {
  id: string;
  title: string;
}

interface GradebookModuleSummaryProps {
  module: ModuleDto;
  gradebook: TeacherGradebookDto;
  onOpenFullGradebook: (assignmentId: string) => void;
  onOpenSpeedGrader: (assignmentId: string) => void;
}

export function GradebookModuleSummary({
  module,
  gradebook,
  onOpenFullGradebook,
  onOpenSpeedGrader,
}: GradebookModuleSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { assignments, grades, students } = gradebook;

  // Filter assignments belonging to this module
  const moduleAssignments = assignments.filter((asg) => asg.moduleId === module.id);

  if (moduleAssignments.length === 0) {
    return null;
  }

  // Calculate statistics for each assignment in this module
  const assignmentStats = moduleAssignments.map((asg) => {
    const assignmentGrades = grades.filter((g) => g.assignmentId === asg.id);
    const studentCount = students.length;

    // Graded count: either draft points or published points exist
    const gradedCount = assignmentGrades.filter(
      (g) =>
        (g.draftPoints !== null && g.draftPoints !== undefined) ||
        (g.publishedPoints !== null && g.publishedPoints !== undefined)
    ).length;

    // Needs Grading: student submitted but neither draft nor published points exist
    const needsGradingCount = assignmentGrades.filter(
      (g) =>
        g.submissionId &&
        (g.draftPoints === null || g.draftPoints === undefined) &&
        (g.publishedPoints === null || g.publishedPoints === undefined)
    ).length;

    // Missing submissions (marked explicitly)
    const missingCount = assignmentGrades.filter((g) => g.status === 'MISSING').length;

    // Unpublished/Draft count
    const draftCount = assignmentGrades.filter(
      (g) => g.draftPoints !== null && g.draftPoints !== undefined && g.draftPoints !== g.publishedPoints
    ).length;

    // Class average score (based on published points, fallback to draft)
    const scoredGrades = assignmentGrades.filter(
      (g) =>
        g.publishedPoints !== null && g.publishedPoints !== undefined ||
        g.draftPoints !== null && g.draftPoints !== undefined
    );
    
    const sum = scoredGrades.reduce((acc, g) => {
      const pts = g.publishedPoints !== null && g.publishedPoints !== undefined ? g.publishedPoints : (g.draftPoints || 0);
      return acc + pts;
    }, 0);
    const averageScore = scoredGrades.length > 0 ? (sum / scoredGrades.length).toFixed(1) : '-';

    return {
      ...asg,
      gradedCount,
      needsGradingCount,
      missingCount,
      draftCount,
      averageScore,
      studentCount,
    };
  });

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-[var(--bg-base)] px-5 py-4 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{module.title}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-bold text-[var(--text-secondary)]">
            {moduleAssignments.length} {moduleAssignments.length === 1 ? 'Assignment' : 'Assignments'}
          </span>
        </div>
        <div className="text-[var(--text-secondary)]">
          {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </div>
      </button>

      {/* Grid of assignment cards */}
      {isExpanded && (
        <div className="p-5 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {assignmentStats.map((asg) => (
            <div
              key={asg.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 flex flex-col justify-between gap-4 transition hover:border-[var(--border-strong)] shadow-2xs hover:shadow-xs relative"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.2 text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                      {asg.type}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[200px]" title={asg.title}>
                      {asg.title}
                    </h4>
                  </div>
                  <GradebookAssignmentActions
                    assignmentId={asg.id}
                    onOpenFullGradebook={() => onOpenFullGradebook(asg.id)}
                    onOpenSpeedGrader={() => onOpenSpeedGrader(asg.id)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-[var(--text-faint)] font-medium">
                  <span>Max: {asg.maxPoints} pts</span>
                  {asg.dueDate && (
                    <>
                      <span>•</span>
                      <span>Due: {new Date(asg.dueDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stat breakdown bars */}
              <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[var(--text-secondary)]">Graded Status</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {asg.gradedCount} / {asg.studentCount}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="bg-[var(--text-primary)] h-1.5 rounded-full"
                    style={{ width: `${(asg.gradedCount / (asg.studentCount || 1)) * 100}%` }}
                  />
                </div>

                {/* Sub-status badges */}
                <div className="flex items-center justify-between flex-wrap gap-1 text-[9px] pt-1">
                  <div className="flex items-center gap-1.5">
                    {asg.needsGradingCount > 0 && (
                      <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--fn-warning)]">
                        Needs grading: {asg.needsGradingCount}
                      </span>
                    )}
                    {asg.draftCount > 0 && (
                      <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--fn-warning)]">
                        Drafts: {asg.draftCount}
                      </span>
                    )}
                    {asg.missingCount > 0 && (
                      <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--fn-error)]">
                        Missing: {asg.missingCount}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] uppercase font-bold text-[var(--text-faint)] block tracking-wide">
                      Class Avg
                    </span>
                    <span className="font-bold text-[var(--text-primary)] block mt-0.2">
                      {asg.averageScore} {asg.averageScore !== '-' && '/ ' + asg.maxPoints}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
