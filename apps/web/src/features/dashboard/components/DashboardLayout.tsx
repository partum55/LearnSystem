'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { CourseSummaryDto, UpcomingDeadlineDto } from '@/features/courses/api/canonical.types';
import type { UserProfileDto } from '@/features/users/api/users.types';

export function DashboardLayout({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="rounded-lg border p-5 md:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const color = tone === 'success' ? 'var(--fn-success)' : tone === 'warning' ? 'var(--fn-warning)' : tone === 'danger' ? 'var(--fn-error)' : 'var(--text-primary)';
  return (
    <article className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <p className="mt-3 text-3xl font-semibold" style={{ color }}>{value}</p>
      </div>
    </article>
  );
}

export function SectionHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="card-header flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function DashboardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn btn-primary">
      {label}
      <ArrowRightIcon className="h-4 w-4" />
    </Link>
  );
}

export function CourseSummaryCard({ course, staff = false }: { course: CourseSummaryDto; staff?: boolean }) {
  return (
    <Link href={`/courses/${course.id}`} className="block rounded-lg border p-4 transition-colors" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{course.title}</p>
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{course.description || 'No course description yet.'}</p>
        </div>
        <span className="badge">{course.status}</span>
      </div>
      {!staff && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(course.progress ?? 0, 100))}%`, background: 'var(--text-primary)' }} />
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>{course.progress ?? 0}% complete</p>
        </div>
      )}
    </Link>
  );
}

export function DeadlineCard({ deadline }: { deadline: UpcomingDeadlineDto }) {
  return (
    <Link href={`/assignments/${deadline.assignmentId}`} className="block rounded-lg border p-3 transition-colors" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-medium">{deadline.title}</p>
        <span className="badge badge-warning">{deadline.type.replace('_', ' ')}</span>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{deadline.courseTitle}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--fn-warning)' }}>
        {deadline.dueDate ? new Date(deadline.dueDate).toLocaleString() : 'No due date'}
      </p>
    </Link>
  );
}

export function Shortcut({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="block rounded-lg border p-3 transition-colors" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </Link>
  );
}

export function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={compact ? 'py-5 text-center' : 'col-span-full py-10 text-center'}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );
}

export function DashboardError() {
  return (
    <section className="card mx-auto max-w-3xl">
      <div className="card-body flex gap-4">
        <ExclamationTriangleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--fn-error)' }} />
        <div>
          <h1 className="text-lg font-semibold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            The dashboard data could not be loaded. Refresh the page or sign in again.
          </p>
        </div>
      </div>
    </section>
  );
}

export function displayName(user: UserProfileDto) {
  return user.displayName || user.firstName || user.email;
}
