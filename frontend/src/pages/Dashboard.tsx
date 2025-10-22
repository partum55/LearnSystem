import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Card, CardHeader, CardBody } from '../components';
import { Loading } from '../components/Loading';
import { DashboardCustomizer, DashboardWidget } from '../components/DashboardCustomizer';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { format } from 'date-fns';
import { AcademicCapIcon, ClockIcon, BellIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Course, Notification } from '../types';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'stats', title: 'Statistics', visible: true, order: 0 },
  { id: 'courses', title: 'My Courses', visible: true, order: 1 },
  { id: 'notifications', title: 'Recent Activity', visible: true, order: 2 },
  { id: 'deadlines', title: 'Upcoming Deadlines', visible: false, order: 3 },
];

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading: coursesLoading } = useCourseStore();
  const { notifications, fetchNotifications } = useNotificationStore();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    fetchCourses();
    fetchNotifications();
  }, [fetchCourses, fetchNotifications]);

  const handleSaveWidgets = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboardWidgets', JSON.stringify(newWidgets));
  };

  if (coursesLoading) {
    return <Loading />;
  }

  const upcomingDeadlines = (courses || [])
    .flatMap((course: Course) => course.progress ? [{ course: course.title, deadline: new Date() }] : [])
    .slice(0, 5);

  const recentNotifications = (notifications || []).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('dashboard.title')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {t('auth.welcome')}, {user?.display_name}!
                </p>
              </div>
              <div className="flex gap-3">
                <DashboardCustomizer widgets={widgets} onSave={handleSaveWidgets} />
                {user?.role === 'TEACHER' && (
                  <Link
                    to="/quiz-builder"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {t('quiz.createNew', 'Create Quiz')}
                  </Link>
                )}
              </div>
            </div>

            {/* Render widgets dynamically based on order and visibility */}
            <div className="space-y-8">
              {widgets
                .filter(w => w.visible)
                .sort((a, b) => a.order - b.order)
                .map(widget => {
                  switch (widget.id) {
                    case 'stats':
                      return (
                        <div key={widget.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card>
                            <CardBody>
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {t('dashboard.myCourses')}
                                  </p>
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {(courses || []).length}
                                  </p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>

                          <Card>
                            <CardBody>
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {t('dashboard.upcomingDeadlines')}
                                  </p>
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {upcomingDeadlines.length}
                                  </p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>

                          <Card>
                            <CardBody>
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <BellIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {t('notifications.title')}
                                  </p>
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {(notifications || []).filter(n => !n.read).length}
                                  </p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </div>
                      );

                    case 'courses':
                      return (
                        <Card key={widget.id}>
                          <CardHeader>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {t('dashboard.myCourses')}
                            </h2>
                          </CardHeader>
                          <CardBody>
                            {!courses || courses.length === 0 ? (
                              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                                {t('dashboard.noCourses')}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {courses.slice(0, 6).map((course: Course) => (
                                  <Link
                                    key={course.id}
                                    to={`/courses/${course.id}`}
                                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                      {course.code}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {course.title}
                                    </p>
                                    {course.progress !== undefined && (
                                      <div className="mt-2">
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                          <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${course.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      );

                    case 'notifications':
                      return (
                        <Card key={widget.id}>
                          <CardHeader>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {t('dashboard.recentActivity')}
                            </h2>
                          </CardHeader>
                          <CardBody>
                            {recentNotifications.length === 0 ? (
                              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                                {t('notifications.noNotifications')}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {recentNotifications.map((notification: Notification) => (
                                  <div
                                    key={notification.id}
                                    className={`p-4 rounded-lg border ${
                                      notification.read
                                        ? 'border-gray-200 dark:border-gray-700'
                                        : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                                    }`}
                                  >
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                      {format(new Date(notification.created_at), 'PPp')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      );

                    case 'deadlines':
                      return (
                        <Card key={widget.id}>
                          <CardHeader>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {t('dashboard.upcomingDeadlines')}
                            </h2>
                          </CardHeader>
                          <CardBody>
                            {upcomingDeadlines.length === 0 ? (
                              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                                {t('dashboard.noDeadlines', 'No upcoming deadlines')}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {upcomingDeadlines.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                                  >
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {item.course}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {format(item.deadline, 'PPp')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      );

                    default:
                      return null;
                  }
                })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
