import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardBody } from './Card';
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
  CheckCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { DashboardWidgetConfig } from './DashboardBuilder';

interface DashboardData {
  courses?: Array<{ id: string; code: string; title: string; progress?: number }>;
  deadlines?: Array<{ course: string; deadline: string }>;
  notifications?: Array<{ id: string; title: string; message: string; created_at: string; read: boolean }>;
  [key: string]: unknown;
}

interface WidgetRendererProps {
  widget: DashboardWidgetConfig;
  data?: DashboardData;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, data }) => {

  const getWidgetSize = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'medium':
        return 'col-span-1 md:col-span-2';
      case 'large':
        return 'col-span-1 md:col-span-3';
      case 'full':
        return 'col-span-1 md:col-span-4';
      default:
        return 'col-span-1 md:col-span-2';
    }
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'stats':
        return <StatsWidget data={data} />;
      case 'courses':
        return <CoursesWidget data={data} />;
      case 'deadlines':
        return <DeadlinesWidget data={data} />;
      case 'notifications':
        return <NotificationsWidget data={data} />;
      case 'calendar':
        return <CalendarWidget data={data} />;
      case 'progress':
        return <ProgressWidget data={data} />;
      case 'recent-assignments':
        return <RecentAssignmentsWidget data={data} />;
      case 'study-groups':
        return <StudyGroupsWidget data={data} />;
      case 'grade-distribution':
        return <GradeDistributionWidget data={data} />;
      case 'streak':
        return <StreakWidget data={data} />;
      case 'completed-today':
        return <CompletedTodayWidget data={data} />;
      case 'quick-links':
        return <QuickLinksWidget data={data} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <div className={getWidgetSize(widget.size)}>
      {renderWidgetContent()}
    </div>
  );
};

// Individual Widget Components

const StatsWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const { courses, deadlines, notifications } = data || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {courses?.length || 0}
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
                {deadlines?.length || 0}
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
                {notifications?.filter((n) => !n.read).length || 0}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

const CoursesWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const courses = data?.courses || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.myCourses')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        {courses.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            {t('dashboard.noCourses')}
          </p>
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 5).map((course) => (
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
                        className="bg-blue-600 h-2 rounded-full transition-all"
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
};

const DeadlinesWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const deadlines = data?.deadlines || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.upcomingDeadlines')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        {deadlines.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            {t('dashboard.noDeadlines')}
          </p>
        ) : (
          <div className="space-y-3">
            {deadlines.map((item, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {item.course}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {format(new Date(item.deadline), 'PPp')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const NotificationsWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const notifications = data?.notifications || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recentActivity')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        {notifications.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            {t('notifications.noNotifications')}
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${notification.read
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
};

const CalendarWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.calendar', 'Calendar')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-center py-8">
          <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.widgets.calendarComingSoon', 'Calendar view coming soon')}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

const ProgressWidget: React.FC<{ data?: DashboardData }> = ({ data }) => {
  const { t } = useTranslation();
  const courses = data?.courses || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.progress', 'Course Progress')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {courses.slice(0, 5).map((course) => (
            <div key={course.id}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {course.code}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {course.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${course.progress || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

const RecentAssignmentsWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.recentAssignments', 'Recent Assignments')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          {t('dashboard.widgets.noAssignments', 'No recent assignments')}
        </p>
      </CardBody>
    </Card>
  );
};

const StudyGroupsWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.studyGroups', 'Study Groups')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          {t('dashboard.widgets.noGroups', 'No study groups yet')}
        </p>
      </CardBody>
    </Card>
  );
};

const GradeDistributionWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartPieIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.gradeDistribution', 'Grade Distribution')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">A</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '40%' }} />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">40%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">B</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '30%' }} />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">30%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">C</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '20%' }} />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">20%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">D</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '10%' }} />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">10%</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
const StreakWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <FireIcon className="h-12 w-12 mx-auto text-orange-500 mb-2" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">7</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('dashboard.widgets.daysStreak', 'Days Streak')}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
const CompletedTodayWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500 mb-2" />
          <p className="text-3xl font-bold text-gray-900 dark:text-white">3</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('dashboard.widgets.completedToday', 'Completed Today')}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
const QuickLinksWidget: React.FC<{ data?: DashboardData }> = () => {
  const { t } = useTranslation();

  const links = [
    { name: 'Courses', path: '/courses', icon: AcademicCapIcon },
    { name: 'Assignments', path: '/assignments', icon: BookOpenIcon },
    { name: 'Grades', path: '/grades', icon: ChartPieIcon },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.widgets.quickLinks', 'Quick Links')}
          </h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
};
