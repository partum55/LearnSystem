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
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'stats-1', type: 'stats', title: 'Statistics', visible: true, order: 0, size: 'full' },
  { id: 'courses-1', type: 'courses', title: 'My Courses', visible: true, order: 1, size: 'medium' },
  { id: 'deadlines-1', type: 'deadlines', title: 'Upcoming Deadlines', visible: true, order: 2, size: 'medium' },
  { id: 'notifications-1', type: 'notifications', title: 'Recent Activity', visible: true, order: 3, size: 'medium' },
];

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
    // Listen for storage changes to sync widgets across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboardWidgets' && e.newValue) {
        setWidgets(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (coursesLoading) {
    return <Loading />;
  }

  // Prepare dynamic widget data
  const upcomingDeadlines = (courses || [])
    .flatMap((course: any) =>
      course.assignments?.map((assignment: any) => ({
        course: course.title,
        courseCode: course.code,
        title: assignment.title,
        deadline: new Date(assignment.due_date),
        id: assignment.id,
      })) || []
    )
    .filter((item: any) => item.deadline > new Date())
    .sort((a: any, b: any) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  const widgetData = {
    courses: (courses || []).map((course: any) => ({
      ...course,
      progress: course.completion_percentage || 0,
    })),
    deadlines: upcomingDeadlines,
    notifications: (notifications || []).slice(0, 10),
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {t('dashboard.title')}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {t('auth.welcome')}, {user?.display_name}!
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/dashboard/customize')}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('dashboard.customize', 'Customize Dashboard')}</span>
                  <span className="sm:hidden">{t('dashboard.customize.short', 'Customize')}</span>
                </Button>
              </div>
            </div>

            {/* Widget Grid with Dynamic Layout */}
            {widgets.filter(w => w.visible).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {widgets
                  .filter(w => w.visible)
                  .sort((a, b) => a.order - b.order)
                  .map(widget => (
                    <WidgetRenderer
                      key={widget.id}
                      widget={widget}
                      data={widgetData}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow">
                <Cog6ToothIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('dashboard.builder.emptyState', 'No widgets to display')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {t('dashboard.builder.emptyStateDesc', 'Click "Customize Dashboard" to add widgets and personalize your view')}
                </p>
                <Button onClick={() => navigate('/dashboard/customize')}>
                  <Cog6ToothIcon className="h-4 w-4 mr-2" />
                  {t('dashboard.customize', 'Customize Dashboard')}
                </Button>
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

