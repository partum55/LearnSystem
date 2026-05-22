'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import {
  useCourseMembers,
  useCourseModules,
  useCourseOverview,
} from '@/features/courses/hooks/useCourseQueries';
import { useStudentGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import type { CourseMemberDto, CourseModuleDto } from '@/features/courses/api/canonical.types';

interface CourseDetailPageProps {
  courseId: string;
}

type TabId = 'overview' | 'modules' | 'grades' | 'members';

const tabs: Array<{ id: TabId; label: string; icon: typeof BookOpenIcon }> = [
  { id: 'overview', label: 'Overview', icon: BookOpenIcon },
  { id: 'modules', label: 'Modules', icon: Squares2X2Icon },
  { id: 'grades', label: 'Grades', icon: ChartBarIcon },
  { id: 'members', label: 'Members', icon: UserGroupIcon },
];

const emptyModules: CourseModuleDto[] = [];
const emptyMembers: CourseMemberDto[] = [];

function userRole(role?: string | null, globalRole?: string | null) {
  return String(globalRole ?? role ?? '').toUpperCase();
}

function courseCode(courseId: string) {
  return courseId.slice(0, 8).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [todoToast, setTodoToast] = useState<string | null>(null);

  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: overview, isLoading: isOverviewLoading, error: overviewError } = useCourseOverview(courseId);
  const { data: modulesData, isLoading: isModulesLoading, error: modulesError } = useCourseModules(courseId);
  const { data: membersPage } = useCourseMembers(courseId, { size: 100 });
  const { data: gradebook } = useStudentGradebook(courseId);

  const globalRole = userRole(currentUser?.role, currentUser?.globalRole);
  const modules = modulesData?.items ?? emptyModules;
  const members = membersPage?.content ?? emptyMembers;

  const currentCourseMember = useMemo(() => {
    if (!currentUser) return null;
    return members.find((member) => member.userId === currentUser.id) ?? null;
  }, [members, currentUser]);

  const courseRole = currentCourseMember?.roleInCourse;
  const isCourseStaff = globalRole === 'ADMIN' || courseRole === 'OWNER' || courseRole === 'TEACHER' || courseRole === 'TA';

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      [member.userName, member.userEmail, member.roleInCourse, member.enrollmentStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [members, memberSearch]);

  const isForbidden = useMemo(() => {
    const err = overviewError as { status?: number; response?: { status?: number } } | null;
    return (err?.status || err?.response?.status) === 403;
  }, [overviewError]);

  const isLoading = isUserLoading || isOverviewLoading || isModulesLoading;
  const hasError = (overviewError && !isForbidden) || modulesError;

  const showToast = (message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  };

  if (isLoading) {
    return <Loading label="Loading course..." />;
  }

  if (isForbidden) {
    return (
      <section className="card mx-auto max-w-2xl">
        <div className="card-body text-center">
          <AcademicCapIcon className="mx-auto h-10 w-10" style={{ color: 'var(--fn-warning)' }} />
          <h1 className="mt-4 text-lg font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            This course is available only to enrolled students and authorized teaching staff.
          </p>
          <Link href="/courses" className="btn btn-secondary mt-5 inline-flex">
            Return to courses
          </Link>
        </div>
      </section>
    );
  }

  if (hasError || !overview) {
    return (
      <section className="card mx-auto max-w-3xl">
        <div className="card-body">
          <h1 className="text-lg font-semibold">Failed to load course</h1>
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
      {todoToast && (
        <div
          className="fixed bottom-5 right-5 z-50 rounded-md border px-4 py-3 text-sm shadow-lg"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          {todoToast}
        </div>
      )}

      <CourseHeader
        courseId={courseId}
        title={overview.title}
        description={overview.description}
        teacherName={overview.teacherName}
        moduleCount={modules.length}
        progress={overview.progress}
        courseRole={courseRole}
      />

      {isCourseStaff && <StaffToolbar courseId={courseId} onTodo={showToast} />}

      <nav className="flex flex-wrap gap-2 border-b pb-0" style={{ borderColor: 'var(--border-default)' }}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            count={tab.id === 'modules' ? modules.length : tab.id === 'members' ? members.length : undefined}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {activeTab === 'overview' && (
        <OverviewPanel
          description={overview.description}
          deadlines={overview.upcomingDeadlines ?? []}
          feedback={overview.recentFeedback ?? []}
        />
      )}

      {activeTab === 'modules' && <ModulesPanel modules={modules} courseId={courseId} isCourseStaff={isCourseStaff} />}

      {activeTab === 'grades' && (
        <GradesPanel courseId={courseId} isCourseStaff={isCourseStaff} gradebook={gradebook} />
      )}

      {activeTab === 'members' && (
        <MembersPanel members={filteredMembers} search={memberSearch} onSearch={setMemberSearch} />
      )}
    </div>
  );
}

function CourseHeader({
  courseId,
  title,
  description,
  teacherName,
  moduleCount,
  progress,
  courseRole,
}: {
  courseId: string;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  moduleCount: number;
  progress?: number | null;
  courseRole?: string | null;
}) {
  return (
    <header className="rounded-lg border p-5 md:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="badge">Course code: {courseCode(courseId)}</span>
            {courseRole && <span className="badge">{courseRole}</span>}
          </div>
          <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {description || 'No course description has been registered yet.'}
          </p>
        </div>

        <div className="grid min-w-72 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
          <Metric label="Instructor" value={teacherName || 'Faculty'} />
          <Metric label="Modules" value={String(moduleCount)} />
          <Metric label="Progress" value={`${progress ?? 0}%`} />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function StaffToolbar({ courseId, onTodo }: { courseId: string; onTodo: (message: string) => void }) {
  return (
    <section className="card">
      <div className="card-body flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--bg-overlay)' }}>
            <Cog6ToothIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Course staff tools</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage modules, learning items, assignments and members.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => onTodo('Module editor is not wired in this pass yet.')}>
            Manage modules
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onTodo('Learning item builder is not wired in this pass yet.')}>
            + Learning item
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onTodo('Assignment builder is not wired in this pass yet.')}>
            + Assignment
          </button>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-secondary">
            Open gradebook
          </Link>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  tab,
  active,
  count,
  onClick,
}: {
  tab: { id: TabId; label: string; icon: typeof BookOpenIcon };
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
      style={{
        borderColor: active ? 'var(--text-primary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
      {count !== undefined && <span style={{ color: 'var(--text-faint)' }}>({count})</span>}
    </button>
  );
}

function OverviewPanel({
  description,
  deadlines,
  feedback,
}: {
  description?: string | null;
  deadlines: Array<{ assignmentId: string; title: string; dueDate?: string | null }>;
  feedback: string[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-6">
        <section className="card">
          <div className="card-header">
            <SectionTitle icon={DocumentTextIcon} title="About course" />
          </div>
          <div className="card-body">
            <p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              {description || 'No summary syllabus has been provided for this course.'}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <SectionTitle icon={ChatBubbleLeftRightIcon} title="Recent feedback" />
          </div>
          <div className="card-body space-y-3">
            {feedback.length > 0 ? (
              feedback.map((item, index) => (
                <p key={`${item}-${index}`} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  {item}
                </p>
              ))
            ) : (
              <EmptyState title="No feedback yet" description="Recent instructor comments will appear here." />
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <SectionTitle icon={ClockIcon} title="Upcoming due dates" />
        </div>
        <div className="card-body space-y-3">
          {deadlines.length > 0 ? (
            deadlines.map((deadline) => (
              <Link
                key={deadline.assignmentId}
                href={`/assignments/${deadline.assignmentId}`}
                className="block rounded-md border px-3 py-2 transition-colors"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
              >
                <p className="text-sm font-medium">{deadline.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(deadline.dueDate)}</p>
              </Link>
            ))
          ) : (
            <EmptyState title="No close due dates" description="Assignments with upcoming deadlines will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}

function ModulesPanel({ modules, courseId, isCourseStaff }: { modules: CourseModuleDto[]; courseId: string; isCourseStaff: boolean }) {
  if (modules.length === 0) {
    return <EmptyState framed title="No modules yet" description="There are no active modules registered for this course." />;
  }

  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <article key={module.id} className="card">
          <div className="card-header flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Module {module.order}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{module.title}</h2>
              {module.description && <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{module.description}</p>}
            </div>
            {isCourseStaff && <span className="badge">{module.availabilityStatus || 'VISIBLE'}</span>}
          </div>

          <div className="card-body grid gap-6 lg:grid-cols-2">
            <ModuleColumn title="Learning materials" count={module.learningItems.length}>
              {module.learningItems.length > 0 ? (
                module.learningItems.map((item) => (
                  <Link key={item.id} href={`/learning-items/${item.id}?courseId=${courseId}`} className="block rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.description || String(item.type).toUpperCase()}
                    </p>
                  </Link>
                ))
              ) : (
                <EmptyState title="No learning items" description="Materials will appear here." />
              )}
            </ModuleColumn>

            <ModuleColumn title="Assignments" count={module.assignments.length}>
              {module.assignments.length > 0 ? (
                module.assignments.map((assignment) => (
                  <Link key={assignment.id} href={`/assignments/${assignment.id}`} className="block rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{assignment.title}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {String(assignment.type).replaceAll('_', ' ')} · {assignment.maxPoints} pts
                        </p>
                      </div>
                      <span className="badge">{assignment.grade?.points ?? assignment.status}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="No assignments" description="Assignments will appear here." />
              )}
            </ModuleColumn>
          </div>
        </article>
      ))}
    </div>
  );
}

function ModuleColumn({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function GradesPanel({
  courseId,
  isCourseStaff,
  gradebook,
}: {
  courseId: string;
  isCourseStaff: boolean;
  gradebook?: {
    total: { points: number; maxPoints: number; percentage?: number | null };
    modules: Array<{
      moduleId: string;
      title: string;
      total: { points: number; maxPoints: number };
      assignments: Array<{ assignmentId: string; title: string; points?: number | null; maxPoints: number; status: string; comment?: string | null }>;
    }>;
  };
}) {
  if (isCourseStaff) {
    return (
      <section className="card">
        <div className="card-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Teacher gradebook</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Review students, draft points, and publish grades from the course gradebook.
            </p>
          </div>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-primary">
            Open gradebook
          </Link>
        </div>
      </section>
    );
  }

  if (!gradebook?.modules?.length) {
    return <EmptyState framed title="No grades yet" description="Published grades will appear here after assignments are reviewed." />;
  }

  return (
    <section className="card">
      <div className="card-header flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <SectionTitle icon={ChartBarIcon} title="My grades" />
        <span className="badge">
          Total: {gradebook.total.points}/{gradebook.total.maxPoints}
          {gradebook.total.percentage !== undefined && gradebook.total.percentage !== null ? ` (${gradebook.total.percentage}%)` : ''}
        </span>
      </div>
      <div className="card-body space-y-5">
        {gradebook.modules.map((module) => (
          <section key={module.moduleId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{module.title}</h3>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {module.total.points}/{module.total.maxPoints}
              </span>
            </div>
            <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--border-subtle)' }}>
              <table className="w-full text-left text-sm">
                <thead style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  <tr>
                    <th className="px-3 py-2 font-medium">Assignment</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {module.assignments.map((assignment) => (
                    <tr key={assignment.assignmentId} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-3 py-2">
                        <Link href={`/assignments/${assignment.assignmentId}`} className="font-medium">
                          {assignment.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2"><span className="badge">{assignment.status}</span></td>
                      <td className="px-3 py-2 text-right">{assignment.points ?? '-'}/{assignment.maxPoints}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{assignment.comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function MembersPanel({ members, search, onSearch }: { members: CourseMemberDto[]; search: string; onSearch: (value: string) => void }) {
  return (
    <section className="card">
      <div className="card-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Course members</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Enrolled students and active teaching staff.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search members"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="card-body">
        {members.length > 0 ? (
          <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-left text-sm">
              <thead style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-3 py-2 font-medium">{member.userName || 'Course member'}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{member.userEmail || 'No email'}</td>
                    <td className="px-3 py-2"><span className="badge">{member.roleInCourse}</span></td>
                    <td className="px-3 py-2"><span className="badge">{member.enrollmentStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching members" description="Try another search query." />
        )}
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpenIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function EmptyState({ title, description, framed = false }: { title: string; description: string; framed?: boolean }) {
  const content = (
    <div className="py-8 text-center">
      <BookOpenIcon className="mx-auto h-8 w-8" style={{ color: 'var(--text-faint)' }} />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );

  if (!framed) return content;

  return (
    <section className="card">
      <div className="card-body">{content}</div>
    </section>
  );
}
