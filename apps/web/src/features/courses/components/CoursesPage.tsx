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
import {
  useActiveCourses,
  useAdminCourses,
  useCreateCourse,
  useCoursesList,
  useTeachingCourses,
} from '@/features/courses/hooks/useCourseQueries';
import type { AdminCourseDto, CourseSummaryDto, CreateCourseRequest } from '@/features/courses/api/canonical.types';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

type CourseListTab = 'ACTIVE' | 'ARCHIVED';
type ActiveStatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

function adminToSummary(c: AdminCourseDto): CourseSummaryDto {
  return {
    id: c.id,
    title: c.titleEn ?? c.titleUk,
    description: c.descriptionEn ?? c.descriptionUk ?? null,
    status: c.status,
    teacherName: null,
    progress: 0,
    grade: null,
  };
}

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

function normalizeStatus(course: CourseSummaryDto) {
  const s = String(course.status || 'DRAFT').toUpperCase();
  return s === 'ARCHIVED' || s === 'PUBLISHED' ? s : 'DRAFT';
}

export function CoursesPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const role = String(currentUser?.globalRole ?? currentUser?.role ?? '').toUpperCase();
  const canCreateCourses = role === 'ADMIN' || role === 'TEACHER';
  const isStudent = role === 'USER' || (!canCreateCourses && role !== '');
  const isTeacherRole = role === 'TEACHER';
  const isAdminRole = role === 'ADMIN';

  const { data: studentActive, isLoading: isStudentLoading, error: studentError } = useActiveCourses();
  const { data: teacherCourses, isLoading: isTeacherLoading, error: teacherError } = useTeachingCourses(isTeacherRole);
  const { data: adminPage, isLoading: isAdminLoading, error: adminError } = useAdminCourses(undefined, isAdminRole);
  const { data: archivedCourses, isLoading: isArchivedLoading, error: archivedError } =
    useCoursesList({ status: 'ARCHIVED' }, Boolean(currentUser));

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

  const activeCourses: CourseSummaryDto[] = useMemo(() => {
    if (isAdminRole) return (adminPage?.content ?? []).map(adminToSummary);
    if (isTeacherRole) return teacherCourses ?? [];
    return studentActive ?? [];
  }, [isAdminRole, isTeacherRole, adminPage, teacherCourses, studentActive]);

  const filteredActiveCourses = useMemo(() => {
    return activeCourses.filter((course) => {
      const status = normalizeStatus(course);
      const matchesFilter = statusFilter === 'ALL' || status === statusFilter;
      return matchesFilter && matchesCourseSearch(course, searchTerm);
    });
  }, [activeCourses, searchTerm, statusFilter]);

  const filteredArchivedCourses = useMemo(() => {
    return (archivedCourses ?? []).filter((course) => matchesCourseSearch(course, searchTerm));
  }, [archivedCourses, searchTerm]);

  const selectedCourses = activeTab === 'ARCHIVED' ? filteredArchivedCourses : filteredActiveCourses;
  const visibleCount = selectedCourses.length;
  const totalCount = activeCourses.length + (archivedCourses?.length ?? 0);

  const isLoading = isUserLoading || Boolean(currentUser && (
    (isAdminRole && (isAdminLoading || isArchivedLoading)) ||
    (isTeacherRole && (isTeacherLoading || isArchivedLoading)) ||
    (isStudent && (isStudentLoading || isArchivedLoading))
  ));
  const hasError = userError || studentError || teacherError || adminError || archivedError;

  if (isLoading) {
    return <Loading label="Loading courses..." />;
  }

  if (hasError || !currentUser) {
    return (
      <section className="card mx-auto max-w-3xl">
        <div className="card-body">
          <h1 className="text-lg font-semibold">Courses unavailable</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            The course endpoint did not return a usable response.
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
      const created = await createCourse.mutateAsync(request);
      setIsCreateOpen(false);
      setCourseForm({ code: '', titleUk: '', titleEn: '', descriptionUk: '', descriptionEn: '' });
      router.push(`/courses/${created.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create course.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-faint)' }}>
            {isStudent ? 'My learning' : 'My workspace'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isStudent
              ? 'Courses you are enrolled in.'
              : 'Courses you teach or administer.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Showing</span>
            <span className="mx-1.5 font-semibold tabular-nums">{visibleCount}</span>
            <span style={{ color: 'var(--text-faint)' }}>/</span>
            <span className="mx-1.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>{totalCount}</span>
          </div>
          {canCreateCourses && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/courses/ai-create')}>
                Create with AI
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                New course
              </button>
              <Link href="/teacher/todo" className="btn btn-secondary btn-sm">
                <BookOpenIcon className="h-3.5 w-3.5" />
                Teaching workspace
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tab bar + search */}
      <div className="flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex flex-1 gap-0.5">
          <TabButton active={activeTab === 'ACTIVE'} onClick={() => setActiveTab('ACTIVE')}>
            Active courses <TabCount count={activeCourses.length} />
          </TabButton>
          <TabButton active={activeTab === 'ARCHIVED'} onClick={() => setActiveTab('ARCHIVED')}>
            <ArchiveBoxIcon className="h-3.5 w-3.5" />
            Archived <TabCount count={archivedCourses?.length ?? 0} />
          </TabButton>
        </div>
        <div className="relative mb-2 flex items-center" style={{ minWidth: 200 }}>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5"
            style={{ color: 'var(--text-faint)' }}
          />
          <input
            className="input text-sm"
            style={{ paddingLeft: '2rem', paddingRight: searchTerm ? '2rem' : '0.75rem', height: 30 }}
            placeholder="Filter courses…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Clear search"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status filter — staff only */}
      {activeTab === 'ACTIVE' && canCreateCourses && (
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className="btn btn-sm"
              style={{
                background: statusFilter === f ? 'var(--bg-overlay)' : 'transparent',
                color: statusFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${statusFilter === f ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                fontWeight: statusFilter === f ? 600 : 400,
              }}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Course grid */}
      <CourseSection
        courses={selectedCourses}
        emptyTitle={activeTab === 'ARCHIVED' ? 'No archived courses' : 'No courses yet'}
        emptyDescription={
          activeTab === 'ARCHIVED'
            ? 'Archived courses appear here and remain read-only.'
            : isStudent
              ? 'You will see courses once you are enrolled.'
              : 'Create your first course to get started.'
        }
      />

      {/* Create course modal */}
      {canCreateCourses && isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          style={{ background: 'rgba(6,6,8,0.62)', backdropFilter: 'blur(3px)' }}
        >
          <form onSubmit={handleCreateCourse} className="card w-full max-w-2xl">
            <div className="card-header flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">New course</h2>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Created as a draft. Only staff can see it until published.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsCreateOpen(false); setCreateError(null); }}
                className="btn btn-ghost btn-sm"
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="card-body space-y-4">
              {createError && (
                <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--fn-error)' }}>
                  {createError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="input-group">
                  <span className="label">Course code</span>
                  <input
                    className="input"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="CS101"
                    maxLength={30}
                    required
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                  />
                </label>
                <label className="input-group">
                  <span className="label">Course title</span>
                  <input
                    className="input"
                    value={courseForm.titleUk}
                    onChange={(e) => setCourseForm((f) => ({ ...f, titleUk: e.target.value }))}
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
                  onChange={(e) => setCourseForm((f) => ({ ...f, titleEn: e.target.value }))}
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
                    onChange={(e) => setCourseForm((f) => ({ ...f, descriptionUk: e.target.value }))}
                    placeholder="Short course description"
                  />
                </label>
                <label className="input-group">
                  <span className="label">English description</span>
                  <textarea
                    className="input min-h-28 resize-y"
                    value={courseForm.descriptionEn}
                    onChange={(e) => setCourseForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                    placeholder="Short course description"
                  />
                </label>
              </div>
            </div>

            <div className="card-footer flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsCreateOpen(false); setCreateError(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createCourse.isPending}>
                <PlusIcon className="h-3.5 w-3.5" />
                {createCourse.isPending ? 'Creating…' : 'Create course'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Tab navigation ── */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors"
      style={{
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function TabCount({ count }: { count: number }) {
  return (
    <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-faint)' }}>
      {count}
    </span>
  );
}

/* ── Course section ── */
function CourseSection({
  courses,
  emptyTitle,
  emptyDescription,
}: {
  courses: CourseSummaryDto[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (courses.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <AcademicCapIcon className="h-5 w-5" />
          </div>
          <h4>{emptyTitle}</h4>
          <p>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

/* ── Course card ── */
function CourseCard({ course }: { course: CourseSummaryDto }) {
  const progress = clampProgress(course.progress);
  const completed = progress >= 100;
  const status = normalizeStatus(course);

  const accentColor =
    status === 'PUBLISHED'
      ? 'var(--accent)'
      : status === 'ARCHIVED'
        ? 'var(--status-arch)'
        : 'var(--status-draft)';

  return (
    <Link href={`/courses/${course.id}`} className="card block" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: 15, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Code + badges row */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="text-[11px] font-medium"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}
          >
            {courseCode(course)}
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Title */}
        <h3
          className="line-clamp-2 font-semibold leading-snug"
          style={{ fontSize: 15, letterSpacing: '-0.02em', marginBottom: 6 }}
        >
          {course.title}
        </h3>

        {/* Description */}
        <p
          className="line-clamp-2 flex-1 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {course.description || 'No course description yet.'}
        </p>

        {/* Footer */}
        <div className="mt-3">
          {status === 'PUBLISHED' && (
            <div className="mb-3">
              <div
                className="mb-1.5 h-[3px] overflow-hidden rounded-full"
                style={{ background: 'var(--bg-overlay)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: completed ? 'var(--accent)' : 'var(--accent-dim)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-faint)' }}>
                <span>Progress</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex min-w-0 items-center gap-1.5">
              <UserCircleIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{course.teacherName || 'Course member'}</span>
            </span>
            {course.grade !== null && course.grade !== undefined && (
              <span className="tabular-nums font-medium" style={{ color: 'var(--text-secondary)' }}>
                {course.grade}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Status badge ── */
export function StatusBadge({ status }: { status: string }) {
  const s = String(status).toUpperCase();
  const cls =
    s === 'PUBLISHED'
      ? 'badge-status badge-published'
      : s === 'ARCHIVED'
        ? 'badge-status badge-archived'
        : 'badge-status badge-draft';
  const label =
    s === 'PUBLISHED' ? 'Published' : s === 'ARCHIVED' ? 'Archived' : 'Draft';

  return (
    <span className={cls}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

/* ── Role badge ── */
export function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;
  const r = String(role).toUpperCase();
  const cls =
    r === 'OWNER'
      ? 'role-pill role-pill-owner'
      : r === 'TEACHER'
        ? 'role-pill role-pill-teacher'
        : r === 'TA'
          ? 'role-pill role-pill-ta'
          : 'role-pill role-pill-student';
  const label =
    r === 'OWNER' ? 'Owner' : r === 'TEACHER' ? 'Teacher' : r === 'TA' ? 'TA' : 'Student';

  return <span className={cls}>{label}</span>;
}
