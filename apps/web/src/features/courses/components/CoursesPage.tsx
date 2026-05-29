'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { useCoursesList, useCreateCourse } from '@/features/courses/hooks/useCourseQueries';
import type { CourseSummaryDto, CreateCourseRequest } from '@/features/courses/api/canonical.types';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

type CourseListTab = 'ACTIVE' | 'ARCHIVED';
type ActiveStatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

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

function courseStatus(course: CourseSummaryDto) {
  const status = String(course.status || 'DRAFT').toUpperCase();
  return status === 'ARCHIVED' || status === 'PUBLISHED' ? status : 'DRAFT';
}

export function CoursesPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const role = String(currentUser?.globalRole ?? currentUser?.role ?? '').toUpperCase();
  const canCreateCourses = role === 'ADMIN' || role === 'TEACHER';

  const { data: activeCourses, isLoading: isActiveLoading, error: activeError } = useCoursesList(
    undefined,
    Boolean(currentUser)
  );
  const { data: archivedCourses, isLoading: isArchivedLoading, error: archivedError } = useCoursesList(
    { status: 'ARCHIVED' },
    Boolean(currentUser)
  );
  const createCourse = useCreateCourse();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<CourseListTab>('ACTIVE');
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CreateCourseRequest>({
    code: '',
    titleUk: '',
    titleEn: '',
    descriptionUk: '',
    descriptionEn: '',
  });

  const filteredActiveCourses = useMemo(() => {
    return (activeCourses ?? []).filter((course) => {
      const status = courseStatus(course);
      const matchesFilter = statusFilter === 'ALL' || status === statusFilter;
      return matchesFilter && matchesCourseSearch(course, searchTerm);
    });
  }, [activeCourses, searchTerm, statusFilter]);

  const filteredArchivedCourses = useMemo(() => {
    return (archivedCourses ?? []).filter((course) => matchesCourseSearch(course, searchTerm));
  }, [archivedCourses, searchTerm]);

  const selectedCourses = activeTab === 'ARCHIVED' ? filteredArchivedCourses : filteredActiveCourses;
  const visibleCount = selectedCourses.length;
  const totalCount = (activeCourses?.length ?? 0) + (archivedCourses?.length ?? 0);

  const isLoading = isUserLoading || Boolean(currentUser && (isActiveLoading || isArchivedLoading));
  const hasError = userError || activeError || archivedError;

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

  const handleCreateCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const request: CreateCourseRequest = {
      code: courseForm.code.trim().toUpperCase(),
      titleUk: courseForm.titleUk.trim(),
      titleEn: courseForm.titleEn?.trim() || undefined,
      descriptionUk: courseForm.descriptionUk?.trim() || undefined,
      descriptionEn: courseForm.descriptionEn?.trim() || undefined,
    };

    if (!request.code || !request.titleUk) {
      setCreateError('Course code and title are required.');
      return;
    }

    try {
      const createdCourse = await createCourse.mutateAsync(request);
      setIsCreateOpen(false);
      setCourseForm({
        code: '',
        titleUk: '',
        titleEn: '',
        descriptionUk: '',
        descriptionEn: '',
      });
      router.push(`/courses/${createdCourse.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create course.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <section
        className="rounded-lg border p-5 md:p-6"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              My workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Courses</h1>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Review active courses, open archived courses, and manage course drafts through the canonical course model.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Visible</span>
              <span className="ml-2 font-semibold">{visibleCount}</span>
              <span className="mx-1" style={{ color: 'var(--text-faint)' }}>/</span>
              <span style={{ color: 'var(--text-muted)' }}>{totalCount}</span>
            </div>

            {canCreateCourses && (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => router.push('/courses/ai-create')}>
                  Create course with AI
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon className="h-4 w-4" />
                  Create course
                </button>
              </>
            )}

            {canCreateCourses && (
              <Link href="/teacher/todo" className="btn btn-secondary">
                <BookOpenIcon className="h-4 w-4" />
                Teaching workspace
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                className="input"
                style={{ paddingLeft: '2.5rem', paddingRight: searchTerm ? '2.5rem' : '0.75rem' }}
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={activeTab === 'ACTIVE' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                Active Courses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ARCHIVED')}
                className={activeTab === 'ARCHIVED' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                <ArchiveBoxIcon className="h-4 w-4" />
                Archived Courses
              </button>
            </div>
          </div>

          {activeTab === 'ACTIVE' && (
            <div className="flex flex-wrap gap-2">
              <FilterButton active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>All</FilterButton>
              <FilterButton active={statusFilter === 'PUBLISHED'} onClick={() => setStatusFilter('PUBLISHED')}>Published</FilterButton>
              <FilterButton active={statusFilter === 'DRAFT'} onClick={() => setStatusFilter('DRAFT')}>Draft</FilterButton>
            </div>
          )}
        </div>
      </section>

      <CourseSection
        title={activeTab === 'ARCHIVED' ? 'Archived Courses' : 'Active Courses'}
        count={selectedCourses.length}
        courses={selectedCourses}
        emptyTitle={activeTab === 'ARCHIVED' ? 'No archived courses.' : 'No active courses'}
        emptyDescription={activeTab === 'ARCHIVED' ? 'Archived courses will appear here.' : 'Courses will appear after you are added as a member.'}
        archived={activeTab === 'ARCHIVED'}
      />

      {canCreateCourses && isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          style={{ background: 'color-mix(in srgb, var(--bg-base) 78%, transparent)' }}
        >
          <form onSubmit={handleCreateCourse} className="card w-full max-w-2xl shadow-2xl">
            <div className="card-header flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Create course</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  New courses are created as drafts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
                className="btn btn-ghost"
                aria-label="Close create course dialog"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="card-body space-y-4">
              {createError && (
                <div
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--fn-error)' }}
                >
                  {createError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="input-group">
                  <span className="label">Course code</span>
                  <input
                    className="input"
                    value={courseForm.code}
                    onChange={(event) => setCourseForm((form) => ({ ...form, code: event.target.value }))}
                    placeholder="CS101"
                    maxLength={30}
                    required
                  />
                </label>
                <label className="input-group">
                  <span className="label">Course title</span>
                  <input
                    className="input"
                    value={courseForm.titleUk}
                    onChange={(event) => setCourseForm((form) => ({ ...form, titleUk: event.target.value }))}
                    placeholder="Programming Basics"
                    maxLength={255}
                    required
                  />
                </label>
              </div>

              <label className="input-group">
                <span className="label">English title</span>
                <input
                  className="input"
                  value={courseForm.titleEn}
                  onChange={(event) => setCourseForm((form) => ({ ...form, titleEn: event.target.value }))}
                  placeholder="Programming Basics"
                  maxLength={255}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="input-group">
                  <span className="label">Description</span>
                  <textarea
                    className="input min-h-28 resize-y"
                    value={courseForm.descriptionUk}
                    onChange={(event) => setCourseForm((form) => ({ ...form, descriptionUk: event.target.value }))}
                    placeholder="Short course description"
                  />
                </label>
                <label className="input-group">
                  <span className="label">English description</span>
                  <textarea
                    className="input min-h-28 resize-y"
                    value={courseForm.descriptionEn}
                    onChange={(event) => setCourseForm((form) => ({ ...form, descriptionEn: event.target.value }))}
                    placeholder="Short course description"
                  />
                </label>
              </div>
            </div>

            <div className="card-footer flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createCourse.isPending}>
                <PlusIcon className="h-4 w-4" />
                {createCourse.isPending ? 'Creating...' : 'Create course'}
              </button>
            </div>
          </form>
        </div>
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
  children: ReactNode;
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
  archived,
}: {
  title: string;
  count: number;
  courses: CourseSummaryDto[];
  emptyTitle: string;
  emptyDescription: string;
  archived: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: archived ? 'var(--text-faint)' : 'var(--fn-success)' }}
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
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}

function CourseCard({ course }: { course: CourseSummaryDto }) {
  const progress = clampProgress(course.progress);
  const completed = progress >= 100;
  const status = courseStatus(course);

  return (
    <Link href={`/courses/${course.id}`} className="anim-stagger-item card block h-full">
      <div
        className="h-1"
        style={{
          background:
            status === 'ARCHIVED'
              ? 'var(--text-faint)'
              : status === 'PUBLISHED'
                ? 'var(--fn-success)'
                : 'var(--fn-warning)',
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
          <span className={statusBadgeClass(status)}>{status}</span>
        </div>
      </div>
      <div className="card-body space-y-4">
        <p className="line-clamp-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {course.description || 'No course description yet.'}
        </p>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <UserCircleIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{course.teacherName || 'Course member'}</span>
          </span>
          {course.grade !== null && course.grade !== undefined && (
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {course.grade}%
            </span>
          )}
        </div>

        {status === 'PUBLISHED' && (
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

function statusBadgeClass(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'badge badge-success';
    case 'ARCHIVED':
      return 'badge';
    default:
      return 'badge badge-warning';
  }
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
