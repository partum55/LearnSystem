'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStudentGradebook } from '../hooks/useGradebookQueries';
import { useActiveCourses } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';
import {
  AcademicCapIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export function StudentGradebookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  // State
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);

  // Queries
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: activeCourses, isLoading: coursesLoading, error: coursesError } = useActiveCourses();

  const {
    data: gradebook,
    isLoading: gradebookLoading,
    error: gradebookError,
  } = useStudentGradebook(selectedCourseId ? selectedCourseId : undefined);

  // Sync selected course with URL query param if present
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (activeCourses && activeCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(activeCourses[0].id);
    }
  }, [initialCourseId, activeCourses, selectedCourseId]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    if (courseId) {
      router.push(`/gradebook?courseId=${courseId}`);
    } else {
      router.push('/gradebook');
    }
  };

  if (userLoading || coursesLoading) {
    return <Loading label="Loading gradebook records..." />;
  }

  const globalRole = currentUser?.role ?? currentUser?.globalRole;
  const hasStudentCourses = Boolean(activeCourses && activeCourses.length > 0);

  // Helper for assignment type badges
  const getTypeBadgeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'QUIZ':
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]';
      case 'VPL':
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)]';
    }
  };

  // Helper to determine letter grade or feedback color
  const getScoreColorClass = (percentage: number | undefined | null) => {
    if (percentage === undefined || percentage === null) return 'text-[var(--text-muted)] bg-[var(--bg-elevated)]';
    if (percentage >= 90) return 'text-[var(--fn-success)] bg-[var(--bg-elevated)]';
    if (percentage >= 75) return 'text-[var(--text-primary)] bg-[var(--bg-elevated)]';
    if (percentage >= 60) return 'text-[var(--fn-warning)] bg-[var(--bg-elevated)]';
    return 'text-[var(--fn-error)] bg-[var(--bg-elevated)]';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Grades & Feedback
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track your academic progress, assignment submissions, and instructor comments.
          </p>
        </div>

        {/* Course Selection Dropdown */}
        {hasStudentCourses && (
          <div className="relative min-w-[280px]">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="input cursor-pointer appearance-none pr-10 font-semibold"
            >
              {activeCourses!.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        )}
      </div>

      {coursesError && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] shadow-sm">
          <div className="flex gap-3">
            <ExclamationCircleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--fn-error)' }} />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Error loading courses</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                There was a problem loading your active academic courses. Please reload or try again later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Content Viewport */}
      {hasStudentCourses ? (
        <>
          {gradebookLoading ? (
            <Loading label="Fetching gradebook scores..." />
          ) : gradebookError ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] shadow-sm">
              <div className="flex gap-3">
                <ExclamationCircleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--fn-error)' }} />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Access Restricted</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    You do not have student enrollment details or active grade records for the selected course.
                  </p>
                </div>
              </div>
            </div>
          ) : gradebook ? (
            <div className="space-y-8 animate-fadeIn">
              {/* Course Scorecard Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                      Course Total Score
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {gradebook.total.points.toFixed(1)}
                      </span>
                      <span className="text-sm text-[var(--text-faint)] font-medium">
                        / {gradebook.total.maxPoints.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-base)] p-3 shrink-0">
                    <AcademicCapIcon className="h-6 w-6 text-[var(--text-secondary)]" />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                      Progress Percentage
                    </span>
                    <span className="text-3xl font-extrabold text-[var(--text-primary)] block">
                      {gradebook.total.percentage !== undefined && gradebook.total.percentage !== null
                        ? `${Math.round(gradebook.total.percentage)}%`
                        : `${Math.round((gradebook.total.points / (gradebook.total.maxPoints || 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className={`rounded-xl p-3 shrink-0 border ${getScoreColorClass(
                    gradebook.total.percentage !== undefined && gradebook.total.percentage !== null
                      ? gradebook.total.percentage
                      : (gradebook.total.points / (gradebook.total.maxPoints || 1)) * 100
                  )}`}>
                    <CheckBadgeIcon className="h-6 w-6" />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                      Course Enrolled
                    </span>
                    <span className="text-lg font-bold text-[var(--text-primary)] block truncate max-w-[200px]">
                      {gradebook.courseTitle}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-base)] p-3 shrink-0">
                    <BookOpenIcon className="h-6 w-6 text-[var(--text-secondary)]" />
                  </div>
                </div>
              </div>

              {/* Module & Assignment Layout */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Module & Submission Breakdown</h2>
                  <span className="text-sm text-[var(--text-muted)] font-semibold">
                    {gradebook.modules.length} Modules
                  </span>
                </div>

                {gradebook.modules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center text-[var(--text-faint)]">
                    No academic module records exist for this course yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {gradebook.modules.map((mod) => (
                      <div
                        key={mod.moduleId}
                        className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm transition hover:shadow-md"
                      >
                        {/* Module Sub-Header */}
                        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-base font-bold text-[var(--text-primary)]">
                            {mod.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-faint)]">Module total:</span>
                            <span className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                              {mod.total.points.toFixed(1)} / {mod.total.maxPoints.toFixed(1)} pts
                            </span>
                          </div>
                        </div>

                        {/* Assignments Table/List */}
                        {mod.assignments.length === 0 ? (
                          <div className="p-6 text-center text-sm text-[var(--text-faint)]">
                            No assignments are published in this module.
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--border-subtle)]">
                            {mod.assignments.map((assignment) => (
                              <div
                                key={assignment.assignmentId}
                                className="p-6 space-y-4 hover:bg-[var(--bg-base)] transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center flex-wrap gap-2.5">
                                      <Link
                                        href={`/assignments/${assignment.assignmentId}`}
                                        className="text-sm font-bold transition hover:underline"
                                      >
                                        {assignment.title}
                                      </Link>
                                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getTypeBadgeColor(
                                        assignment.type
                                      )}`}>
                                        {assignment.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                      <span>Status:</span>
                                      <span className="font-semibold uppercase text-[var(--text-secondary)]">
                                        {assignment.status?.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Score Points Display */}
                                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                                    <div className="text-right">
                                      <span className="block text-[10px] uppercase font-bold text-[var(--text-faint)] tracking-wide">
                                        Grade Points
                                      </span>
                                      <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-lg font-extrabold text-[var(--text-primary)]">
                                          {assignment.points !== undefined && assignment.points !== null
                                            ? assignment.points.toFixed(1)
                                            : '-'}
                                        </span>
                                        <span className="text-xs text-[var(--text-faint)] font-semibold">
                                          / {assignment.maxPoints.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>

                                    {assignment.points !== undefined && assignment.points !== null && (
                                      <div className={`h-8 w-12 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${getScoreColorClass(
                                        (assignment.points / (assignment.maxPoints || 1)) * 100
                                      )}`}>
                                        {Math.round((assignment.points / (assignment.maxPoints || 1)) * 100)}%
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Instructor Feedback Comments */}
                                {assignment.comment && (
                                  <div className="rounded-lg border p-4 space-y-1.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] flex items-center gap-1.5">
                                      <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} /> Instructor Comments
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
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-default)] p-12 text-center text-[var(--text-faint)]">
              Select an active course above to review your grade details.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center max-w-lg mx-auto mt-12 space-y-4">
          {globalRole === 'ADMIN' ? (
            <>
              <BriefcaseIcon className="mx-auto h-12 w-12 text-[var(--text-faint)]" />
              <h2 className="text-lg font-bold text-[var(--text-secondary)]">No Active Student Enrollments</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Administrators do not have student gradebooks unless enrolled as a student.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="btn btn-primary"
                >
                  Go to Admin Dashboard <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : globalRole === 'TEACHER' ? (
            <>
              <BriefcaseIcon className="mx-auto h-12 w-12 text-[var(--text-faint)]" />
              <h2 className="text-lg font-bold text-[var(--text-secondary)]">No Student Gradebooks Found</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                You are registered as a Teacher and have no active student course enrollments.
              </p>
              <div className="pt-2">
                <Link
                  href="/courses"
                  className="btn btn-primary"
                >
                  Go to Teaching Courses <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <BookOpenIcon className="mx-auto h-12 w-12 text-[var(--text-faint)]" />
              <h2 className="text-lg font-bold text-[var(--text-secondary)]">No Student Gradebooks Found</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                You do not currently have any active student course enrollments. Click below to review your courses or check back once enrolled.
              </p>
              <div className="pt-2">
                <Link
                  href="/courses"
                  className="btn btn-primary"
                >
                  Browse Course List <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
