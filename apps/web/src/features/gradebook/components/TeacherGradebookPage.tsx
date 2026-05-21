'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useTeacherGradebook,
  useUpdateGradebookCells,
  usePublishGradebook,
} from '../hooks/useGradebookQueries';
import { useCourseMembers, useCourseOverview } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';
import {
  ArrowLeftIcon,
  CheckIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ChatBubbleOvalLeftIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

interface TeacherGradebookPageProps {
  courseId: string;
}

interface UnsavedCellEdit {
  points: number;
  comment: string;
}

export function TeacherGradebookPage({ courseId }: TeacherGradebookPageProps) {
  const router = useRouter();

  // Queries
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: membersPage, isLoading: isMembersLoading } = useCourseMembers(courseId, { size: 100 });
  const { data: overview, isLoading: isOverviewLoading } = useCourseOverview(courseId);
  const {
    data: gradebook,
    isLoading: isGradebookLoading,
    error: gradebookError,
    refetch: refetchGradebook,
  } = useTeacherGradebook(courseId);

  // Mutations
  const updateCellsMutation = useUpdateGradebookCells(courseId);
  const publishGradebookMutation = usePublishGradebook(courseId);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const [unsavedEdits, setUnsavedEdits] = useState<Record<string, UnsavedCellEdit>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPublishIds, setSelectedPublishIds] = useState<string[]>([]);
  const [todoToast, setTodoToast] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper for setting local toast notifications
  const showToast = useCallback((message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  }, []);

  // Sync selected cell details with local inputs
  useEffect(() => {
    if (!selectedCell || !gradebook) {
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
      const savedCell = gradebook.grades.find(
        (g) => g.studentId === studentId && g.assignmentId === assignmentId
      );
      const initialPoints = savedCell?.draftPoints ?? savedCell?.publishedPoints;
      setEditPoints(initialPoints !== undefined && initialPoints !== null ? String(initialPoints) : '');
      setEditComment(savedCell?.comment ?? '');
    }
    setValidationError(null);
  }, [selectedCell, gradebook, unsavedEdits]);

  // Default pre-select all assignments when publishing modal opens
  useEffect(() => {
    if (publishModalOpen && gradebook?.assignments) {
      setSelectedPublishIds(gradebook.assignments.map((a) => a.id));
    }
  }, [publishModalOpen, gradebook]);

  // Loading indicator for basic permissions and course overview
  const isInitialLoading = isUserLoading || isMembersLoading || isOverviewLoading;

  // Resolve user role in course
  const currentMember = useMemo(() => {
    if (!membersPage?.content || !currentUser) return null;
    return membersPage.content.find((m) => m.userId === currentUser.id);
  }, [membersPage, currentUser]);

  const courseRole = currentMember?.roleInCourse;

  // Gate check: Global ADMIN or Course OWNER, TEACHER, or TA
  const isStaff = useMemo(() => {
    if (currentUser?.role === 'ADMIN') return true;
    return courseRole === 'OWNER' || courseRole === 'TEACHER' || courseRole === 'TA';
  }, [currentUser, courseRole]);

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading label="Loading staff gradebook details..." />
      </div>
    );
  }

  // Forbidden layout
  if (!isStaff) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-250 bg-white p-8 text-center shadow-xl mt-12 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
          <LockClosedIcon className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Access Gated to Course Staff</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You do not have the required course ownership, teaching, or administrative privileges to view or edit the gradebook spreadsheet for this module.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/gradebook"
            className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-md text-center block"
          >
            Go to Student Grades
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Return to Course Hub
          </button>
        </div>
      </div>
    );
  }

  // Render Gradebook Loading or general query error bounds
  if (isGradebookLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading label="Fetching gradebook rows and assignments..." />
      </div>
    );
  }

  if (gradebookError || !gradebook) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-slate-800 shadow-xs mt-8 space-y-4">
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-650 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-red-800">Failed to Retrieve Gradebook</h2>
            <p className="mt-1.5 text-sm text-red-700 leading-relaxed">
              We encountered an API communication error trying to retrieve this course's grading grid. Confirm that your course token details are valid or that active academic tables are initialized on the backend.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => refetchGradebook()}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 flex items-center gap-1.5"
          >
            <ArrowPathIcon className="h-4 w-4" /> Retry Retrieval
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-slate-350 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Derived attributes from gradebook payload
  const { students, assignments, grades } = gradebook;

  // Filter students based on search term
  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    return s.displayName.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  // Check how many grades have draft differences
  const draftEditsCount = grades.filter(
    (g) => g.draftPoints !== null && g.draftPoints !== undefined && g.draftPoints !== g.publishedPoints
  ).length;

  const unsavedCount = Object.keys(unsavedEdits).length;

  // Find selection structures
  const currentSelectedAssignment = selectedCell
    ? assignments.find((a) => a.id === selectedCell.assignmentId)
    : null;
  const currentSelectedStudent = selectedCell
    ? students.find((s) => s.id === selectedCell.studentId)
    : null;

  // Apply cell inputs to memory map (local drafts)
  const handleApplyEdit = () => {
    if (!selectedCell || !currentSelectedAssignment) return;

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
    showToast('Applied grade edit to grid! Changes are kept unsaved in local view.');
  };

  // Discard a single local draft modification
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

  // Submit all bulk local draft changes to the server
  const handleSaveChanges = async () => {
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
      showToast('Successfully committed bulk draft modifications to backend!');
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to save changes. Please try again.');
    }
  };

  // Toggle selection inside publishing array
  const handleTogglePublishAsg = (asgId: string) => {
    setSelectedPublishIds((prev) =>
      prev.includes(asgId) ? prev.filter((id) => id !== asgId) : [...prev, asgId]
    );
  };

  // Trigger POST publication to student view
  const handlePublishGrades = async () => {
    if (selectedPublishIds.length === 0) {
      showToast('You must select at least one assignment to release.');
      return;
    }

    try {
      await publishGradebookMutation.mutateAsync({
        assignmentIds: selectedPublishIds,
      });
      setPublishModalOpen(false);
      showToast('Grades released and synced to student gradebooks successfully!');
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to publish grades. Please check permissions.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Visual Header Panel */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Course
            </button>
            <span className="rounded bg-indigo-500/20 px-2 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-widest border border-indigo-500/30">
              {courseRole ?? 'ADMIN'} Area
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-indigo-200 via-indigo-100 to-white bg-clip-text text-transparent">
              {overview?.title || 'Course Gradebook'}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-355">
              SpeedGrader Spreadsheet. Modify scores, leave instructor comments, and release published evaluations to student profiles.
            </p>
          </div>
        </div>

        {/* Backdrop Design Blobs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mb-20 mr-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"></div>
      </header>

      {/* Summary Scorecard Statistics */}
      <section className="grid gap-5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Students</span>
            <span className="text-2xl font-extrabold text-slate-900 block">{students.length}</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
            <UserGroupIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Assignments</span>
            <span className="text-2xl font-extrabold text-slate-900 block">{assignments.length}</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
            <AcademicCapIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Pending Release</span>
            <span className="text-2xl font-extrabold text-amber-700 block">{draftEditsCount}</span>
          </div>
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 border border-amber-100">
            <PaperAirplaneIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Local Edits</span>
            <span className="text-2xl font-extrabold text-indigo-650 block">{unsavedCount}</span>
          </div>
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100 animate-pulse">
            <CheckIcon className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Grid Controller & Controls Surface */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Client Search */}
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Filter student lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs focus:border-slate-800 focus:outline-none bg-slate-50/50"
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            {unsavedCount > 0 && (
              <button
                onClick={handleSaveChanges}
                disabled={updateCellsMutation.isPending}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4.5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {updateCellsMutation.isPending ? 'Committing...' : `Save Local Changes (${unsavedCount})`}
              </button>
            )}

            <button
              onClick={() => setPublishModalOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-slate-900 px-4.5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
            >
              <CheckBadgeIcon className="h-4.5 w-4.5" /> Release Grades
            </button>
          </div>
        </div>

        {unsavedCount > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200/70 p-3 text-xs text-amber-800 flex items-center justify-between">
            <span>
              ⚠️ You have <strong>{unsavedCount}</strong> unsaved grade edits currently active on your screen. Click <strong>Save Local Changes</strong> above to push modifications to the server.
            </span>
          </div>
        )}
      </section>

      {/* Main Gradebook Spreadsheet Container */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {assignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No active assignment columns found in this course.</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No students matching the search filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  {/* Sticky left student header */}
                  <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 border-r border-slate-200 w-[240px]">
                    Student Profile
                  </th>
                  {assignments.map((asg) => (
                    <th key={asg.id} className="px-5 py-4 border-r border-slate-200 w-[180px] align-top space-y-1">
                      <div className="truncate text-slate-900" title={asg.title}>
                        {asg.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-slate-200 px-1 py-0.2 text-[8px] font-bold text-slate-655 uppercase tracking-wide">
                          {asg.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Max: {asg.maxPoints} pts
                        </span>
                      </div>
                      {asg.dueDate && (
                        <div className="text-[9px] text-slate-400 font-medium">
                          Due: {new Date(asg.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition">
                    {/* Sticky left student cell */}
                    <td className="sticky left-0 z-10 bg-white px-6 py-3.5 border-r border-slate-200 font-semibold text-slate-800 shadow-sm flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {student.displayName.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-slate-900 font-bold leading-tight" title={student.displayName}>
                          {student.displayName}
                        </p>
                        <p className="truncate text-[10px] text-slate-400 font-medium" title={student.email || ''}>
                          {student.email || 'No email registered'}
                        </p>
                      </div>
                    </td>

                    {/* Dynamic gradebook cells */}
                    {assignments.map((asg) => {
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
                        hasComment = Boolean(grade.comment);
                      }

                      let displayVal = '-';
                      if (cellPoints !== null && cellPoints !== undefined) {
                        displayVal = cellPoints.toFixed(1);
                      }

                      // Dynamic highlight styles
                      let cellStyle = 'border-r border-slate-150 cursor-pointer hover:bg-slate-100/50 transition relative ';
                      if (isSelected) {
                        cellStyle += 'ring-2 ring-indigo-500 bg-indigo-50/20 ';
                      } else if (isUnsaved) {
                        cellStyle += 'bg-amber-50/45 text-amber-800 font-bold border-2 border-amber-300 ';
                      } else if (isDraft) {
                        cellStyle += 'bg-slate-50/60 text-amber-700 font-medium ';
                      } else if (cellPoints !== undefined && cellPoints !== null) {
                        cellStyle += 'text-slate-800 font-semibold ';
                      } else {
                        cellStyle += 'text-slate-350 ';
                      }

                      return (
                        <td
                          key={asg.id}
                          onClick={() => setSelectedCell({ studentId: student.id, assignmentId: asg.id })}
                          className={cellStyle}
                        >
                          <div className="px-5 py-4 flex items-center justify-between gap-1.5 min-h-[46px]">
                            <div className="space-y-0.5">
                              <span className="text-sm font-bold tracking-tight">{displayVal}</span>
                              {cellPoints !== undefined && cellPoints !== null && (
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  / {asg.maxPoints}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                              {isUnsaved ? (
                                <span className="rounded bg-amber-100 border border-amber-200 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-amber-750 shrink-0">
                                  Unsaved
                                </span>
                              ) : isDraft ? (
                                <span className="rounded bg-slate-100 border border-slate-200 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-amber-600 shrink-0">
                                  Draft
                                </span>
                              ) : cellPoints !== undefined && cellPoints !== null ? (
                                <span className="rounded bg-emerald-50 border border-emerald-100 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-emerald-600 shrink-0">
                                  Released
                                </span>
                              ) : null}

                              {hasComment && (
                                <ChatBubbleOvalLeftIcon className="h-4 w-4 text-slate-400" title="Comment present" />
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

      {/* Popover Grade Editing Panel (Sidebar drawer or bottom details card) */}
      {selectedCell && currentSelectedStudent && currentSelectedAssignment && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-md max-w-2xl animate-fade-in space-y-4">
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest block">SpeedGrader Editor</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Edit {currentSelectedStudent.displayName} for <span className="italic text-slate-700">"{currentSelectedAssignment.title}"</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Grade Input */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-450">
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
                  className="w-full rounded-xl border border-slate-250 py-2.5 pl-4 pr-16 text-sm font-semibold focus:border-slate-800 focus:outline-none shadow-inner bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  / {currentSelectedAssignment.maxPoints.toFixed(1)} pts
                </span>
              </div>
            </div>

            {/* Comment Inputs */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-450">
                Instructor Feedback Comments
              </label>
              <textarea
                rows={2}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Write feedback comments..."
                className="w-full rounded-xl border border-slate-250 p-3 text-xs focus:border-slate-800 focus:outline-none shadow-inner bg-white resize-none"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2 rounded-lg">
              {validationError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60">
            <button
              onClick={handleDiscardSingleEdit}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Discard Changes
            </button>
            <button
              onClick={handleApplyEdit}
              className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Apply Edit to Grid
            </button>
          </div>
        </section>
      )}

      {/* Release Grades / Publication Overlay Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <CheckBadgeIcon className="h-6.5 w-6.5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Draft Grades</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select assignment evaluations to release to student profiles.</p>
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {assignments.map((asg) => {
                const isChecked = selectedPublishIds.includes(asg.id);
                return (
                  <div
                    key={asg.id}
                    onClick={() => handleTogglePublishAsg(asg.id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-100/50 rounded-lg transition"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-850 truncate max-w-[340px]">{asg.title}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{asg.type} column • Max: {asg.maxPoints} pts</p>
                    </div>
                    <span className={`h-4.5 w-4.5 rounded border shrink-0 flex items-center justify-center text-[10px] ${
                      isChecked ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && '✓'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-1">
              <span>{selectedPublishIds.length} of {assignments.length} columns selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPublishIds(assignments.map((a) => a.id))}
                  className="text-xs text-indigo-650 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  onClick={() => setSelectedPublishIds([])}
                  className="text-xs text-indigo-655 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPublishModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handlePublishGrades}
                disabled={publishGradebookMutation.isPending || selectedPublishIds.length === 0}
                className="rounded-lg bg-indigo-650 px-4.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {publishGradebookMutation.isPending ? 'Publishing...' : 'Publish Selected Grades'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {todoToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl animate-fade-in border border-slate-800">
          {todoToast}
        </div>
      )}
    </div>
  );
}
