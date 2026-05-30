'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';
import { useUpdateGradebookCells } from '../hooks/useGradebookQueries';
import { useSubmissionReview } from '@/features/assignments/hooks/useAssignmentQueries';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
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

type GradeRow = TeacherGradebookDto['grades'][number];

type CellState = 'graded' | 'draft' | 'submitted' | 'ungraded' | 'missing';

function cellState(grade: GradeRow | undefined): CellState {
  if (!grade) return 'ungraded';
  if (grade.draftPoints !== null && grade.draftPoints !== undefined && grade.draftPoints !== grade.publishedPoints) {
    return 'draft';
  }
  if (grade.publishedPoints !== null && grade.publishedPoints !== undefined) return 'graded';
  if (grade.status === 'MISSING') return 'missing';
  if (grade.submissionId) return 'submitted';
  return 'ungraded';
}

const STATE_DOT_COLOR: Record<CellState, string> = {
  graded: 'var(--accent)',
  draft: 'var(--fn-warning)',
  submitted: 'var(--fn-info)',
  ungraded: 'var(--text-faint)',
  missing: 'var(--fn-error)',
};

function StatusDot({ state }: { state: CellState }) {
  return (
    <span
      className="shrink-0 rounded-full"
      style={{ width: 7, height: 7, background: STATE_DOT_COLOR[state] }}
    />
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function letterGrade(pct: number): string {
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A−';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B−';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C−';
  if (pct >= 60) return 'D';
  return 'F';
}

/** Best-effort extraction of readable text from a stored submission content object. */
function submissionToText(content: unknown): string {
  if (!content || typeof content !== 'object') {
    return typeof content === 'string' ? content : '';
  }
  const record = content as Record<string, unknown>;

  if (typeof record.text === 'string') return record.text;

  if (Array.isArray(record.blocks)) {
    return record.blocks
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        const data = (block as { data?: Record<string, unknown> }).data;
        if (!data) return '';
        return [data.text, data.content, data.caption]
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .join(' ');
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  return '';
}

export function SpeedGrader({
  courseId,
  gradebook,
  assignmentId,
  onBackToOverview,
  readOnly = false,
}: SpeedGraderProps) {
  const { students, assignments, grades } = gradebook;

  const updateCellsMutation = useUpdateGradebookCells(courseId);

  const assignment = useMemo(() => assignments.find((a) => a.id === assignmentId), [assignments, assignmentId]);

  const [filter, setFilter] = useState<'all' | 'ungraded' | 'graded'>('all');
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const [unsavedEdits, setUnsavedEdits] = useState<Record<string, UnsavedCellEdit>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Select first student by default
  useEffect(() => {
    if (students.length > 0 && !activeStudentId) {
      setActiveStudentId(students[0].id);
    }
  }, [students, activeStudentId]);

  const gradeFor = useCallback(
    (studentId: string) => grades.find((g) => g.studentId === studentId && g.assignmentId === assignmentId),
    [grades, assignmentId]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (filter === 'all') return true;
      const state = cellState(gradeFor(student.id));
      if (filter === 'graded') return state === 'graded' || state === 'draft';
      return state !== 'graded' && state !== 'draft';
    });
  }, [students, filter, gradeFor]);

  // Keep the active student valid as the filter changes
  useEffect(() => {
    if (filteredStudents.length === 0) return;
    if (!filteredStudents.some((s) => s.id === activeStudentId)) {
      setActiveStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, activeStudentId]);

  const activeStudent = useMemo(() => students.find((s) => s.id === activeStudentId), [students, activeStudentId]);
  const activeGrade = useMemo(() => gradeFor(activeStudentId), [gradeFor, activeStudentId]);
  const activeState = cellState(activeGrade);

  // Sync inputs when the active student changes
  useEffect(() => {
    if (!activeStudentId) {
      setEditPoints('');
      setEditComment('');
      setValidationError(null);
      setShowAiPanel(false);
      return;
    }
    const key = `${activeStudentId}_${assignmentId}`;
    const unsaved = unsavedEdits[key];
    if (unsaved) {
      setEditPoints(String(unsaved.points));
      setEditComment(unsaved.comment);
    } else {
      const saved = gradeFor(activeStudentId);
      const initialPoints = saved?.draftPoints ?? saved?.publishedPoints;
      setEditPoints(initialPoints !== undefined && initialPoints !== null ? String(initialPoints) : '');
      setEditComment(saved?.comment ?? '');
    }
    setValidationError(null);
    setShowAiPanel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId, assignmentId]);

  // Submission content for the centre reading pane
  const reviewQuery = useSubmissionReview(activeGrade?.submissionId ?? undefined);
  const submissionText = useMemo(() => submissionToText(reviewQuery.data?.content), [reviewQuery.data]);
  const wordCount = useMemo(
    () => (submissionText ? submissionText.trim().split(/\s+/).filter(Boolean).length : 0),
    [submissionText]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const activeIndex = useMemo(
    () => filteredStudents.findIndex((s) => s.id === activeStudentId),
    [filteredStudents, activeStudentId]
  );

  const handleLocalChange = (pts: string, cmt: string) => {
    if (readOnly) return;
    setEditPoints(pts);
    setEditComment(cmt);
    if (!activeStudentId) return;
    const key = `${activeStudentId}_${assignmentId}`;
    const points = Number(pts);
    if (!isNaN(points) && points >= 0 && points <= (assignment?.maxPoints || 100)) {
      setUnsavedEdits((prev) => ({ ...prev, [key]: { points, comment: cmt } }));
    }
  };

  const saveGrade = async (): Promise<boolean> => {
    if (readOnly || !activeStudentId || !assignment) return false;
    const points = Number(editPoints);
    if (editPoints === '' || isNaN(points) || points < 0 || points > assignment.maxPoints) {
      setValidationError(`Enter a score between 0 and ${assignment.maxPoints} points.`);
      return false;
    }
    try {
      await updateCellsMutation.mutateAsync({
        cells: [{ studentId: activeStudentId, assignmentId, points, comment: editComment || undefined }],
      });
      const key = `${activeStudentId}_${assignmentId}`;
      setUnsavedEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setValidationError(null);
      return true;
    } catch (err) {
      const error = err as { message?: string };
      setValidationError(error.message || 'Failed to save grade. Please check connectivity.');
      return false;
    }
  };

  const goTo = (delta: number) => {
    const next = activeIndex + delta;
    if (next >= 0 && next < filteredStudents.length) {
      setActiveStudentId(filteredStudents[next].id);
    }
  };

  const handleSaveDraft = async () => {
    const ok = await saveGrade();
    if (ok) showToast(`Saved draft for ${activeStudent?.displayName ?? 'student'}.`);
  };

  const handleSaveAndNext = async () => {
    const ok = await saveGrade();
    if (!ok) return;
    showToast(`Saved draft for ${activeStudent?.displayName ?? 'student'}.`);
    if (activeIndex < filteredStudents.length - 1) goTo(1);
  };

  if (!assignment) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-faint)]">
        Could not resolve details for assignment &ldquo;{assignmentId}&rdquo;.
      </div>
    );
  }

  const totalCount = students.length;
  const gradedCount = students.filter((s) => {
    const state = cellState(gradeFor(s.id));
    return state === 'graded' || state === 'draft';
  }).length;
  const progressPct = totalCount ? (gradedCount / totalCount) * 100 : 0;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] animate-fade-in"
      style={{ height: 'calc(100vh - 13rem)', minHeight: 560 }}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5">
        <button
          onClick={onBackToOverview}
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
          aria-label="Back to course grades"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{assignment.title}</span>
            <span className="badge shrink-0 font-mono">{assignment.maxPoints} pts</span>
            {readOnly && <span className="badge shrink-0">READ ONLY</span>}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
            {assignment.type} · SpeedGrader
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex">
          <span className="font-mono tabular-nums">
            {gradedCount} of {totalCount} graded
          </span>
          <div className="h-[3px] w-[90px] overflow-hidden rounded-full bg-[var(--bg-overlay)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(-1)}
            disabled={activeIndex <= 0}
            className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-active)] disabled:opacity-40"
            aria-label="Previous submission"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[44px] text-center font-mono text-xs tabular-nums text-[var(--text-muted)]">
            {filteredStudents.length ? activeIndex + 1 : 0} / {filteredStudents.length}
          </span>
          <button
            onClick={() => goTo(1)}
            disabled={activeIndex >= filteredStudents.length - 1}
            className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-active)] disabled:opacity-40"
            aria-label="Next submission"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: submission list */}
        <aside className="flex w-[244px] shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Submissions</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="input h-6 w-24 py-0 pl-2 pr-6 text-[11px]"
            >
              <option value="all">All</option>
              <option value="ungraded">Ungraded</option>
              <option value="graded">Graded</option>
            </select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-[11px] text-[var(--text-faint)]">No submissions match this filter.</div>
            ) : (
              filteredStudents.map((student) => {
                const grade = gradeFor(student.id);
                const state = cellState(grade);
                const isActive = student.id === activeStudentId;
                const score = grade?.draftPoints ?? grade?.publishedPoints;
                return (
                  <button
                    key={student.id}
                    onClick={() => setActiveStudentId(student.id)}
                    className="flex w-full items-center gap-2.5 border-b border-[var(--border-subtle)] px-3 py-2.5 text-left transition"
                    style={{
                      background: isActive ? 'var(--bg-active)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <StatusDot state={state} />
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[9px] font-semibold uppercase text-[var(--text-secondary)]">
                      {initials(student.displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-[var(--text-primary)]">{student.displayName}</div>
                      <div className="truncate text-[10px] capitalize text-[var(--text-faint)]">
                        {state === 'missing' ? 'No submission' : state}
                      </div>
                    </div>
                    {score !== null && score !== undefined && (
                      <span
                        className="font-mono text-[11px] tabular-nums"
                        style={{ color: state === 'draft' ? 'var(--fn-warning)' : 'var(--text-secondary)' }}
                      >
                        {score}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: submission content */}
        <div className="flex min-w-0 flex-1 justify-center overflow-y-auto bg-[var(--bg-base)]">
          {!activeStudent ? (
            <div className="flex flex-1 items-center justify-center p-12 text-center text-xs text-[var(--text-faint)]">
              Select a submission from the list to begin grading.
            </div>
          ) : activeState === 'missing' || !activeGrade?.submissionId ? (
            <div className="flex max-w-md flex-col items-center justify-center px-8 text-center">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-faint)]">
                <InformationCircleIcon className="h-5 w-5" />
              </div>
              <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">No submission</h4>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {activeStudent.displayName} has not submitted this assignment. You can still enter a score (e.g. 0) and
                leave feedback.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-[660px] px-10 pb-20 pt-8">
              <div className="mb-6 flex items-center gap-3 border-b border-[var(--border-default)] pb-4">
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                  {initials(activeStudent.displayName)}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{activeStudent.displayName}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">
                    {activeStudent.email || 'No email registered'}
                    {wordCount > 0 && <span> · {wordCount} words</span>}
                  </div>
                </div>
              </div>

              {reviewQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-5/6 rounded" />
                </div>
              ) : reviewQuery.isError ? (
                <p className="text-xs text-[var(--fn-error)]">Could not load this submission&apos;s content.</p>
              ) : submissionText ? (
                <div
                  className="text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-body)', fontSize: 16.5, lineHeight: 1.7 }}
                >
                  {submissionText.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="mb-4 whitespace-pre-wrap">
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  This submission has no inline text content. Open the assignment to review attached files or external
                  links.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: grade + feedback panel */}
        <aside className="flex w-[322px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {/* Score */}
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">Score</label>
                {activeState === 'draft' && (
                  <span className="badge badge-draft">
                    <span className="status-dot" />
                    Draft
                  </span>
                )}
                {activeState === 'graded' && (
                  <span className="badge badge-published">
                    <span className="status-dot" />
                    Published
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={assignment.maxPoints}
                  value={editPoints}
                  onChange={(e) => handleLocalChange(e.target.value, editComment)}
                  readOnly={readOnly}
                  placeholder="—"
                  className="input w-[92px] text-center font-mono text-lg font-semibold"
                />
                <span className="font-mono text-[15px] text-[var(--text-faint)]">/ {assignment.maxPoints}</span>
              </div>
            </div>

            {validationError && (
              <p className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2.5 text-xs font-medium text-[var(--fn-error)]">
                {validationError}
              </p>
            )}

            {/* AI suggest */}
            {!readOnly && (
              <>
                {!showAiPanel ? (
                  <button
                    type="button"
                    onClick={() => setShowAiPanel(true)}
                    disabled={activeState === 'missing' || !activeGrade?.submissionId}
                    className="btn btn-secondary btn-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <SparklesIcon className="h-4 w-4 text-[var(--accent)]" />
                    Suggest grade with AI
                  </button>
                ) : (
                  <AiFeatureGate compact>
                    <AiSuggestPanel
                      courseId={courseId}
                      assignmentId={assignmentId}
                      studentId={activeStudentId}
                      submissionId={activeGrade?.submissionId ?? undefined}
                      maxPoints={assignment.maxPoints}
                      onClose={() => setShowAiPanel(false)}
                      onApply={({ score, feedback }) => {
                        handleLocalChange(String(score), feedback || editComment);
                        setShowAiPanel(false);
                      }}
                    />
                  </AiFeatureGate>
                )}
              </>
            )}

            {/* Feedback */}
            <div className="flex flex-1 flex-col space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Feedback</label>
              <textarea
                value={editComment}
                onChange={(e) => handleLocalChange(editPoints, e.target.value)}
                readOnly={readOnly}
                placeholder="Write feedback for the student…"
                className="input min-h-[150px] flex-1 resize-none"
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.55 }}
              />
            </div>
          </div>

          {!readOnly && (
            <div className="shrink-0 space-y-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={updateCellsMutation.isPending}
                  className="btn btn-secondary btn-sm flex-1 disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  onClick={handleSaveAndNext}
                  disabled={updateCellsMutation.isPending}
                  className="btn btn-primary btn-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ flex: 1.4 }}
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {updateCellsMutation.isPending ? 'Saving…' : 'Save & next'}
                </button>
              </div>
              <p className="text-center text-[10px] text-[var(--text-faint)]">
                Drafts stay private until released from the gradebook.
              </p>
            </div>
          )}
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-3.5 text-xs font-medium text-[var(--text-primary)] shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

interface AiSuggestResult {
  suggestedScore?: number;
  feedbackJson?: unknown;
  reasoningSummary?: string[];
  rubricBreakdown?: Array<{
    criterion?: string;
    suggestedPoints?: number;
    maxPoints?: number;
    comment?: string;
  }>;
}

function AiSuggestPanel({
  courseId,
  assignmentId,
  studentId,
  submissionId,
  maxPoints,
  onClose,
  onApply,
}: {
  courseId: string;
  assignmentId: string;
  studentId: string;
  submissionId?: string;
  maxPoints: number;
  onClose: () => void;
  onApply: (result: { score: number; feedback: string }) => void;
}) {
  const task = useAiTask<AiSuggestResult>();
  const output = task.data?.output;

  // Auto-run the suggestion when the panel opens
  useEffect(() => {
    if (!submissionId) return;
    void task.executeTask({
      type: 'SUGGEST_GRADE',
      context: { courseId },
      input: { assignmentId, studentId, submissionId },
    }).catch(() => {
      /* surfaced via task.error */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestedScore = output?.suggestedScore;
  const feedbackText = richContentToPlainText(output?.feedbackJson);
  const pct = suggestedScore !== undefined && maxPoints ? (suggestedScore / maxPoints) * 100 : 0;
  const rubric = output?.rubricBreakdown ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--accent-line)] bg-[var(--bg-elevated)] animate-fade-in">
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3 py-2.5">
        <SparklesIcon className="h-4 w-4 text-[var(--accent)]" />
        <span className="text-xs font-semibold text-[var(--text-primary)]">AI suggested grade</span>
        <span className="badge font-mono text-[9.5px]">Gemini</span>
        <button
          onClick={() => {
            task.reset();
            onClose();
          }}
          className="ml-auto grid h-6 w-6 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
          aria-label="Close AI suggestion"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.isLoading ? (
        <div className="flex items-center gap-3 px-3.5 py-6 text-xs text-[var(--text-secondary)]">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
          Reading the submission against the rubric…
        </div>
      ) : task.error ? (
        <div className="p-3">
          <AiErrorDisplay error={task.error} />
        </div>
      ) : output ? (
        <div className="p-3">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {suggestedScore ?? '—'}
            </span>
            <span className="font-mono text-sm text-[var(--text-faint)]">/ {maxPoints} suggested</span>
            {suggestedScore !== undefined && (
              <span className="ml-auto text-lg text-[var(--accent)]" style={{ fontFamily: 'var(--font-body)' }}>
                {letterGrade(pct)}
              </span>
            )}
          </div>

          {rubric.length > 0 && (
            <>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Rubric breakdown
              </div>
              <div className="mb-3 flex flex-col gap-2.5">
                {rubric.map((row, i) => {
                  const rowMax = row.maxPoints ?? 0;
                  const rowScore = row.suggestedPoints ?? 0;
                  const rowPct = rowMax ? (rowScore / rowMax) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="mb-1 flex justify-between text-[11.5px]">
                        <span className="text-[var(--text-secondary)]">{row.criterion ?? `Criterion ${i + 1}`}</span>
                        <span className="font-mono text-[var(--text-faint)]">
                          {rowScore}/{rowMax}
                        </span>
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-[var(--bg-overlay)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${rowPct}%` }} />
                      </div>
                      {row.comment && (
                        <div className="mt-1 text-[11px] leading-snug text-[var(--text-faint)]">{row.comment}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {feedbackText && (
            <>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Draft feedback
              </div>
              <p
                className="mb-3 text-[var(--text-secondary)]"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5 }}
              >
                {feedbackText}
              </p>
            </>
          )}

          <div className="mb-3 flex items-start gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] p-2.5 text-[11px] text-[var(--text-muted)]">
            <InformationCircleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>A suggestion only. Applying fills the fields — nothing is saved or published until you choose to.</span>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm flex flex-1 items-center justify-center gap-1.5"
              onClick={() =>
                onApply({
                  score: suggestedScore ?? 0,
                  feedback: feedbackText,
                })
              }
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Apply to fields
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                task.reset();
                onClose();
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
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
      const values = [data.text, data.content, data.caption].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      return values.join(' ');
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
