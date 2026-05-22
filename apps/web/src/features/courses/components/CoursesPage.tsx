'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { useActiveCourses, useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import type { CourseSummaryDto } from '@/features/courses/api/canonical.types';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

type CourseTab = 'ENROLLED' | 'TEACHING';
type StudentFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';
type TeacherFilter = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

const isPublishedStatus = (status?: string | null) => (status || '').toUpperCase() === 'PUBLISHED';

function matchesCourseSearch(course: CourseSummaryDto, searchTerm: string) {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;
  return (
    course.title.toLowerCase().includes(query) ||
    (course.description || '').toLowerCase().includes(query) ||
    (course.teacherName || '').toLowerCase().includes(query) ||
    course.id.toLowerCase().includes(query)
  );
}

function courseCode(course: CourseSummaryDto) {
  return course.id.slice(0, 8).toUpperCase();
}

function clampProgress(value?: number | null) {
  return Math.max(0, Math.min(value ?? 0, 100));
}

export function CoursesPage() {
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const { data: activeCourses, isLoading: isActiveLoading, error: activeError } = useActiveCourses();
  const { data: teachingCourses, isLoading: isTeachingLoading, error: teachingError } = useTeachingCourses();

  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<TeacherFilter>('ALL');
  const [activeTab, setActiveTab] = useState<CourseTab>('ENROLLED');

  const role = currentUser?.globalRole ?? currentUser?.role;
  const showStudentSection = role === 'USER' || role === 'ADMIN';
  const showTeacherSection = role === 'TEACHER' || role === 'ADMIN';
  const selectedTab = showTeacherSection && !showStudentSection ? 'TEACHING' : activeTab;

  const filteredActiveCourses = useMemo(() => {
    return (activeCourses ?? []).filter((course) => {
      const progress = clampProgress(course.progress);
      const matchesFilter =
        studentFilter === 'ALL' ||
        (studentFilter === 'COMPLETED' ? progress >= 100 : progress < 100);
      return matchesCourseSearch(course, searchTerm) && matchesFilter;
    });
  }, [activeCourses, searchTerm, studentFilter]);

  const filteredTeachingCourses = useMemo(() => {
    return (teachingCourses ?? []).filter((course) => {
      const status = (course.status || '').toUpperCase();
      const matchesFilter = teacherFilter === 'ALL' || teacherFilter === status;
      return matchesCourseSearch(course, searchTerm) && matchesFilter;
    });
  }, [teachingCourses, searchTerm, teacherFilter]);

  const visibleCount =
    selectedTab === 'TEACHING' ? filteredTeachingCourses.length : filteredActiveCourses.length;
  const totalCount =
    (showStudentSection ? activeCourses?.length ?? 0 : 0) +
    (showTeacherSection ? teachingCourses?.length ?? 0 : 0);
  const isLoading =
    isUserLoading ||
    (showStudentSection && isActiveLoading) ||
    (showTeacherSection && isTeachingLoading);
  const hasError = userError || (showStudentSection && activeError) || (showTeacherSection && teachingError);

  if (isLoading) {
    return <Loading label="Loading courses..." />;
  }

  if (hasError || !currentUser) {
    return (
      <section className="card mx-auto max-w-3xl">
        <div className="card-body">
          <h1 className="text-lg font-semibold">Courses unavailable</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            The canonical course endpoints did not return a usable response.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary mt-4">
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Courses</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {visibleCount} visible of {totalCount} canonical courses
          </p>
        </div>
        {showTeacherSection && (
          <Link href="/teacher/todo" className="btn btn-secondary self-start md:self-auto">
            <BookOpenIcon className="h-4 w-4" />
            Teaching workspace
          </Link>
        )}
      </header>

      <section className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                className="input pl-10 pr-10"
                placeholder="Search courses"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {showStudentSection && showTeacherSection && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ENROLLED')}
                  className={selectedTab === 'ENROLLED' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  Enrolled
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TEACHING')}
                  className={selectedTab === 'TEACHING' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  Teaching
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedTab === 'ENROLLED' ? (
              <>
                <FilterButton active={studentFilter === 'ALL'} onClick={() => setStudentFilter('ALL')}>All</FilterButton>
                <FilterButton active={studentFilter === 'ACTIVE'} onClick={() => setStudentFilter('ACTIVE')}>In progress</FilterButton>
                <FilterButton active={studentFilter === 'COMPLETED'} onClick={() => setStudentFilter('COMPLETED')}>Completed</FilterButton>
              </>
            ) : (
              <>
                <FilterButton active={teacherFilter === 'ALL'} onClick={() => setTeacherFilter('ALL')}>All</FilterButton>
                <FilterButton active={teacherFilter === 'PUBLISHED'} onClick={() => setTeacherFilter('PUBLISHED')}>Published</FilterButton>
                <FilterButton active={teacherFilter === 'DRAFT'} onClick={() => setTeacherFilter('DRAFT')}>Draft</FilterButton>
                <FilterButton active={teacherFilter === 'ARCHIVED'} onClick={() => setTeacherFilter('ARCHIVED')}>Archived</FilterButton>
              </>
            )}
          </div>
        </div>
      </section>

      {selectedTab === 'ENROLLED' ? (
        <CourseSection
          title="My Courses"
          count={filteredActiveCourses.length}
          courses={filteredActiveCourses}
          emptyTitle="No courses"
          emptyDescription="Courses will appear after enrollment."
          variant="student"
        />
      ) : (
        <CourseSection
          title="Teaching Courses"
          count={filteredTeachingCourses.length}
          courses={filteredTeachingCourses}
          emptyTitle="No teaching courses"
          emptyDescription="Courses where you teach will appear here."
          variant="teacher"
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={active ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
      {children}
    </button>
  );
}

function CourseSection({
  title,
  count,
  courses,
  emptyTitle,
  emptyDescription,
  variant,
}: {
  title: string;
  count: number;
  courses: CourseSummaryDto[];
  emptyTitle: string;
  emptyDescription: string;
  variant: 'student' | 'teacher';
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: variant === 'teacher' ? 'var(--fn-success)' : 'var(--text-secondary)' }}
        />
        <h2 className="text-lg font-semibold">
          {title} ({count})
        </h2>
      </div>

      {courses.length === 0 ? (
        <EmptyCourses title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="anim-stagger grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}

function CourseCard({ course, variant }: { course: CourseSummaryDto; variant: 'student' | 'teacher' }) {
  const progress = clampProgress(course.progress);
  const completed = progress >= 100;
  const published = isPublishedStatus(course.status);

  return (
    <Link href={`/courses/${course.id}`} className="anim-stagger-item card block h-full">
      <div
        className="h-1"
        style={{
          background:
            variant === 'teacher'
              ? published
                ? 'var(--fn-success)'
                : 'var(--fn-warning)'
              : completed
                ? 'var(--fn-success)'
                : 'var(--text-secondary)',
        }}
      />
      <div className="card-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              {courseCode(course)}
            </p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold">{course.title}</h3>
          </div>
          <span className={statusBadgeClass(variant, completed, published)}>
            {variant === 'teacher' ? course.status || 'draft' : completed ? 'completed' : 'active'}
          </span>
        </div>
      </div>
      <div className="card-body space-y-4">
        <p className="line-clamp-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {course.description || 'No course description yet.'}
        </p>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            {variant === 'teacher' ? <BookOpenIcon className="h-4 w-4 shrink-0" /> : <UserCircleIcon className="h-4 w-4 shrink-0" />}
            <span className="truncate">{variant === 'teacher' ? 'Course staff access' : course.teacherName || 'Instructor'}</span>
          </span>
          {course.grade !== null && course.grade !== undefined && (
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {course.grade}%
            </span>
          )}
        </div>

        {variant === 'student' && (
          <div>
            <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress}%`, background: completed ? 'var(--fn-success)' : 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function statusBadgeClass(variant: 'student' | 'teacher', completed: boolean, published: boolean) {
  if (variant === 'teacher') {
    return published ? 'badge badge-success' : 'badge badge-warning';
  }
  return completed ? 'badge badge-success' : 'badge';
}

function EmptyCourses({ title, description }: { title: string; description: string }) {
  return (
    <section className="card">
      <div className="card-body py-14 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          <AcademicCapIcon className="h-6 w-6" />
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
