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
        return 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50';
      case 'VPL':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
    }
  };

  // Helper to determine letter grade or feedback color
  const getScoreColorClass = (percentage: number | undefined | null) => {
    if (percentage === undefined || percentage === null) return 'text-slate-500';
    if (percentage >= 90) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30';
    if (percentage >= 75) return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30';
    if (percentage >= 60) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30';
    return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Grades & Feedback
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your academic progress, assignment submissions, and instructor comments.
          </p>
        </div>

        {/* Course Selection Dropdown */}
        {hasStudentCourses && (
          <div className="relative min-w-[280px]">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-slate-800 focus:outline-none transition hover:bg-slate-50"
            >
              {activeCourses!.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        )}
      </div>

      {coursesError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-slate-800 shadow-sm">
          <div className="flex gap-3">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-800">Error loading courses</h2>
              <p className="mt-2 text-sm text-red-700">
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-slate-800 shadow-sm">
              <div className="flex gap-3">
                <ExclamationCircleIcon className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-red-800">Access Restricted</h2>
                  <p className="mt-2 text-sm text-red-700">
                    You do not have student enrollment details or active grade records for the selected course.
                  </p>
                </div>
              </div>
            </div>
          ) : gradebook ? (
            <div className="space-y-8 animate-fadeIn">
              {/* Course Scorecard Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Course Total Score
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {gradebook.total.points.toFixed(1)}
                      </span>
                      <span className="text-sm text-slate-400 font-medium">
                        / {gradebook.total.maxPoints.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 shrink-0">
                    <AcademicCapIcon className="h-6 w-6 text-slate-600" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Progress Percentage
                    </span>
                    <span className="text-3xl font-extrabold text-slate-900 block">
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

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Course Enrolled
                    </span>
                    <span className="text-lg font-bold text-slate-800 block truncate max-w-[200px]">
                      {gradebook.courseTitle}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 shrink-0">
                    <BookOpenIcon className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </div>

              {/* Module & Assignment Layout */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-bold text-slate-800">Module & Submission Breakdown</h2>
                  <span className="text-sm text-slate-500 font-semibold">
                    {gradebook.modules.length} Modules
                  </span>
                </div>

                {gradebook.modules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-250 p-8 text-center text-slate-400">
                    No academic module records exist for this course yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {gradebook.modules.map((mod) => (
                      <div
                        key={mod.moduleId}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        {/* Module Sub-Header */}
                        <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-base font-bold text-slate-800">
                            {mod.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Module total:</span>
                            <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                              {mod.total.points.toFixed(1)} / {mod.total.maxPoints.toFixed(1)} pts
                            </span>
                          </div>
                        </div>

                        {/* Assignments Table/List */}
                        {mod.assignments.length === 0 ? (
                          <div className="p-6 text-center text-sm text-slate-400">
                            No assignments are published in this module.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {mod.assignments.map((assignment) => (
                              <div
                                key={assignment.assignmentId}
                                className="p-6 space-y-4 hover:bg-slate-50/50 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center flex-wrap gap-2.5">
                                      <Link
                                        href={`/assignments/${assignment.assignmentId}`}
                                        className="text-sm font-bold text-slate-800 hover:text-indigo-650 hover:underline transition"
                                      >
                                        {assignment.title}
                                      </Link>
                                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getTypeBadgeColor(
                                        assignment.type
                                      )}`}>
                                        {assignment.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-450">
                                      <span>Status:</span>
                                      <span className="font-semibold uppercase text-slate-600">
                                        {assignment.status?.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Score Points Display */}
                                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                                    <div className="text-right">
                                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                                        Grade Points
                                      </span>
                                      <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-lg font-extrabold text-slate-800">
                                          {assignment.points !== undefined && assignment.points !== null
                                            ? assignment.points.toFixed(1)
                                            : '-'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-semibold">
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
                                  <div className="rounded-xl bg-indigo-50/40 dark:bg-slate-950/20 border border-indigo-100/50 p-4 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-indigo-500 shrink-0" /> Instructor Comments
                                    </span>
                                    <p className="text-xs text-slate-650 italic leading-relaxed whitespace-pre-wrap">
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
            <div className="rounded-xl border border-dashed border-slate-250 p-12 text-center text-slate-400">
              Select an active course above to review your grade details.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-250 p-12 text-center max-w-lg mx-auto mt-12 space-y-4">
          {globalRole === 'ADMIN' ? (
            <>
              <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-700">No Active Student Enrollments</h2>
              <p className="text-sm text-slate-450 leading-relaxed">
                Administrators do not have student gradebooks unless enrolled as a student.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-md"
                >
                  Go to Admin Dashboard <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : globalRole === 'TEACHER' ? (
            <>
              <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-700">No Student Gradebooks Found</h2>
              <p className="text-sm text-slate-450 leading-relaxed">
                You are registered as a Teacher and have no active student course enrollments.
              </p>
              <div className="pt-2">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-md"
                >
                  Go to Teaching Courses <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <BookOpenIcon className="mx-auto h-12 w-12 text-slate-350" />
              <h2 className="text-lg font-bold text-slate-700">No Student Gradebooks Found</h2>
              <p className="text-sm text-slate-450 leading-relaxed">
                You do not currently have any active student course enrollments. Click below to review your courses or check back once enrolled.
              </p>
              <div className="pt-2">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-md"
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
