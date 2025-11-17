import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Loading } from '../components/Loading';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'instructors'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [usageRes, coursesRes, instructorsRes] = await Promise.all([
        fetch('/api/admin/analytics/platform-usage'),
        fetch('/api/admin/analytics/course-effectiveness'),
        fetch('/api/admin/analytics/instructor-productivity'),
      ]);

      const usage = await usageRes.json();
      const courses = await coursesRes.json();
      const instructors = await instructorsRes.json();

      setPlatformUsage(usage);
      setCourseEffectiveness(courses);
      setInstructorProductivity(instructors);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
