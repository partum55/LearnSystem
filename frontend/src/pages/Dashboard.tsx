import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Loading } from '../components/Loading';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { useNotificationStore } from '../store/notificationStore';
import { format } from 'date-fns';
import { AcademicCapIcon, ClockIcon, BellIcon } from '@heroicons/react/24/outline';
import { Course, Notification } from '../types';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading: coursesLoading } = useCourseStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchCourses();
    fetchNotifications();
  }, [fetchCourses, fetchNotifications]);

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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('dashboard.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('auth.welcome')}, {user?.display_name}!
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* My Courses */}
              <Card>
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
                    <div className="space-y-3">
                      {courses.slice(0, 5).map((course: Course) => (
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

              {/* Recent Notifications */}
              <Card>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
