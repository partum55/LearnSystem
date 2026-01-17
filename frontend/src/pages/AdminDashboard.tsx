import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Loading } from '../components/Loading';
import { getSystemHealth, SystemHealth, ServiceStatus } from '../api/admin';
import {
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CpuChipIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

interface PlatformUsage {
  totalUsers: number;
  activeUsers: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  totalAssignments: number;
  totalQuizzes: number;
  totalSubmissions: number;
  usersByRole: Record<string, number>;
  coursesByStatus: Record<string, number>;
  engagementMetrics: Record<string, number>;
}

interface CourseEffectiveness {
  courseId: number;
  courseCode: string;
  courseTitle: string;
  totalStudents: number;
  activeStudents: number;
  completionRate: number;
  averageGrade: number;
  passRate: number;
  totalAssignments: number;
  totalQuizzes: number;
  averageSubmissionRate: number;
  studentSatisfaction: number;
  status: string;
}

interface InstructorProductivity {
  instructorId: number;
  instructorName: string;
  coursesTeaching: number;
  totalStudents: number;
  contentItemsCreated: number;
  averageGradingTime: number;
  assignmentsGraded: number;
  assignmentsPending: number;
  responseTime: number;
  studentSatisfaction: number;
  activeDays: number;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [platformUsage, setPlatformUsage] = useState<PlatformUsage | null>(null);
  const [courseEffectiveness, setCourseEffectiveness] = useState<CourseEffectiveness[]>([]);
  const [instructorProductivity, setInstructorProductivity] = useState<InstructorProductivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'instructors' | 'services'>('services');

  const fetchSystemHealth = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const health = await getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setServicesError(t('admin.services.error', 'Failed to fetch service status'));
    } finally {
      setServicesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAnalytics();
    fetchSystemHealth();
    
    // Auto-refresh services every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [usageRes, coursesRes, instructorsRes] = await Promise.all([
        fetch('/api/admin/analytics/platform-usage'),
        fetch('/api/admin/analytics/course-effectiveness'),
        fetch('/api/admin/analytics/instructor-productivity'),
      ]);

      if (usageRes.ok) {
        const usage = await usageRes.json();
        setPlatformUsage(usage);
      }
      if (coursesRes.ok) {
        const courses = await coursesRes.json();
        setCourseEffectiveness(courses);
      }
      if (instructorsRes.ok) {
        const instructors = await instructorsRes.json();
        setInstructorProductivity(instructors);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !systemHealth) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            {t('admin.dashboard.title', 'Admin Dashboard')}
          </h1>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('services')}
                className={`${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <ServerIcon className="h-5 w-5" />
                {t('admin.dashboard.services', 'Service Monitoring')}
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {t('admin.dashboard.overview', 'Platform Overview')}
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`${
                  activeTab === 'courses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {t('admin.dashboard.courses', 'Course Effectiveness')}
              </button>
              <button
                onClick={() => setActiveTab('instructors')}
                className={`${
                  activeTab === 'instructors'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {t('admin.dashboard.instructors', 'Instructor Productivity')}
              </button>
            </nav>
          </div>

          {/* Services Monitoring Tab */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              {/* Refresh Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('admin.services.title', 'System Services Status')}
                </h2>
                <button
                  onClick={fetchSystemHealth}
                  disabled={servicesLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${servicesLoading ? 'animate-spin' : ''}`} />
                  {t('admin.services.refresh', 'Refresh')}
                </button>
              </div>

              {servicesError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400">{servicesError}</p>
                </div>
              )}

              {systemHealth && (
                <>
                  {/* Overall Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('admin.services.overall', 'Overall Status')}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${
                            systemHealth.overallStatus === 'HEALTHY' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {systemHealth.overallStatus}
                          </p>
                        </div>
                        {systemHealth.overallStatus === 'HEALTHY' ? (
                          <CheckCircleIcon className="h-12 w-12 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-12 w-12 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('admin.services.total', 'Total Services')}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                            {systemHealth.totalServices}
                          </p>
                        </div>
                        <ServerIcon className="h-12 w-12 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('admin.services.healthy', 'Healthy')}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-green-600">
                            {systemHealth.healthyServices}
                          </p>
                        </div>
                        <CheckCircleIcon className="h-12 w-12 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('admin.services.unhealthy', 'Unhealthy')}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-red-600">
                            {systemHealth.unhealthyServices}
                          </p>
                        </div>
                        <XCircleIcon className="h-12 w-12 text-red-500" />
                      </div>
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CpuChipIcon className="h-5 w-5" />
                      {t('admin.services.systemInfo', 'System Information')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('admin.services.javaVersion', 'Java Version')}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {systemHealth.systemInfo?.javaVersion || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('admin.services.os', 'Operating System')}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {systemHealth.systemInfo?.osName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('admin.services.processors', 'Processors')}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {systemHealth.systemInfo?.availableProcessors || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('admin.services.memory', 'Memory (Used/Max)')}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {systemHealth.systemInfo?.totalMemoryMB && systemHealth.systemInfo?.freeMemoryMB && systemHealth.systemInfo?.maxMemoryMB
                            ? `${Math.round(systemHealth.systemInfo.totalMemoryMB - systemHealth.systemInfo.freeMemoryMB)} MB / ${systemHealth.systemInfo.maxMemoryMB} MB`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CircleStackIcon className="h-5 w-5" />
                        {t('admin.services.registeredServices', 'Registered Services')}
                      </h3>
                    </div>
                    {systemHealth.services && systemHealth.services.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.serviceName', 'Service')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.instanceId', 'Instance ID')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.status', 'Status')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.host', 'Host')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.port', 'Port')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                {t('admin.services.healthCheck', 'Health Check')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {systemHealth.services.map((service: ServiceStatus) => (
                              <tr key={`${service.serviceName}-${service.instanceId || service.host}-${service.port}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {service.serviceName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {service.instanceId || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    service.status === 'UP'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {service.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {service.host}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {service.port}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <a
                                    href={service.healthUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    {t('admin.services.viewHealth', 'View')}
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {t('admin.services.noServices', 'No services registered yet')}
                      </div>
                    )}
                  </div>

                  {/* Last Updated */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                    {t('admin.services.lastUpdated', 'Last updated')}: {new Date(systemHealth.timestamp).toLocaleString()}
                  </p>
                </>
              )}

              {!systemHealth && !servicesLoading && !servicesError && (
                <div className="text-center py-12">
                  <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('admin.services.loading', 'Loading service status...')}
                  </h3>
                </div>
              )}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && platformUsage && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title={t('admin.metrics.totalUsers', 'Total Users')}
                  value={platformUsage.totalUsers}
                  icon="👥"
                  color="blue"
                />
                <MetricCard
                  title={t('admin.metrics.activeUsers', 'Active Users')}
                  value={platformUsage.activeUsers}
                  subtitle={`${Math.round((platformUsage.activeUsers / platformUsage.totalUsers) * 100)}%`}
                  icon="✅"
                  color="green"
                />
                <MetricCard
                  title={t('admin.metrics.totalCourses', 'Total Courses')}
                  value={platformUsage.totalCourses}
                  subtitle={`${platformUsage.activeCourses} active`}
                  icon="📚"
                  color="purple"
                />
                <MetricCard
                  title={t('admin.metrics.enrollments', 'Enrollments')}
                  value={platformUsage.totalEnrollments}
                  icon="🎓"
                  color="orange"
                />
              </div>

              {/* Engagement Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t('admin.engagement.title', 'User Engagement')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('admin.engagement.daily', 'Daily Active')}
                    </p>
                    <p className="text-2xl font-bold">
                      {platformUsage.engagementMetrics.dailyActiveUsers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('admin.engagement.weekly', 'Weekly Active')}
                    </p>
                    <p className="text-2xl font-bold">
                      {platformUsage.engagementMetrics.weeklyActiveUsers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('admin.engagement.avgSession', 'Avg Session (min)')}
                    </p>
                    <p className="text-2xl font-bold">
                      {platformUsage.engagementMetrics.averageSessionDuration?.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.name', 'Course')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.students', 'Students')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.completion', 'Completion')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.avgGrade', 'Avg Grade')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.passRate', 'Pass Rate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.course.satisfaction', 'Satisfaction')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {courseEffectiveness.map((course) => (
                      <tr key={course.courseId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {course.courseCode}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {course.courseTitle}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {course.totalStudents} ({course.activeStudents} active)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {course.completionRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {course.averageGrade.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {course.passRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">
                            ⭐ {course.studentSatisfaction.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructors Tab */}
          {activeTab === 'instructors' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.name', 'Instructor')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.courses', 'Courses')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.students', 'Students')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.content', 'Content Created')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.grading', 'Grading Time')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('admin.instructor.pending', 'Pending')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {instructorProductivity.map((instructor) => (
                      <tr key={instructor.instructorId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {instructor.instructorName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {instructor.coursesTeaching}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {instructor.totalStudents}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {instructor.contentItemsCreated}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {instructor.averageGradingTime.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              instructor.assignmentsPending > 20
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {instructor.assignmentsPending}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-3 rounded-full`}>{icon}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
