'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '@/components';
import { useAdminCourses, useArchiveCourse, useDeleteCourse, useRestoreCourse } from '@/features/courses/hooks/useCourseQueries';
import { useAdminUsers } from '@/features/users/hooks/useUserQueries';
import type { UserProfileDto } from '@/features/users/api/users.types';
import { useServicesHealth } from '@/features/admin/hooks/useAdminMonitoring';
import type { SystemHealthDto } from '@/features/admin/api/admin.api';
import type { AdminCourseDto } from '@/features/courses/api/canonical.types';
import {
  DashboardLayout,
  EmptyState,
  SectionHeader,
  StatCard,
  displayName,
} from './DashboardLayout';
import { EnrollmentGroupsTab } from './EnrollmentGroupsTab';
import { DashboardGrid } from './DashboardGrid';

type AdminTab = 'overview' | 'services' | 'users' | 'courses' | 'groups';

export function AdminDashboard({ currentUser }: { currentUser: UserProfileDto }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const { data: users, isLoading: usersLoading } = useAdminUsers({ size: 12 });
  const { data: courses, isLoading: coursesLoading } = useAdminCourses({ size: 12 });
  const { data: health, isLoading: healthLoading, error: healthError } = useServicesHealth();

  const userCount = users?.totalElements ?? users?.content?.length ?? 0;
  const courseCount = courses?.totalElements ?? courses?.content?.length ?? 0;
  const publishedCourses = courses?.content?.filter((course) => course.status === 'PUBLISHED').length ?? 0;
  const healthyServices = health?.healthyServices ?? 0;
  const unhealthyServices = health?.unhealthyServices ?? 0;

  const tabs = useMemo<Array<{ id: AdminTab; label: string }>>(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'services', label: 'Services' },
      { id: 'users', label: 'Users' },
      { id: 'courses', label: 'Courses' },
      { id: 'groups', label: 'Groups' },
    ],
    [],
  );

  return (
    <DashboardLayout
      eyebrow="Admin dashboard"
      title={`Platform control, ${displayName(currentUser)}`}
      description="Monitor services, users, courses, publishing state, and operational health from the canonical admin surface."
    >
      <section className="grid gap-4 md:grid-cols-5">
        <StatCard icon={UserGroupIcon} label="Users" value={userCount} />
        <StatCard icon={AcademicCapIcon} label="Courses" value={courseCount} />
        <StatCard icon={ShieldCheckIcon} label="Published" value={publishedCourses} tone="success" />
        <StatCard icon={ServerIcon} label="Services up" value={healthError ? 'n/a' : healthyServices} tone={healthError ? 'warning' : 'success'} />
        <StatCard
          icon={ServerIcon}
          label="Services down"
          value={healthError ? 'n/a' : unhealthyServices}
          tone={unhealthyServices > 0 ? 'danger' : 'success'}
        />
      </section>

      <section className="card">
        <div className="card-header flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab.id ? 'var(--bg-active)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="card-body">
            <DashboardGrid dashboardType="ADMIN" />
          </div>
        )}

        {activeTab === 'services' && (
          <div className="card-body">
            <ServicesPanel health={health} loading={healthLoading} error={Boolean(healthError)} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card-body">
            <UsersPanel users={users?.content ?? []} loading={usersLoading} expanded />
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="card-body">
            <CoursesPanel courses={courses?.content ?? []} loading={coursesLoading} expanded />
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="card-body">
            <EnrollmentGroupsTab />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

function ServicesPanel({
  health,
  loading,
  error,
  compact = false,
}: {
  health: SystemHealthDto | undefined;
  loading: boolean;
  error: boolean;
  compact?: boolean;
}) {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <SectionHeader title="Service status" />
      <div className="card-body space-y-3">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Probing services...</p>
        ) : error ? (
          <EmptyState title="Service health unavailable" description="Gateway admin health endpoint did not respond." compact />
        ) : health?.services?.length ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <MiniMetric label="Total" value={health.totalServices} />
              <MiniMetric label="Healthy" value={health.healthyServices} tone="success" />
              <MiniMetric label="Issues" value={health.unhealthyServices} tone={health.unhealthyServices > 0 ? 'danger' : 'success'} />
            </div>
            <div className="space-y-2">
              {health.services.slice(0, compact ? 5 : health.services.length).map((service) => (
                <div key={service.instanceId} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{service.serviceName}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{service.host}:{service.port}</p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="No service data" description="No services were returned by the gateway." compact />
        )}
      </div>
    </section>
  );
}

function OperationalPanel() {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <SectionHeader title="Admin operations" />
      <div className="card-body grid gap-3 sm:grid-cols-2">
        <AdminShortcut href="/dashboard" icon={UserGroupIcon} label="Users" description="Search users, review roles, and inspect account status." />
        <AdminShortcut href="/dashboard" icon={AcademicCapIcon} label="Courses" description="Review published, draft, and archived course state." />
        <AdminShortcut href="/dashboard" icon={ServerIcon} label="Services" description="Watch gateway service health and degraded dependencies." />
        <AdminShortcut href="/dashboard" icon={CpuChipIcon} label="System info" description="Track JVM/runtime details from the gateway health payload." />
      </div>
    </section>
  );
}

function UsersPanel({ users, loading, expanded = false }: { users: UserProfileDto[]; loading: boolean; expanded?: boolean }) {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <SectionHeader title="Users" />
      <div className={expanded ? 'card-body grid gap-3 md:grid-cols-2' : 'card-body space-y-3'}>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading users...</p>
        ) : users.length ? (
          users.map((user) => (
            <div key={user.id} className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p className="truncate text-sm font-medium">{user.displayName || user.email}</p>
              <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge">{user.role}</span>
                <span className={user.isActive ? 'badge badge-success' : 'badge badge-error'}>{user.isActive ? 'active' : 'inactive'}</span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No users returned" description="The admin users endpoint returned an empty page." compact />
        )}
      </div>
    </section>
  );
}

function CoursesPanel({ courses, loading }: { courses: AdminCourseDto[]; loading: boolean; expanded?: boolean }) {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <SectionHeader title="Courses" />
      <div className="card-body">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading courses...</p>
        ) : courses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="border-b px-3 py-2 text-left font-medium" style={{ borderColor: 'var(--border-subtle)' }}>Course</th>
                  <th className="border-b px-3 py-2 text-left font-medium" style={{ borderColor: 'var(--border-subtle)' }}>Code</th>
                  <th className="border-b px-3 py-2 text-left font-medium" style={{ borderColor: 'var(--border-subtle)' }}>Status</th>
                  <th className="border-b px-3 py-2 text-right font-medium" style={{ borderColor: 'var(--border-subtle)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <AdminCourseRow key={course.id} course={course} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No courses returned" description="The admin courses endpoint returned an empty page." compact />
        )}
      </div>
    </section>
  );
}

function AdminCourseRow({ course }: { course: AdminCourseDto }) {
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | 'restore' | null>(null);
  const archiveCourse = useArchiveCourse(course.id);
  const restoreCourse = useRestoreCourse(course.id);
  const deleteCourse = useDeleteCourse(course.id);
  const title = course.titleEn || course.titleUk;
  const isArchived = course.status === 'ARCHIVED';
  const loading = archiveCourse.isPending || restoreCourse.isPending || deleteCourse.isPending;

  const handleConfirm = async () => {
    if (confirmAction === 'archive') {
      await archiveCourse.mutateAsync();
    } else if (confirmAction === 'restore') {
      await restoreCourse.mutateAsync();
    } else if (confirmAction === 'delete') {
      await deleteCourse.mutateAsync();
    }
    setConfirmAction(null);
  };

  return (
    <>
      <tr className="align-middle">
        <td className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="max-w-[320px] truncate font-medium">{title}</p>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{course.id}</p>
        </td>
        <td className="border-b px-3 py-3 font-mono text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          {course.code}
        </td>
        <td className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex flex-wrap gap-2">
            <span className={course.status === 'PUBLISHED' ? 'badge badge-success' : course.status === 'ARCHIVED' ? 'badge badge-error' : 'badge badge-warning'}>
              {course.status}
            </span>
          </div>
        </td>
        <td className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex justify-end gap-2">
            <Link href={`/courses/${course.id}`} className="btn btn-secondary btn-sm" title="Open course">
              <EyeIcon className="h-4 w-4" />
            </Link>
            <Link href={`/courses/${course.id}?tab=settings`} className="btn btn-secondary btn-sm" title="Course settings">
              <Cog6ToothIcon className="h-4 w-4" />
            </Link>
            <Link href={`/courses/${course.id}?tab=settings`} className="btn btn-secondary btn-sm" title="Edit course">
              <PencilSquareIcon className="h-4 w-4" />
            </Link>
            {isArchived ? (
              <button type="button" className="btn btn-secondary btn-sm" title="Restore course" disabled={loading} onClick={() => setConfirmAction('restore')}>
                Restore
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" title="Archive course" disabled={loading} onClick={() => setConfirmAction('archive')}>
                <ArchiveBoxIcon className="h-4 w-4" />
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" title="Delete course" disabled={loading} onClick={() => setConfirmAction('delete')}>
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      <CourseAdminActionModal
        action={confirmAction}
        courseTitle={title}
        courseCode={course.code}
        loading={loading}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

function CourseAdminActionModal({
  action,
  courseTitle,
  courseCode,
  loading,
  onClose,
  onConfirm,
}: {
  action: 'archive' | 'delete' | 'restore' | null;
  courseTitle: string;
  courseCode: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  useEffect(() => {
    setConfirmText('');
  }, [action]);

  if (!action) return null;

  const requiredText = action === 'archive' ? 'ARCHIVE' : action === 'delete' ? 'DELETE' : 'RESTORE';
  const title = action === 'archive' ? 'Archive Course' : action === 'delete' ? 'Delete Course' : 'Restore Course';
  const body = action === 'delete'
    ? 'This permanently deletes the course and its associated course data. This action cannot be undone.'
    : action === 'archive'
      ? 'The course will be hidden from active course flows while modules, assignments, submissions, and grades stay stored.'
      : 'The archived course will be restored as a draft so admins can review it before publishing.';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (confirmText !== requiredText) return;
    await onConfirm();
  };

  return (
    <Modal isOpen={Boolean(action)} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <p className="text-sm font-semibold">{courseTitle} ({courseCode})</p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{body}</p>
        </div>
        <Input
          label={`Type ${requiredText} to confirm`}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={requiredText}
          disabled={loading}
        />
        <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant={action === 'delete' ? 'danger' : 'secondary'} disabled={confirmText !== requiredText || loading} isLoading={loading}>
            {title}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MiniMetric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--fn-success)' : tone === 'danger' ? 'var(--fn-error)' : 'var(--text-primary)';
  return (
    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className = status === 'UP' ? 'badge badge-success' : status === 'DOWN' ? 'badge badge-error' : 'badge badge-warning';
  return <span className={className}>{status.toLowerCase()}</span>;
}

function AdminShortcut({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </Link>
  );
}
