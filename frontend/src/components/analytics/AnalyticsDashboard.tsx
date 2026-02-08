import React, { useState, useEffect, useCallback } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';

interface AnalyticsDashboardProps {
  courseId: string;
}

interface CourseStats {
  totalStudents: number;
  activeStudents: number;
  averageGrade: number;
  completionRate: number;
  lateSubmissions: number;
  pendingGrading: number;
}

interface StudentProgress {
  userId: string;
  name: string;
  progress: number;
  grade: number;
  lastActive: string;
  isStruggling: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ courseId }) => {
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('week');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, studentsResponse] = await Promise.all([
        apiClient.get<CourseStats>(`/analytics/courses/${courseId}/stats`, {
          params: { range: timeRange },
        }),
        apiClient.get<StudentProgress[]>(`/analytics/courses/${courseId}/student-progress`),
      ]);
      setStats(statsResponse.data);
      setStudents(studentsResponse.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [courseId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-600">
        {error || 'No data available'}
      </div>
    );
  }

  const strugglingStudents = students.filter(s => s.isStruggling);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Course Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'semester')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="semester">This Semester</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Students"
          value={stats.totalStudents}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Active Students"
          value={stats.activeStudents}
          subtitle={`${Math.round((stats.activeStudents / stats.totalStudents) * 100)}%`}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Average Grade"
          value={`${stats.averageGrade.toFixed(1)}%`}
          icon="📊"
          color="purple"
        />
        <MetricCard
          title="Pending Grading"
          value={stats.pendingGrading}
          icon="⏳"
          color="orange"
          alert={stats.pendingGrading > 10}
        />
      </div>

      {/* Grade Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Grade Distribution</h3>
        <div className="h-64">
          {/* Add Bar chart here */}
          <p className="text-gray-500 text-center pt-20">Chart visualization would go here</p>
        </div>
      </div>

      {/* Struggling Students Alert */}
      {strugglingStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {strugglingStudents.length} student(s) may need attention
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {strugglingStudents.slice(0, 5).map((student) => (
                    <li key={student.userId}>
                      {student.name} - Grade: {student.grade.toFixed(1)}%, Progress: {student.progress}%
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <button className="text-sm font-medium text-red-800 hover:text-red-900">
                  View all struggling students →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Progress Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Student Progress</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.userId} className={student.isStruggling ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${student.progress}%` }}
                        ></div>
                      </div>
                      <span>{student.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-medium ${student.grade >= 90 ? 'text-green-600' :
                      student.grade >= 70 ? 'text-blue-600' :
                        student.grade >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                      }`}>
                      {student.grade.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.lastActive).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.isStruggling && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        At Risk
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            📧 Email All Students
          </button>
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            📊 Export Grades
          </button>
          <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            📈 Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  alert?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, alert }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className={`rounded-lg shadow p-6 ${alert ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-3 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
