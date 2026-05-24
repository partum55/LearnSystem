'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  CpuChipIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAdminCourses } from '@/features/courses/hooks/useCourseQueries';
import { useAdminUsers } from '@/features/users/hooks/useUserQueries';
import type { UserProfileDto } from '@/features/users/api/users.types';
import { useServicesHealth } from '@/features/admin/hooks/useAdminMonitoring';
import type { SystemHealthDto } from '@/features/admin/api/admin.api';
import {
  DashboardLayout,
  EmptyState,
  SectionHeader,
  StatCard,
  displayName,
} from './DashboardLayout';
import { EnrollmentGroupsTab } from './EnrollmentGroupsTab';

type AdminTab = 'overview' | 'services' | 'users' | 'courses' | 'groups';

export function AdminDashboard({ currentUser }: { currentUser: UserProfileDto }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const { data: users, isLoading: usersLoading } = useAdminUsers({ size: 12 });
  const { data: courses, isLoading: coursesLoading } = useAdminCourses({ size: 12 });
  const { data: health, isLoading: healthLoading, error: healthError } = useServicesHealth();

  const userCount = users?.totalElements ?? users?.content?.length ?? 0;
  const courseCount = courses?.totalElements ?? courses?.content?.length ?? 0;
  const publishedCourses = courses?.content?.filter((course) => course.isPublished).length ?? 0;
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
          <div className="card-body grid gap-6 lg:grid-cols-2">
            <ServicesPanel health={health} loading={healthLoading} error={Boolean(healthError)} compact />
            <OperationalPanel />
            <UsersPanel users={users?.content ?? []} loading={usersLoading} />
            <CoursesPanel courses={courses?.content ?? []} loading={coursesLoading} />
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

function CoursesPanel({ courses, loading, expanded = false }: { courses: Array<{ id: string; titleEn?: string | null; titleUk: string; code: string; status: string; isPublished: boolean }>; loading: boolean; expanded?: boolean }) {
  return (
    <section className="rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <SectionHeader title="Courses" />
      <div className={expanded ? 'card-body grid gap-3 md:grid-cols-2' : 'card-body space-y-3'}>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading courses...</p>
        ) : courses.length ? (
          courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="block rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p className="truncate text-sm font-medium">{course.titleEn || course.titleUk}</p>
              <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{course.code}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge">{course.status}</span>
                <span className={course.isPublished ? 'badge badge-success' : 'badge badge-warning'}>{course.isPublished ? 'published' : 'unpublished'}</span>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState title="No courses returned" description="The admin courses endpoint returned an empty page." compact />
        )}
      </div>
    </section>
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
