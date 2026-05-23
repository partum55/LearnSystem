'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStudentGradebook } from '../hooks/useGradebookQueries';
import { useActiveCourses } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { StudentGradesView } from './StudentGradesView';

export function StudentGradebookPage() {
  return (
    <Suspense fallback={<Loading label="Loading student gradebook..." />}>
      <StudentGradebookContent />
    </Suspense>
  );
}

function StudentGradebookContent() {
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
              className="input cursor-pointer appearance-none pr-10 font-semibold text-xs"
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
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] shadow-xs">
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
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] shadow-xs">
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
            <StudentGradesView gradebook={gradebook} />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-default)] p-12 text-center text-xs text-[var(--text-faint)]">
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
