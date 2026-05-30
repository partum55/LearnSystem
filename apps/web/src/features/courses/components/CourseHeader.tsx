'use client';

import { StatusBadge, RoleBadge } from './CoursesPage';

interface CourseHeaderProps {
  courseId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  courseRole?: string | null;
}

function courseCode(courseId: string) {
  return courseId.slice(0, 8).toUpperCase();
}

export function CourseHeader({
  courseId,
  title,
  description,
  status,
  progress,
  courseRole,
}: CourseHeaderProps) {
  const progressValue = Math.max(0, Math.min(100, progress ?? 0));
  const normalizedStatus = String(status || 'DRAFT').toUpperCase();
  const completed = progressValue >= 100;

  const accentColor =
    normalizedStatus === 'PUBLISHED'
      ? 'var(--accent)'
      : normalizedStatus === 'ARCHIVED'
        ? 'var(--status-arch)'
        : 'var(--status-draft)';

  return (
    <header style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Left vertical color bar */}
        <div
          style={{
            width: 4,
            alignSelf: 'stretch',
            minHeight: 54,
            borderRadius: 3,
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Code + badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="text-[12px] font-medium"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              {courseCode(courseId)}
            </span>
            <StatusBadge status={normalizedStatus} />
            {courseRole && <RoleBadge role={courseRole} />}
          </div>

          {/* Title */}
          <h1
            className="font-semibold"
            style={{ fontSize: 23, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 8 }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            {description || 'No course description has been registered yet.'}
          </p>

          {/* Progress bar */}
          {normalizedStatus !== 'DRAFT' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, maxWidth: 400 }}>
              <span
                className="text-[10.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                style={{ color: 'var(--text-faint)' }}
              >
                Progress
              </span>
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: 'var(--bg-overlay)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressValue}%`,
                    height: '100%',
                    background: completed ? 'var(--accent)' : 'var(--accent-dim)',
                    borderRadius: 3,
                    transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)',
                  }}
                />
              </div>
              <span
                className="tabular-nums text-[12px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
              >
                {progressValue}%
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
