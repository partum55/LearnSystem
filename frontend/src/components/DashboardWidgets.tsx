import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ClockIcon,
  BellIcon,
  CalendarIcon,
  TrophyIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChartPieIcon,
  FireIcon,
  LinkIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { DashboardWidgetConfig } from './DashboardBuilder';

/* ─────────────────────────── Types ─────────────────────────── */

interface ProgressItem {
  contentId: string;
  contentType: string;
  completedAt: string;
}

interface DashboardData {
  courses?: Array<{ id: string; code: string; title: string; progress?: number; grades?: Array<{ score: number; maxPoints: number }> }>;
  deadlines?: Array<{ course: string; courseCode?: string; title?: string; deadline: string; id?: string }>;
  todayDeadlines?: Array<{ course: string; courseCode?: string; title?: string; deadline: string; id?: string; path?: string }>;
  notifications?: Array<{ id: string; title: string; message: string; createdAt: string; read: boolean }>;
  progressItems?: ProgressItem[];
  [key: string]: unknown;
}

interface WidgetRendererProps {
  widget: DashboardWidgetConfig;
  data?: DashboardData;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, data }) => {
  const span: Record<string, string> = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3',
    full: 'col-span-1 md:col-span-4',
  };

  const content: Record<string, React.ReactNode> = {
    stats: <StatsWidget data={data} />,
    courses: <CoursesWidget data={data} />,
    deadlines: <DeadlinesWidget data={data} />,
    'due-today': <DueTodayWidget data={data} />,
    notifications: <NotificationsWidget data={data} />,
    calendar: <CalendarWidget />,
    progress: <ProgressWidget data={data} />,
    'recent-assignments': <RecentAssignmentsWidget />,
    'study-groups': <StudyGroupsWidget />,
    'grade-distribution': <GradeDistributionWidget data={data} />,
    streak: <StreakWidget data={data} />,
    'completed-today': <CompletedTodayWidget data={data} />,
    'quick-links': <QuickLinksWidget />,
  };

  return <div className={span[widget.size] || 'col-span-1 md:col-span-2'}>{content[widget.type] || <div>Unknown widget</div>}</div>;
};

/* ─────────────────────────── Primitives ─────────────────────────── */

const WidgetShell: React.FC<{ children: React.ReactNode; className?: string; noPad?: boolean }> = ({ children, className = '', noPad }) => (
  <div
    className={`rounded-lg h-full ${className}`}
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
  >
    {noPad ? children : <div className="p-4">{children}</div>}
  </div>
);

const WidgetHeader: React.FC<{ icon: React.ElementType; title: string; action?: React.ReactNode }> = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-faint)' }} />
      <h2 className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>{title}</h2>
    </div>
    {action}
  </div>
);

const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-8">
    {Icon && <Icon className="h-6 w-6 mb-2" style={{ color: 'var(--text-faint)' }} />}
    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{message}</p>
  </div>
);

/* ─── Mini sparkline (pure CSS) ─── */
const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = 'var(--text-muted)' }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            background: color,
            opacity: i === data.length - 1 ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Circular progress ring ─── */
const ProgressRing: React.FC<{ value: number; size?: number; strokeWidth?: number; label?: string }> = ({
  value,
  size = 56,
  strokeWidth = 4,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-overlay)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--text-primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-xs font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {label ?? `${Math.round(value)}%`}
      </span>
    </div>
  );
};

/* ─── Horizontal bar ─── */
const HBar: React.FC<{ value: number; max?: number; color?: string }> = ({ value, max = 100, color = 'var(--text-primary)' }) => (
  <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
    <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%`, background: color }} />
  </div>
);

/* ─── Deadline urgency color ─── */
const deadlineColor = (dateStr: string) => {
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days <= 1) return 'var(--fn-error)';
  if (days <= 3) return 'var(--fn-warning)';
  return 'var(--text-faint)';
};

const deadlineLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return formatDistanceToNow(d, { addSuffix: true });
};

/* ─────────────────────────── Stats ─────────────────────────── */

const StatsWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const courseCount = data?.courses?.length || 0;
  const deadlineCount = data?.deadlines?.length || 0;
  const unreadCount = data?.notifications?.filter(n => !n.read).length || 0;
  const avgProgress = courseCount > 0
    ? Math.round((data?.courses || []).reduce((a, c) => a + (c.progress || 0), 0) / courseCount)
    : 0;

  const stats = [
    { label: t('dashboard.myCourses'), value: courseCount, spark: [2, 3, 5, 4, courseCount, courseCount + 1, courseCount] },
    { label: t('dashboard.upcomingDeadlines'), value: deadlineCount, spark: [1, 3, 2, 4, 3, deadlineCount, deadlineCount] },
    { label: 'Unread', value: unreadCount, spark: [5, 3, 4, 2, 1, unreadCount, unreadCount] },
    { label: 'Avg. Progress', value: `${avgProgress}%`, spark: [20, 35, 40, 55, 50, 60, avgProgress] },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <WidgetShell key={s.label}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
          <div className="flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {s.value}
            </p>
            <div className="w-16">
              <Sparkline data={s.spark} />
            </div>
          </div>
        </WidgetShell>
      ))}
    </div>
  );
};

/* ─────────────────────────── Courses ─────────────────────────── */

const CoursesWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const courses = data?.courses || [];

  return (
    <WidgetShell>
      <WidgetHeader
        icon={AcademicCapIcon}
        title={t('dashboard.myCourses')}
        action={
          <Link to="/courses" className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>
            View all <ChevronRightIcon className="inline h-3 w-3" />
          </Link>
        }
      />
      {courses.length === 0 ? (
        <EmptyState message={t('dashboard.noCourses')} icon={AcademicCapIcon} />
      ) : (
        <div className="space-y-1">
          {courses.slice(0, 5).map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ProgressRing value={course.progress || 0} size={36} strokeWidth={3} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{course.code}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{course.title}</p>
              </div>
              <ChevronRightIcon className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-faint)' }} />
            </Link>
          ))}
        </div>
      )}
    </WidgetShell>
  );
};

/* ─────────────────────────── Deadlines ─────────────────────────── */

const DeadlinesWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const deadlines = data?.deadlines || [];

  return (
    <WidgetShell>
      <WidgetHeader icon={ClockIcon} title={t('dashboard.upcomingDeadlines')} />
      {deadlines.length === 0 ? (
        <EmptyState message={t('dashboard.noDeadlines')} icon={ClockIcon} />
      ) : (
        <div className="space-y-0.5">
          {deadlines.slice(0, 6).map((item, idx) => {
            const color = deadlineColor(item.deadline);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md"
              >
                {/* Urgency dot */}
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title || item.course}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {item.courseCode || item.course}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium" style={{ color }}>{deadlineLabel(item.deadline)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{format(new Date(item.deadline), 'MMM d, HH:mm')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
};

/* ─────────────────────────── Due Today ─────────────────────────── */

const DueTodayWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const todayDeadlines = data?.todayDeadlines || [];

  return (
    <WidgetShell>
      <WidgetHeader
        icon={ClockIcon}
        title={t('dashboard.widgets.dueToday', 'Due today')}
        action={
          <Link to="/today" className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>
            {t('common.view', 'View')} <ChevronRightIcon className="inline h-3 w-3" />
          </Link>
        }
      />

      {todayDeadlines.length === 0 ? (
        <EmptyState message={t('today.noDueToday', 'No deadlines for today.')} icon={ClockIcon} />
      ) : (
        <div className="space-y-0.5">
          {todayDeadlines.slice(0, 6).map((item, idx) => (
            <Link
              key={item.id || `${item.deadline}-${idx}`}
              to={item.path || '/today'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
              onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--fn-warning)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.title || item.course}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {item.courseCode || item.course}
                </p>
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--fn-warning)' }}>
                {format(new Date(item.deadline), 'HH:mm')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </WidgetShell>
  );
};

/* ─────────────────────────── Notifications ─────────────────────────── */

const NotificationsWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const notifications = data?.notifications || [];

  return (
    <WidgetShell>
      <WidgetHeader
        icon={BellIcon}
        title={t('dashboard.recentActivity')}
        action={
          notifications.filter(n => !n.read).length > 0
            ? <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}>{notifications.filter(n => !n.read).length}</span>
            : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState message={t('notifications.noNotifications')} icon={BellIcon} />
      ) : (
        <div className="space-y-0.5">
          {notifications.slice(0, 5).map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-md"
              style={{ background: n.read ? 'transparent' : 'var(--bg-hover)' }}
            >
              {/* Unread dot */}
              <div className="mt-1.5 flex-shrink-0">
                {!n.read && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-primary)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
              </div>
              <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false })}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
};

/* ─────────────────────────── Calendar ─────────────────────────── */

const CalendarWidget: React.FC = () => {
  const { t } = useTranslation();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <WidgetShell>
      <WidgetHeader icon={CalendarIcon} title={t('dashboard.widgets.calendar', 'Calendar')} />
      <div className="text-center mb-3">
        <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {format(now, 'MMMM yyyy')}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map((d) => (
          <div key={d} className="text-xs py-1" style={{ color: 'var(--text-faint)' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today;
          return (
            <div
              key={day}
              className="text-xs py-1.5 rounded-md"
              style={{
                background: isToday ? 'var(--text-primary)' : 'transparent',
                color: isToday ? 'var(--bg-base)' : 'var(--text-secondary)',
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
};

/* ─────────────────────────── Progress ─────────────────────────── */

const ProgressWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const courses = data?.courses || [];

  return (
    <WidgetShell>
      <WidgetHeader icon={TrophyIcon} title={t('dashboard.widgets.progress', 'Course Progress')} />
      {courses.length === 0 ? (
        <EmptyState message="No courses" icon={TrophyIcon} />
      ) : (
        <div className="space-y-4">
          {courses.slice(0, 5).map((course) => {
            const p = course.progress || 0;
            return (
              <div key={course.id}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{course.code}</span>
                  <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p}%</span>
                </div>
                <HBar value={p} color={p >= 80 ? 'var(--fn-success)' : p >= 40 ? 'var(--text-muted)' : 'var(--text-faint)'} />
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
};

/* ─────────────────────────── Recent Assignments ─────────────────────────── */

const RecentAssignmentsWidget: React.FC = () => {
  const { t } = useTranslation();
  return (
    <WidgetShell>
      <WidgetHeader icon={BookOpenIcon} title={t('dashboard.widgets.recentAssignments', 'Recent Assignments')} />
      <EmptyState message={t('dashboard.widgets.noAssignments', 'No recent assignments')} icon={BookOpenIcon} />
    </WidgetShell>
  );
};

/* ─────────────────────────── Study Groups ─────────────────────────── */

const StudyGroupsWidget: React.FC = () => {
  const { t } = useTranslation();
  return (
    <WidgetShell>
      <WidgetHeader icon={UserGroupIcon} title={t('dashboard.widgets.studyGroups', 'Study Groups')} />
      <EmptyState message={t('dashboard.widgets.noGroups', 'No study groups yet')} icon={UserGroupIcon} />
    </WidgetShell>
  );
};

/* ─────────────────────────── Grade Distribution ─────────────────────────── */

const GradeDistributionWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();

  const { grades, total } = React.useMemo(() => {
    const allGrades: number[] = [];
    for (const course of data?.courses || []) {
      for (const g of course.grades || []) {
        if (g.maxPoints > 0) {
          allGrades.push((g.score / g.maxPoints) * 100);
        }
      }
    }

    const buckets = [
      { label: 'A', count: 0, min: 90 },
      { label: 'B', count: 0, min: 80 },
      { label: 'C', count: 0, min: 70 },
      { label: 'D', count: 0, min: 60 },
      { label: 'F', count: 0, min: 0 },
    ];

    for (const pct of allGrades) {
      const bucket = buckets.find((b) => pct >= b.min);
      if (bucket) bucket.count++;
    }

    const totalCount = allGrades.length;
    const withPct = buckets.map((b) => ({
      label: b.label,
      count: b.count,
      pct: totalCount > 0 ? Math.round((b.count / totalCount) * 100) : 0,
    }));

    return { grades: withPct, total: totalCount };
  }, [data?.courses]);

  if (total === 0) {
    return (
      <WidgetShell>
        <WidgetHeader icon={ChartPieIcon} title={t('dashboard.widgets.gradeDistribution', 'Grade Distribution')} />
        <EmptyState message={t('dashboard.widgets.noGrades', 'No grades yet')} icon={ChartPieIcon} />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell>
      <WidgetHeader icon={ChartPieIcon} title={t('dashboard.widgets.gradeDistribution', 'Grade Distribution')} />
      {/* Horizontal stacked bar */}
      <div className="flex rounded-md overflow-hidden h-6 mb-4" style={{ background: 'var(--bg-overlay)' }}>
        {grades.filter((g) => g.pct > 0).map((g, i) => (
          <div
            key={g.label}
            className="flex items-center justify-center text-xs font-medium transition-all"
            style={{
              width: `${g.pct}%`,
              background: `rgba(250,250,250,${0.9 - i * 0.15})`,
              color: 'var(--bg-base)',
            }}
          >
            {g.pct >= 15 && g.label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {grades.map((g) => (
          <div key={g.label} className="text-center">
            <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{g.count}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{g.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-center mt-3" style={{ color: 'var(--text-faint)' }}>{total} {t('dashboard.widgets.totalGrades', 'total grades')}</p>
    </WidgetShell>
  );
};

/* ─────────────────────────── Streak ─────────────────────────── */

const StreakWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const { streak, week } = React.useMemo(() => {
    const items = data?.progressItems || [];
    if (items.length === 0) return { streak: 0, week: [false, false, false, false, false, false, false] };

    // Build set of active days (YYYY-MM-DD)
    const activeDays = new Set<string>();
    for (const item of items) {
      if (item.completedAt) {
        const d = new Date(item.completedAt);
        activeDays.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    }

    // Compute streak ending today
    const today = new Date();
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (activeDays.has(key)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Build last 7 days activity (Mon=0 ... Sun=6 for display)
    const weekActivity: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekActivity.push(activeDays.has(key));
    }

    return { streak: currentStreak, week: weekActivity };
  }, [data?.progressItems]);

  return (
    <WidgetShell>
      <div className="flex flex-col items-center">
        <FireIcon className="h-5 w-5 mb-1" style={{ color: streak > 0 ? 'var(--text-primary)' : 'var(--text-faint)' }} />
        <p className="text-3xl font-semibold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{streak}</p>
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>{t('dashboard.widgets.daysStreak', 'Day Streak')}</p>
        {/* Week dots */}
        <div className="flex gap-1.5">
          {week.map((active, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-5 h-5 rounded-md"
                style={{ background: active ? 'var(--text-primary)' : 'var(--bg-overlay)' }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{dayLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetShell>
  );
};

/* ─────────────────────────── Completed Today ─────────────────────────── */

const CompletedTodayWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();

  const { completed, total, delta } = React.useMemo(() => {
    const items = data?.progressItems || [];
    const todayDeadlines = data?.todayDeadlines || [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    const completedToday = items.filter((item) => item.completedAt?.startsWith(todayStr)).length;
    const completedYesterday = items.filter((item) => item.completedAt?.startsWith(yesterdayStr)).length;
    const totalDueToday = Math.max(todayDeadlines.length, completedToday);

    return {
      completed: completedToday,
      total: totalDueToday || completedToday,
      delta: completedToday - completedYesterday,
    };
  }, [data?.progressItems, data?.todayDeadlines]);

  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <WidgetShell>
      <div className="flex flex-col items-center">
        <ProgressRing value={pct} size={64} strokeWidth={5} label={total > 0 ? `${completed}/${total}` : '0'} />
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{t('dashboard.widgets.completedToday', 'Completed Today')}</p>
        {delta !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            <ArrowTrendingUpIcon
              className="h-3 w-3"
              style={{ color: delta > 0 ? 'var(--fn-success)' : 'var(--text-faint)', transform: delta < 0 ? 'scaleY(-1)' : undefined }}
            />
            <span className="text-xs" style={{ color: delta > 0 ? 'var(--fn-success)' : 'var(--text-faint)' }}>
              {delta > 0 ? '+' : ''}{delta} {t('dashboard.widgets.fromYesterday', 'from yesterday')}
            </span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

/* ─────────────────────────── Quick Links ─────────────────────────── */

const QuickLinksWidget: React.FC = () => {
  const { t } = useTranslation();
  const links = [
    { name: 'Courses', path: '/courses', icon: AcademicCapIcon },
    { name: 'Assignments', path: '/assignments', icon: BookOpenIcon },
    { name: 'Grades', path: '/grades', icon: ChartPieIcon },
  ];

  return (
    <WidgetShell>
      <WidgetHeader icon={LinkIcon} title={t('dashboard.widgets.quickLinks', 'Quick Links')} />
      <div className="space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors group"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-medium flex-1">{link.name}</span>
              <ChevronRightIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-faint)' }} />
            </Link>
          );
        })}
      </div>
    </WidgetShell>
  );
};
