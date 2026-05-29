'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useTeacherGradebook,
  usePublishGradebook,
} from '../hooks/useGradebookQueries';
import {
  useCourseMembers,
  useCourseOverview,
  useCourseModules,
} from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';
import {
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { GradebookOverview } from './GradebookOverview';
import { FullGradebook } from './FullGradebook';
import { SpeedGrader } from './SpeedGrader';

interface TeacherGradebookPageProps {
  courseId: string;
}

export function TeacherGradebookPage({ courseId }: TeacherGradebookPageProps) {
  return (
    <Suspense fallback={<Loading label="Loading teacher gradebook..." />}>
      <TeacherGradebookContent courseId={courseId} />
    </Suspense>
  );
}

function TeacherGradebookContent({ courseId }: TeacherGradebookPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Deep-linking parameters
  const initialView = searchParams.get('view') || 'overview';
  const initialAssignmentId = searchParams.get('assignmentId') || null;

  // View state orchestrator
  const [activeView, setActiveView] = useState<'overview' | 'grid' | 'speedgrader'>(
    initialView === 'grid' || initialView === 'speedgrader' ? initialView : 'overview'
  );
  const [focusedAssignmentId, setFocusedAssignmentId] = useState<string | null>(initialAssignmentId);

  // Queries
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: membersPage, isLoading: isMembersLoading } = useCourseMembers(courseId, { size: 100 });
  const { data: overview, isLoading: isOverviewLoading } = useCourseOverview(courseId);
  const { data: modulesData, isLoading: isModulesLoading } = useCourseModules(courseId);
  const {
    data: gradebook,
    isLoading: isGradebookLoading,
    error: gradebookError,
    refetch: refetchGradebook,
  } = useTeacherGradebook(courseId);

  // Mutations
  const publishGradebookMutation = usePublishGradebook(courseId);

  // Modal release state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPublishIds, setSelectedPublishIds] = useState<string[]>([]);
  const [todoToast, setTodoToast] = useState<string | null>(null);

  // Helper for setting toast notifications
  const showToast = useCallback((message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  }, []);

  // Pre-select all assignments when publishing modal opens
  useEffect(() => {
    if (publishModalOpen && gradebook?.assignments) {
      setSelectedPublishIds(gradebook.assignments.map((a) => a.id));
    }
  }, [publishModalOpen, gradebook]);

  const isInitialLoading = isUserLoading || isMembersLoading || isOverviewLoading || isModulesLoading;

  // Resolve user role
  const currentMember = useMemo(() => {
    if (!membersPage?.content || !currentUser) return null;
    return membersPage.content.find((m) => m.userId === currentUser.id);
  }, [membersPage, currentUser]);

  const courseRole = currentMember?.roleInCourse;
  const normalizedCourseRole = String(courseRole || '').toUpperCase();
  const globalRole = String(currentUser?.globalRole ?? currentUser?.role ?? '').toUpperCase();
  const isArchived = String(overview?.status || '').toUpperCase() === 'ARCHIVED';

  // Staff gate check (ADMIN or Course OWNER, TEACHER, or TA)
  const isStaff = useMemo(() => {
    if (globalRole === 'ADMIN') return true;
    return normalizedCourseRole === 'OWNER' || normalizedCourseRole === 'TEACHER' || normalizedCourseRole === 'TA';
  }, [globalRole, normalizedCourseRole]);
  const canMutateGradebook = isArchived
    ? globalRole === 'ADMIN' || normalizedCourseRole === 'OWNER'
    : isStaff;
  const readOnly = !canMutateGradebook;

  // Handle toggle selection inside publishing array
  const handleTogglePublishAsg = (asgId: string) => {
    setSelectedPublishIds((prev) =>
      prev.includes(asgId) ? prev.filter((id) => id !== asgId) : [...prev, asgId]
    );
  };

  // Trigger POST publication to student view
  const handlePublishGrades = async () => {
    if (readOnly) {
      showToast('This archived course gradebook is read-only.');
      return;
    }
    if (selectedPublishIds.length === 0) {
      showToast('Select at least one assignment to release.');
      return;
    }

    try {
      await publishGradebookMutation.mutateAsync({
        assignmentIds: selectedPublishIds,
      });
      setPublishModalOpen(false);
      showToast('Grades released and synced to student profiles successfully!');
    } catch (err) {
      const error = err as { message?: string };
      showToast(error.message || 'Failed to publish grades. Please check permissions.');
    }
  };

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
      <div className="mx-auto max-w-lg rounded-2xl border bg-[var(--bg-surface)] p-8 text-center shadow-xl mt-12 space-y-6" style={{ borderColor: 'var(--border-default)' }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--fn-error)' }}>
          <LockClosedIcon className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Access Gated to Course Staff</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            You do not have the required course ownership, teaching, or administrative privileges to view or edit the gradebook spreadsheet for this module.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/gradebook"
            className="btn btn-primary w-full justify-center"
          >
            Go to Student Grades
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full cursor-pointer rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)]"
          >
            Return to Course Hub
          </button>
        </div>
      </div>
    );
  }

  if (isGradebookLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading label="Fetching gradebook rows and assignments..." />
      </div>
    );
  }

  if (gradebookError || !gradebook) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] shadow-xs mt-8 space-y-4">
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--fn-error)' }} />
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Failed to Retrieve Gradebook</h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
              We encountered an API communication error trying to retrieve this course's grading grid. Confirm that your course token details are valid or that active academic tables are initialized on the backend.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => refetchGradebook()}
            className="rounded-lg px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5"
            style={{ background: 'var(--fn-error)', color: 'var(--bg-base)' }}
          >
            <ArrowPathIcon className="h-4 w-4" /> Retry Retrieval
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Active View Dispatcher */}
      {activeView === 'overview' && (
        <GradebookOverview
          courseId={courseId}
          gradebook={gradebook}
          modules={modulesData?.items || []}
          courseRole={courseRole || null}
          onOpenFullGradebook={(assignmentId) => {
            setFocusedAssignmentId(assignmentId || null);
            setActiveView('grid');
          }}
          onOpenSpeedGrader={(assignmentId) => {
            setFocusedAssignmentId(assignmentId);
            setActiveView('speedgrader');
          }}
          onReleaseGrades={() => setPublishModalOpen(true)}
          readOnly={readOnly}
        />
      )}

      {activeView === 'grid' && (
        <FullGradebook
          courseId={courseId}
          gradebook={gradebook}
          modules={modulesData?.items || []}
          initialAssignmentId={focusedAssignmentId}
          onBackToOverview={() => {
            setFocusedAssignmentId(null);
            setActiveView('overview');
          }}
          onReleaseGrades={() => setPublishModalOpen(true)}
          readOnly={readOnly}
        />
      )}

      {activeView === 'speedgrader' && (
        <SpeedGrader
          courseId={courseId}
          gradebook={gradebook}
          assignmentId={focusedAssignmentId || ''}
          onBackToOverview={() => {
            setFocusedAssignmentId(null);
            setActiveView('overview');
          }}
          readOnly={readOnly}
        />
      )}

      {/* Shared Release Grades / Publication Modal */}
      {!readOnly && publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-base)]/80 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 border border-[var(--border-default)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] pb-3">
              <CheckBadgeIcon className="h-6 w-6 text-[var(--text-primary)] shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Publish Draft Grades</h3>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">Select assignment evaluations to release to student profiles.</p>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl p-1 bg-[var(--bg-base)]">
              {gradebook.assignments.map((asg) => {
                const isChecked = selectedPublishIds.includes(asg.id);
                return (
                  <div
                    key={asg.id}
                    onClick={() => handleTogglePublishAsg(asg.id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[var(--bg-elevated)]/50 rounded-lg transition text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="font-bold text-[var(--text-primary)] truncate">{asg.title}</p>
                      <p className="text-[9px] text-[var(--text-faint)] font-bold uppercase tracking-wider">{asg.type} column • Max: {asg.maxPoints} pts</p>
                    </div>
                    <span className={`h-4.5 w-4.5 rounded border shrink-0 flex items-center justify-center text-[10px] cursor-pointer ${
                      isChecked ? 'border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--text-primary)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }`}>
                      {isChecked && '✓'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] pt-1">
              <span>{selectedPublishIds.length} of {gradebook.assignments.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPublishIds(gradebook.assignments.map((a) => a.id))}
                  className="cursor-pointer hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  onClick={() => setSelectedPublishIds([])}
                  className="cursor-pointer hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setPublishModalOpen(false)}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handlePublishGrades}
                disabled={publishGradebookMutation.isPending || selectedPublishIds.length === 0}
                className="btn btn-primary text-xs cursor-pointer"
              >
                {publishGradebookMutation.isPending ? 'Publishing...' : 'Publish Selected Grades'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast alerts */}
      {todoToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border px-5 py-3.5 text-xs font-semibold shadow-2xl animate-fade-in" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          {todoToast}
        </div>
      )}
    </div>
  );
}
