'use client';

import { useState } from 'react';
import {
  TableCellsIcon,
  CheckBadgeIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';
import { GradebookStatsCards } from './GradebookStatsCards';
import { GradebookModuleSummary } from './GradebookModuleSummary';

interface ModuleDto {
  id: string;
  title: string;
}

interface GradebookOverviewProps {
  courseId: string;
  gradebook: TeacherGradebookDto;
  modules: ModuleDto[];
  courseRole: string | null;
  onOpenFullGradebook: (assignmentId?: string) => void;
  onOpenSpeedGrader: (assignmentId: string) => void;
  onReleaseGrades: () => void;
  readOnly?: boolean;
}

export function GradebookOverview({
  gradebook,
  modules,
  courseRole,
  onOpenFullGradebook,
  onOpenSpeedGrader,
  onReleaseGrades,
  readOnly = false,
}: GradebookOverviewProps) {
  const { students, assignments, grades } = gradebook;
  const [exporting, setExporting] = useState(false);

  // Identify student grades that need review/grading
  const needsGradingList = grades
    .filter(
      (g) =>
        g.submissionId &&
        (g.draftPoints === null || g.draftPoints === undefined) &&
        (g.publishedPoints === null || g.publishedPoints === undefined)
    )
    .map((g) => {
      const student = students.find((s) => s.id === g.studentId);
      const assignment = assignments.find((a) => a.id === g.assignmentId);
      return {
        ...g,
        studentName: student?.displayName || 'Unknown Student',
        studentEmail: student?.email || '',
        assignmentTitle: assignment?.title || 'Unknown Assignment',
        assignmentType: assignment?.type || 'FILE_SUBMISSION',
      };
    });

  // Export excel helper mockup
  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('Excel export initiated! Downloading spreadsheet file...');
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header controls section */}
      <header className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge">
              {courseRole ?? 'STAFF'} AREA
            </span>
            {readOnly && <span className="badge">READ ONLY</span>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Gradebook Overview
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">
            {readOnly
              ? 'Review archived course grades and student progress without changing records.'
              : 'Evaluate and grade students. Review general progress, release drafts to students, or jump into the Excel-like spreadsheet.'}
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          
          {!readOnly && (
            <button
              onClick={onReleaseGrades}
              className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckBadgeIcon className="h-4.5 w-4.5 text-[var(--text-secondary)]" />
              <span>Release Grades</span>
            </button>
          )}

          <button
            onClick={() => onOpenFullGradebook()}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <TableCellsIcon className="h-4.5 w-4.5" />
            <span>Open Full Gradebook</span>
          </button>
        </div>
      </header>

      {/* Statistics Scorecards */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Course Grade Stats</h2>
        <GradebookStatsCards gradebook={gradebook} />
      </section>

      {/* Needs Grading Checklist (Quick Action panel) */}
      {needsGradingList.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-5 py-4 flex items-center gap-2.5">
            <DocumentCheckIcon className="h-4.5 w-4.5 text-[var(--fn-warning)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Pending Submissions ({needsGradingList.length})</h3>
              <p className="text-[10px] text-[var(--text-faint)] mt-0.5">Students waiting for evaluations. Click any to launch focused grading.</p>
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {needsGradingList.map((item) => (
              <div
                key={`${item.studentId}_${item.assignmentId}`}
                onClick={() => {
                  if (!readOnly) onOpenSpeedGrader(item.assignmentId);
                }}
                className="px-5 py-3 hover:bg-[var(--bg-base)]/50 transition cursor-pointer flex items-center justify-between text-xs"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <p className="font-bold text-[var(--text-primary)] truncate">{item.studentName}</p>
                  <p className="text-[10px] text-[var(--text-faint)] truncate">{item.studentEmail}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.2 text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                      {item.assignmentType}
                    </span>
                    <p className="font-semibold text-[var(--text-secondary)] mt-0.5 truncate max-w-[200px]" title={item.assignmentTitle}>
                      {item.assignmentTitle}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="rounded-lg border border-[var(--border-subtle)] p-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)] transition text-[var(--text-secondary)]">
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Module summaries section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Module Summaries</h2>
        
        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-10 text-center text-xs text-[var(--text-faint)]">
            No course modules found. Ensure modules and assignments are created first.
          </div>
        ) : (
          <div className="space-y-5">
            {modules.map((mod) => (
              <GradebookModuleSummary
                key={mod.id}
                module={mod}
                gradebook={gradebook}
                onOpenFullGradebook={onOpenFullGradebook}
                onOpenSpeedGrader={onOpenSpeedGrader}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
