'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  ArrowDownTrayIcon,
  ChatBubbleOvalLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';
import { useUpdateGradebookCells } from '../hooks/useGradebookQueries';

interface ModuleDto {
  id: string;
  title: string;
}

interface FullGradebookProps {
  courseId: string;
  gradebook: TeacherGradebookDto;
  modules: ModuleDto[];
  initialAssignmentId?: string | null;
  onBackToOverview: () => void;
  onReleaseGrades: () => void;
  readOnly?: boolean;
}

interface UnsavedCellEdit {
  points: number;
  comment: string;
}

export function FullGradebook({
  courseId,
  gradebook,
  modules,
  initialAssignmentId = null,
  onBackToOverview,
  onReleaseGrades,
  readOnly = false,
}: FullGradebookProps) {
  const { students, assignments, grades } = gradebook;

  // Mutations
  const updateCellsMutation = useUpdateGradebookCells(courseId);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    initialAssignmentId || 'all'
  );

  // Spreadsheet Cell Editing State
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const [unsavedEdits, setUnsavedEdits] = useState<Record<string, UnsavedCellEdit>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [todoToast, setTodoToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Sync initial assignment filter if provided
  useEffect(() => {
    if (initialAssignmentId) {
      setSelectedAssignmentId(initialAssignmentId);
    }
  }, [initialAssignmentId]);

  // Toast Helper
  const showToast = useCallback((message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  }, []);

  // Sync selected cell inputs
  useEffect(() => {
    if (!selectedCell) {
      setEditPoints('');
      setEditComment('');
      setValidationError(null);
      return;
    }

    const { studentId, assignmentId } = selectedCell;
    const key = `${studentId}_${assignmentId}`;
    const unsaved = unsavedEdits[key];

    if (unsaved) {
      setEditPoints(String(unsaved.points));
      setEditComment(unsaved.comment);
    } else {
      const savedCell = grades.find(
        (g) => g.studentId === studentId && g.assignmentId === assignmentId
      );
      const initialPoints = savedCell?.draftPoints ?? savedCell?.publishedPoints;
      setEditPoints(initialPoints !== undefined && initialPoints !== null ? String(initialPoints) : '');
      setEditComment(savedCell?.comment ?? '');
    }
    setValidationError(null);
  }, [selectedCell, grades, unsavedEdits]);

  // Apply cell edit to memory
  const handleApplyEdit = () => {
    if (readOnly) return;
    if (!selectedCell) return;
    const currentSelectedAssignment = assignments.find((a) => a.id === selectedCell.assignmentId);
    if (!currentSelectedAssignment) return;

    const points = Number(editPoints);
    if (isNaN(points) || points < 0 || points > currentSelectedAssignment.maxPoints) {
      setValidationError(
        `Grade points must be a valid number between 0.00 and ${currentSelectedAssignment.maxPoints.toFixed(2)}.`
      );
      return;
    }

    const key = `${selectedCell.studentId}_${selectedCell.assignmentId}`;
    setUnsavedEdits((prev) => ({
      ...prev,
      [key]: { points, comment: editComment },
    }));

    setValidationError(null);
    setSelectedCell(null);
    showToast('Applied grade edit! Click "Save Local Changes" below to commit.');
  };

  // Discard single edit
  const handleDiscardSingleEdit = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.studentId}_${selectedCell.assignmentId}`;
    setUnsavedEdits((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setSelectedCell(null);
    showToast('Discarded local changes for this cell.');
  };

  // Submit bulk edits
  const handleSaveChanges = async () => {
    if (readOnly) return;
    const unsavedCount = Object.keys(unsavedEdits).length;
    if (unsavedCount === 0) return;
    try {
      const cellsRequest = Object.entries(unsavedEdits).map(([key, val]) => {
        const [studentId, assignmentId] = key.split('_');
        return {
          studentId,
          assignmentId,
          points: val.points,
          comment: val.comment || undefined,
        };
      });

      await updateCellsMutation.mutateAsync({ cells: cellsRequest });
      setUnsavedEdits({});
      setSelectedCell(null);
      showToast('Successfully saved all draft changes to server!');
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to save changes. Please try again.');
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();
      return s.displayName.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    });
  }, [students, searchTerm]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      if (selectedAssignmentId !== 'all' && asg.id !== selectedAssignmentId) {
        return false;
      }
      if (selectedModuleId !== 'all' && asg.moduleId !== selectedModuleId) {
        return false;
      }
      return true;
    });
  }, [assignments, selectedModuleId, selectedAssignmentId]);

  // Derive counts
  const unsavedCount = Object.keys(unsavedEdits).length;
  const currentSelectedAssignment = selectedCell
    ? assignments.find((a) => a.id === selectedCell.assignmentId)
    : null;
  const currentSelectedStudent = selectedCell
    ? students.find((s) => s.id === selectedCell.studentId)
    : null;

  // Export Excel action mockup
  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('Spreadsheet Export Complete! Downloading grade grid...');
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {readOnly && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-xs font-semibold text-[var(--text-secondary)]">
          This archived course gradebook is read-only.
        </div>
      )}

      {/* Navigation header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToOverview}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to grades</span>
          </button>
          <span className="text-lg font-bold text-[var(--text-primary)]">Full Spreadsheet Grid</span>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && unsavedCount > 0 && (
            <button
              onClick={handleSaveChanges}
              disabled={updateCellsMutation.isPending}
              className="btn btn-primary text-xs cursor-pointer"
            >
              {updateCellsMutation.isPending ? 'Saving...' : `Save Local Changes (${unsavedCount})`}
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          {!readOnly && (
            <button
              onClick={onReleaseGrades}
              className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckBadgeIcon className="h-4.5 w-4.5" />
              <span>Release Grades</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Controller (Filters) */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search student list */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search student profile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
          </div>

          {/* Module Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(e.target.value);
                setSelectedAssignmentId('all'); // Reset assignment filter when module changes
              }}
              className="input pr-9 text-xs cursor-pointer appearance-none"
            >
              <option value="all">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
          </div>

          {/* Assignment Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="input pr-9 text-xs cursor-pointer appearance-none"
            >
              <option value="all">All Assignments</option>
              {assignments
                .filter((a) => selectedModuleId === 'all' || a.moduleId === selectedModuleId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Warning Alert about Unsaved local state */}
      {!readOnly && unsavedCount > 0 && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">
          ⚠️ You have <strong>{unsavedCount}</strong> unsaved grade edits currently active. Click <strong>Save Local Changes</strong> to commit.
        </div>
      )}

      {/* Spreadsheet Grid Container */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-faint)]">No assignments found matching the active filters.</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-faint)]">No student profiles found matching the active search query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead>
                <tr className="bg-[var(--bg-base)] border-b border-[var(--border-default)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="sticky left-0 z-10 bg-[var(--bg-base)] px-5 py-3 border-r border-[var(--border-default)] w-[240px]">
                    Student Profile
                  </th>
                  {filteredAssignments.map((asg) => {
                    const moduleName = modules.find((m) => m.id === asg.moduleId)?.title || 'Unassigned';
                    return (
                      <th key={asg.id} className="px-4 py-3 border-r border-[var(--border-default)] w-[180px] align-top space-y-1">
                        <div className="text-[8px] text-[var(--text-faint)] truncate font-semibold uppercase">{moduleName}</div>
                        <div className="truncate text-xs text-[var(--text-primary)] font-bold" title={asg.title}>
                          {asg.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)] pt-0.5">
                          <span className="rounded bg-[var(--bg-overlay)] px-1 py-0.2 text-[8px] font-bold uppercase shrink-0">
                            {asg.type}
                          </span>
                          <span>Max: {asg.maxPoints}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[var(--bg-base)]/30 transition">
                    {/* Sticky Profile Cell */}
                    <td className="sticky left-0 z-10 bg-[var(--bg-surface)] px-5 py-3.5 border-r border-[var(--border-default)] font-semibold text-[var(--text-primary)] shadow-sm flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {student.displayName.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight text-[var(--text-primary)]" title={student.displayName}>
                          {student.displayName}
                        </p>
                        <p className="truncate text-[9px] text-[var(--text-faint)]" title={student.email || ''}>
                          {student.email || 'No email registered'}
                        </p>
                      </div>
                    </td>

                    {/* Dynamic Grade Cell Grid */}
                    {filteredAssignments.map((asg) => {
                      const grade = grades.find((g) => g.studentId === student.id && g.assignmentId === asg.id);
                      const key = `${student.id}_${asg.id}`;
                      const unsaved = unsavedEdits[key];
                      const isSelected = selectedCell?.studentId === student.id && selectedCell?.assignmentId === asg.id;

                      let cellPoints: number | null | undefined = undefined;
                      let isUnsaved = false;
                      let isDraft = false;
                      let hasComment = Boolean(grade?.comment);

                      if (unsaved) {
                        cellPoints = unsaved.points;
                        isUnsaved = true;
                        if (unsaved.comment) hasComment = true;
                      } else if (grade) {
                        cellPoints = grade.draftPoints !== null ? grade.draftPoints : grade.publishedPoints;
                        isDraft = grade.draftPoints !== null && grade.draftPoints !== grade.publishedPoints;
                      }

                      let displayVal = '-';
                      if (cellPoints !== null && cellPoints !== undefined) {
                        displayVal = cellPoints.toFixed(1);
                      }

                      // Visual styling matches Obsidian/LearnSystem dark themes
                      let cellStyle = 'border-r border-[var(--border-subtle)] transition relative ';
                      if (!readOnly) {
                        cellStyle += 'cursor-pointer hover:bg-[var(--bg-elevated)]/50 ';
                      }
                      if (isSelected) {
                        cellStyle += 'ring-2 ring-[var(--border-strong)] bg-[var(--bg-active)] ';
                      } else if (isUnsaved) {
                        cellStyle += 'bg-[var(--bg-elevated)] text-[var(--fn-warning)] font-bold border-2 border-[var(--border-strong)] ';
                      } else if (isDraft) {
                        cellStyle += 'bg-[var(--bg-base)] text-[var(--fn-warning)] font-medium ';
                      } else if (cellPoints !== undefined && cellPoints !== null) {
                        cellStyle += 'text-[var(--text-primary)] font-semibold ';
                      } else {
                        cellStyle += 'text-[var(--text-faint)] ';
                      }

                      return (
                        <td
                          key={asg.id}
                          onClick={() => {
                            if (!readOnly) setSelectedCell({ studentId: student.id, assignmentId: asg.id });
                          }}
                          className={cellStyle}
                        >
                          <div className="px-4 py-3 flex items-center justify-between gap-1 min-h-[46px]">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold tracking-tight">{displayVal}</span>
                              {cellPoints !== undefined && cellPoints !== null && (
                                <span className="text-[9px] text-[var(--text-faint)] block">
                                  / {asg.maxPoints}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                              {isUnsaved ? (
                                <span className="rounded px-1 text-[8px] font-bold uppercase tracking-wider text-[var(--fn-warning)] bg-[var(--bg-overlay)]">
                                  Local
                                </span>
                              ) : isDraft ? (
                                <span className="rounded px-1 text-[8px] font-bold uppercase tracking-wider text-[var(--fn-warning)] bg-[var(--bg-overlay)]">
                                  Draft
                                </span>
                              ) : cellPoints !== undefined && cellPoints !== null ? (
                                <span className="rounded px-1 text-[8px] font-bold uppercase tracking-wider text-[var(--fn-success)] bg-[var(--bg-overlay)]">
                                  Sent
                                </span>
                              ) : null}

                              {hasComment && (
                                <ChatBubbleOvalLeftIcon className="h-3.5 w-3.5 text-[var(--text-faint)]" title="Comment present" />
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Editor Drawer Drawer Panel */}
      {!readOnly && selectedCell && currentSelectedStudent && currentSelectedAssignment && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-5 shadow-lg max-w-2xl animate-fade-in space-y-4">
          <div className="flex items-start justify-between border-b border-[var(--border-default)] pb-3">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">SpeedGrader Spreadsheet Drawer</span>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                Score {currentSelectedStudent.displayName} for <span className="italic text-[var(--text-secondary)]">"{currentSelectedAssignment.title}"</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Grade input */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Grade Score (Max: {currentSelectedAssignment.maxPoints.toFixed(2)} pts)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={currentSelectedAssignment.maxPoints}
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  placeholder="0.0"
                  className="input pr-16 font-semibold text-xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-faint)]">
                  / {currentSelectedAssignment.maxPoints.toFixed(1)} pts
                </span>
              </div>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Instructor Comments / Feedback
              </label>
              <textarea
                rows={2}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Write feedback comments..."
                className="input min-h-16 resize-none text-xs"
              />
            </div>
          </div>

          {validationError && (
            <p className="rounded-lg border p-2 text-xs font-medium" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--fn-error)' }}>
              {validationError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-default)]/60">
            <button
              onClick={handleDiscardSingleEdit}
              className="cursor-pointer rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)]"
            >
              Discard Cell Edit
            </button>
            <button
              onClick={handleApplyEdit}
              className="btn btn-primary btn-sm text-xs cursor-pointer"
            >
              Apply to Grid
            </button>
          </div>
        </section>
      )}

      {/* Toast Notification Panel */}
      {todoToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border px-5 py-3.5 text-xs font-semibold shadow-2xl animate-fade-in" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          {todoToast}
        </div>
      )}
    </div>
  );
}
