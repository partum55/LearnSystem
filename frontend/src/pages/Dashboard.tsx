import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components';
import { Loading } from '../components';
import { Button } from '../components';
import { DashboardWidgetConfig } from '../components';
import { WidgetRenderer } from '../components';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { Course, Assignment } from '../types';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface DashboardCourse extends Course {
  assignments?: Assignment[];
  completion_percentage?: number;
}

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'stats-1', type: 'stats', title: 'Statistics', visible: true, order: 0, size: 'full' },
  { id: 'courses-1', type: 'courses', title: 'My Courses', visible: true, order: 1, size: 'medium' },
  { id: 'deadlines-1', type: 'deadlines', title: 'Upcoming Deadlines', visible: true, order: 2, size: 'medium' },
  { id: 'notifications-1', type: 'notifications', title: 'Recent Activity', visible: true, order: 3, size: 'medium' },
  { id: 'progress-1', type: 'progress', title: 'Course Progress', visible: true, order: 4, size: 'medium' },
  { id: 'streak-1', type: 'streak', title: 'Learning Streak', visible: true, order: 5, size: 'small' },
  { id: 'completed-1', type: 'completed-today', title: 'Completed Today', visible: true, order: 6, size: 'small' },
  { id: 'calendar-1', type: 'calendar', title: 'Calendar', visible: true, order: 7, size: 'medium' },
  { id: 'grades-1', type: 'grade-distribution', title: 'Grade Distribution', visible: true, order: 8, size: 'medium' },
];

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading: coursesLoading } = useCourseStore();
  const { notifications, fetchNotifications } = useNotificationStore();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    fetchCourses();
    fetchNotifications();
  }, [fetchCourses, fetchNotifications]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboardWidgets' && e.newValue) {
        setWidgets(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (coursesLoading) return <Loading />;

  const upcomingDeadlines = ((courses || []) as DashboardCourse[])
    .flatMap((course) =>
      course.assignments?.map((assignment) => {
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : new Date();
        return {
          course: course.title,
          courseCode: course.code,
          title: assignment.title,
          deadline: dueDate.toISOString(),
          deadlineDate: dueDate,
          id: assignment.id,
        };
      }) || []
    )
    .filter((item) => item.deadlineDate > new Date())
    .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
    .slice(0, 6);

  const widgetData = {
    courses: ((courses || []) as DashboardCourse[]).map((course) => ({
      ...course,
      progress: course.completion_percentage || 0,
    })),
    deadlines: upcomingDeadlines,
    notifications: (notifications || []).slice(0, 10),
  };

  const firstName = user?.display_name?.split(' ')[0] || user?.display_name;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-display)' }}>
              {t('dashboard.title')}
            </p>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {getGreeting()}, {firstName}
            </h1>
          </div>
          <Button
            onClick={() => navigate('/dashboard/customize')}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Cog6ToothIcon className="h-3.5 w-3.5" />
            <span>{t('dashboard.customize', 'Customize')}</span>
          </Button>
        </div>

        {/* Widgets */}
        {widgets.filter(w => w.visible).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
            {widgets
              .filter(w => w.visible)
              .sort((a, b) => a.order - b.order)
              .map(widget => (
                <WidgetRenderer key={widget.id} widget={widget} data={widgetData} />
              ))}
          </div>
        ) : (
          <div
            className="text-center py-20 rounded-lg"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <Cog6ToothIcon className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
            <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('dashboard.builder.emptyState', 'No widgets to display')}
            </h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {t('dashboard.builder.emptyStateDesc', 'Customize your dashboard to add widgets')}
            </p>
            <Button onClick={() => navigate('/dashboard/customize')} size="sm">
              {t('dashboard.customize', 'Customize')}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
