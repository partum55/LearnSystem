'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';
import { useUpdateGradebookCells } from '../hooks/useGradebookQueries';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
import { AiGenerationPreview } from '@/features/ai/components/AiGenerationPreview';
import { AiErrorDisplay } from '@/features/ai/components/AiErrorDisplay';

interface SpeedGraderProps {
  courseId: string;
  gradebook: TeacherGradebookDto;
  assignmentId: string;
  onBackToOverview: () => void;
  readOnly?: boolean;
}

interface UnsavedCellEdit {
  points: number;
  comment: string;
}

export function SpeedGrader({
  courseId,
  gradebook,
  assignmentId,
  onBackToOverview,
  readOnly = false,
}: SpeedGraderProps) {
  const { students, assignments, grades } = gradebook;

  // Mutations
  const updateCellsMutation = useUpdateGradebookCells(courseId);

  // Active Assignment
  const assignment = useMemo(() => {
    return assignments.find((a) => a.id === assignmentId);
  }, [assignments, assignmentId]);

  // Sidebar Student Search
  const [studentSearch, setStudentSearch] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Form State
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const [unsavedEdits, setUnsavedEdits] = useState<Record<string, UnsavedCellEdit>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [todoToast, setTodoToast] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const suggestGradeTask = useAiTask<{
    suggestedScore?: number;
    feedbackJson?: unknown;
    reasoningSummary?: string[];
    rubricBreakdown?: Array<{
      criterion?: string;
      suggestedPoints?: number;
      maxPoints?: number;
      comment?: string;
    }>;
  }>();

  // Select first student by default
  useEffect(() => {
    if (students.length > 0 && !activeStudentId) {
      setActiveStudentId(students[0].id);
    }
  }, [students, activeStudentId]);

  // Sync inputs when active student changes
  useEffect(() => {
    if (!activeStudentId) {
      setEditPoints('');
      setEditComment('');
      setValidationError(null);
      return;
    }

    const key = `${activeStudentId}_${assignmentId}`;
    const unsaved = unsavedEdits[key];

    if (unsaved) {
      setEditPoints(String(unsaved.points));
      setEditComment(unsaved.comment);
    } else {
      const savedCell = grades.find(
        (g) => g.studentId === activeStudentId && g.assignmentId === assignmentId
      );
      const initialPoints = savedCell?.draftPoints ?? savedCell?.publishedPoints;
      setEditPoints(initialPoints !== undefined && initialPoints !== null ? String(initialPoints) : '');
      setEditComment(savedCell?.comment ?? '');
    }
    setValidationError(null);
  }, [activeStudentId, assignmentId, grades, unsavedEdits]);

  // Toast Helper
  const showToast = useCallback((message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  }, []);

  // Filter students based on sidebar search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = studentSearch.toLowerCase();
      return s.displayName.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  // Locate active structures
  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === activeStudentId);
  }, [students, activeStudentId]);

  const activeGrade = useMemo(() => {
    return grades.find((g) => g.studentId === activeStudentId && g.assignmentId === assignmentId);
  }, [grades, activeStudentId, assignmentId]);

  // Student list traversal index
  const activeIndex = useMemo(() => {
    return filteredStudents.findIndex((s) => s.id === activeStudentId);
  }, [filteredStudents, activeStudentId]);

  // Apply inputs and save cell
  const handleSaveStudentGrade = async () => {
    if (readOnly) return;
    if (!activeStudentId || !assignment) return;

    const points = Number(editPoints);
    if (isNaN(points) || points < 0 || points > assignment.maxPoints) {
      setValidationError(
        `Grade points must be a valid number between 0.00 and ${assignment.maxPoints.toFixed(2)}.`
      );
      return;
    }

    try {
      // Direct write mutation for SpeedGrader (focused instant submit to draft)
      const request = {
        cells: [
          {
            studentId: activeStudentId,
            assignmentId: assignmentId,
            points,
            comment: editComment || undefined,
          },
        ],
      };

      await updateCellsMutation.mutateAsync(request);
      
      // Clear local unsaved edit tracking for this key
      const key = `${activeStudentId}_${assignmentId}`;
      setUnsavedEdits((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      setValidationError(null);
      showToast(`Saved evaluation draft for ${activeStudent?.displayName || 'student'}!`);
    } catch (err) {
      const error = err as { message?: string };
      setValidationError(error.message || 'Failed to save grade. Please check connectivity.');
    }
  };

  // Keep local draft edits as backup
  const handleLocalChange = (pts: string, cmt: string) => {
    if (readOnly) return;
    setEditPoints(pts);
    setEditComment(cmt);

    if (!activeStudentId) return;
    const key = `${activeStudentId}_${assignmentId}`;

    const points = Number(pts);
    if (!isNaN(points) && points >= 0 && points <= (assignment?.maxPoints || 100)) {
      setUnsavedEdits((prev) => ({
        ...prev,
        [key]: { points, comment: cmt },
      }));
    }
  };

  // Traversal triggers
  const handlePrevStudent = () => {
    if (activeIndex > 0) {
      setActiveStudentId(filteredStudents[activeIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (activeIndex < filteredStudents.length - 1) {
      setActiveStudentId(filteredStudents[activeIndex + 1].id);
    }
  };

  if (!assignment) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-faint)]">
        Could not resolve details for assignment "{assignmentId}".
      </div>
    );
  }

  // Calculate grading stats for this assignment
  const totalCount = students.length;
  const gradedCount = grades.filter(
    (g) =>
      g.assignmentId === assignmentId &&
      ((g.draftPoints !== null && g.draftPoints !== undefined) ||
        (g.publishedPoints !== null && g.publishedPoints !== undefined))
  ).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {readOnly && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-xs font-semibold text-[var(--text-secondary)]">
          This archived course is read-only. Grade edits and AI grading actions are disabled.
        </div>
      )}

      {/* Top Header Deck */}
      <header className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToOverview}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back to Overview</span>
            </button>
            <span className="badge">Focused Grading Deck</span>
            {readOnly && <span className="badge">READ ONLY</span>}
          </div>
          <h1 className="text-lg font-extrabold text-[var(--text-primary)] pt-1 truncate max-w-xl">
            SpeedGrader: <span className="text-[var(--text-secondary)] font-semibold">{assignment.title}</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-faint)] font-bold uppercase tracking-wider">
            <span>Type: {assignment.type}</span>
            <span>•</span>
            <span>Max Score: {assignment.maxPoints} pts</span>
            <span>•</span>
            <span>Progress: {gradedCount} / {totalCount} Graded</span>
          </div>
        </div>
      </header>

      {/* Main Split-Pane Workspace */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar Pane: Student Directory */}
        <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-xs space-y-4 flex flex-col h-[550px]">
          <div className="space-y-1.5 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Student Directory</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="input pl-8 text-[11px]"
              />
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-faint)]" />
            </div>
          </div>

          {/* Student scrolling stack */}
          <div className="overflow-y-auto divide-y divide-[var(--border-subtle)] pr-1 flex-1">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-[10px] text-[var(--text-faint)]">No profiles matched filters.</div>
            ) : (
              filteredStudents.map((student, sIdx) => {
                const sGrade = grades.find(
                  (g) => g.studentId === student.id && g.assignmentId === assignmentId
                );
                const isActive = student.id === activeStudentId;
                const hasSubmission = Boolean(sGrade?.submissionId);

                let statusBadge = 'Ungraded';
                let badgeClass = 'text-[var(--text-faint)]';

                if (sGrade) {
                  if (sGrade.draftPoints !== null && sGrade.draftPoints !== undefined && sGrade.draftPoints !== sGrade.publishedPoints) {
                    statusBadge = 'Draft';
                    badgeClass = 'text-[var(--fn-warning)] font-bold';
                  } else if (sGrade.publishedPoints !== null && sGrade.publishedPoints !== undefined) {
                    statusBadge = 'Graded';
                    badgeClass = 'text-[var(--fn-success)] font-bold';
                  } else if (hasSubmission) {
                    statusBadge = 'Submitted';
                    badgeClass = 'text-[var(--fn-warning)] font-bold';
                  } else if (sGrade.status === 'MISSING') {
                    statusBadge = 'Missing';
                    badgeClass = 'text-[var(--fn-error)] font-bold';
                  }
                }

                return (
                  <button
                    key={student.id}
                    onClick={() => setActiveStudentId(student.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition text-xs border ${
                      isActive
                        ? 'bg-[var(--bg-active)] border-[var(--border-strong)] font-bold text-[var(--text-primary)] shadow-2xs'
                        : 'border-transparent hover:bg-[var(--bg-base)]/50 text-[var(--text-secondary)]'
                    } cursor-pointer`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-xs leading-snug">{student.displayName}</p>
                      <p className="truncate text-[9px] text-[var(--text-faint)] mt-0.5">{student.email || 'No email'}</p>
                    </div>
                    <span className={`text-[8.5px] uppercase tracking-wider shrink-0 ${badgeClass}`}>
                      {statusBadge}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right/Center Pane: Focused Grading Deck */}
        <main className="lg:col-span-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs flex flex-col justify-between min-h-[550px]">
          {activeStudent ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Active Student Card Profile */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center font-bold text-sm uppercase shrink-0">
                      {activeStudent.displayName.substring(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-[var(--text-primary)]">{activeStudent.displayName}</h2>
                      <p className="text-[10px] text-[var(--text-faint)] font-medium leading-none mt-0.5">{activeStudent.email || 'No email registered'}</p>
                    </div>
                  </div>

                  {/* Submission detail reference card */}
                  <div className="text-right">
                    {activeGrade?.submissionId ? (
                      <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.8 text-[9px] font-bold text-[var(--fn-success)] uppercase tracking-wider">
                        ✓ Submitted Attachment Present
                      </span>
                    ) : (
                      <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.8 text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
                        No Submission Attachment
                      </span>
                    )}
                  </div>
                </div>

                {/* Grading Panel Form Card */}
                <div className="grid gap-6 sm:grid-cols-2 bg-[var(--bg-base)] p-5 border border-[var(--border-subtle)] rounded-xl">
                  {/* Left: Input Score */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Grade Points (Max: {assignment.maxPoints.toFixed(2)} pts)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={assignment.maxPoints}
                        value={editPoints}
                        onChange={(e) => handleLocalChange(e.target.value, editComment)}
                        readOnly={readOnly}
                        placeholder="0.0"
                        className="input pr-20 font-bold text-sm bg-[var(--bg-surface)] focus:ring-1 focus:ring-[var(--border-strong)]"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-faint)]">
                        / {assignment.maxPoints.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="text-[9px] text-[var(--text-faint)] leading-relaxed">
                      💡 Standard inputs are saved instantly as drafts on submit and released subsequently.
                    </div>
                  </div>

                  {/* Right: Comments */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Instructor Feedback Comments
                    </label>
                    <textarea
                      rows={4}
                      value={editComment}
                      onChange={(e) => handleLocalChange(editPoints, e.target.value)}
                      readOnly={readOnly}
                      placeholder="Type written notes or feedback details..."
                      className="input min-h-24 resize-none text-xs bg-[var(--bg-surface)] focus:ring-1 focus:ring-[var(--border-strong)]"
                    />
                  </div>
                </div>

                {/* Action Errors bounds */}
                {validationError && (
                  <p className="rounded-lg border p-2.5 text-xs font-semibold" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--fn-error)' }}>
                    ⚠️ {validationError}
                  </p>
                )}

                {!readOnly && showAiPanel && (
                  <AiFeatureGate compact>
                    <div className="rounded-lg border p-4 bg-[var(--bg-base)]">
                      <AiErrorDisplay error={suggestGradeTask.error} />
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold">AI Grade Suggestion</h4>
                        <button type="button" onClick={() => { setShowAiPanel(false); suggestGradeTask.reset(); }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                      </div>
                      
                      {!suggestGradeTask.data ? (
                        <>
                          <p className="text-xs text-[var(--text-secondary)] mb-3">
                            The AI will analyze the student's submission against the assignment instructions and suggest a grade and feedback.
                          </p>
                          <button 
                            type="button"
                            className="btn btn-primary btn-sm" 
                            onClick={async () => {
                              if (!activeGrade?.submissionId) {
                                setValidationError('Cannot suggest grade without a submission.');
                                return;
                              }
                              await suggestGradeTask.executeTask({
                                type: 'SUGGEST_GRADE',
                                context: { courseId },
                                input: { 
                                  assignmentId,
                                  studentId: activeStudentId,
                                  submissionId: activeGrade.submissionId,
                                }
                              });
                            }}
                            disabled={suggestGradeTask.isLoading || !activeGrade?.submissionId}
                          >
                            {suggestGradeTask.isLoading ? 'Analyzing...' : 'Analyze Submission & Suggest Grade'}
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3 mt-2">
                          <AiGenerationPreview
                            data={suggestGradeTask.data.output}
                            onAccept={() => {
                              const out = suggestGradeTask.data!.output;
                              const feedbackText = richContentToPlainText(out?.feedbackJson);
                              const nextPoints = out?.suggestedScore !== undefined ? String(out.suggestedScore) : editPoints;
                              const nextComment = feedbackText || editComment;
                              if (out?.suggestedScore !== undefined || feedbackText) {
                                handleLocalChange(nextPoints, nextComment);
                              }
                              setShowAiPanel(false);
                              suggestGradeTask.reset();
                            }}
                            onReject={() => { suggestGradeTask.reset(); }}
                          />
                        </div>
                      )}
                    </div>
                  </AiFeatureGate>
                )}
              </div>

              {/* Deck Navigation & Save Commands footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4 mt-6">
                {/* Previous/Next student navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevStudent}
                    disabled={activeIndex <= 0}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--bg-base)] text-[var(--text-secondary)] disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <span className="text-[10px] font-bold text-[var(--text-faint)] px-2">
                    Student {activeIndex + 1} of {filteredStudents.length}
                  </span>
                  <button
                    onClick={handleNextStudent}
                    disabled={activeIndex >= filteredStudents.length - 1}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--bg-base)] text-[var(--text-secondary)] disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>

                {!readOnly && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAiPanel((current) => !current)}
                      className="btn btn-secondary text-xs"
                    >
                      AI suggest grade
                    </button>
                    <button
                      onClick={handleSaveStudentGrade}
                      disabled={updateCellsMutation.isPending}
                      className="btn btn-primary text-xs flex items-center gap-1.5 self-end sm:self-center cursor-pointer"
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>{updateCellsMutation.isPending ? 'Saving...' : 'Submit Grade Draft'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[var(--text-faint)]">
              Select a student from the directory sidebar to start grading.
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Message */}
      {todoToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border px-5 py-3.5 text-xs font-semibold shadow-2xl animate-fade-in" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          {todoToast}
        </div>
      )}
    </div>
  );
}

function richContentToPlainText(document: unknown) {
  if (!document || typeof document !== 'object') return '';
  const blocks = (document as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return '';

  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return '';
      const data = (block as { data?: Record<string, unknown> }).data;
      if (!data) return '';
      const values = [data.text, data.content, data.caption]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      return values.join(' ');
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
