import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Card, CardBody } from './Card';
import { Loading } from './Loading';
import {
  AcademicCapIcon,
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

interface GradeEntry {
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  max_points: number;
  due_date?: string;
  category?: string;
  score?: number;
  percentage?: number;
  status: string;
  is_late: boolean;
  is_excused: boolean;
  graded_at?: string;
  notes?: string;
}

interface ModuleGrades {
  module_id: string | null;
  module_title: string;
  module_position: number;
  grades: GradeEntry[];
}

interface CourseSummary {
  current_grade?: number;
  letter_grade?: string;
  total_points_earned: number;
  total_points_possible: number;
  assignments_completed: number;
  assignments_total: number;
}

interface GradebookData {
  course_id: string;
  course_code: string;
  course_title: string;
  summary?: CourseSummary;
  modules: ModuleGrades[];
}

interface CourseGradesTabProps {
  courseId: string;
}

export const CourseGradesTab: React.FC<CourseGradesTabProps> = ({ courseId }) => {
  const { t } = useTranslation();
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchGradebook = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<GradebookData>(`/gradebook/entries/student/${courseId}/`);
      setGradebook(response.data);
      // Auto-expand all modules by default
      if (response.data.modules) {
        const allModuleIds = response.data.modules
          .map(m => m.module_id)
          .filter(id => id !== null) as string[];
        setExpandedModules(new Set(allModuleIds));
      }
    } catch (err: any) {
      console.error('Failed to fetch gradebook:', err);
      setError(err.response?.data?.error || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string | null) => {
    if (!moduleId) return;
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (entry: GradeEntry) => {
    if (entry.is_excused) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <ExclamationCircleIcon className="w-4 h-4 mr-1" />
          {t('gradebook.excused')}
        </span>
      );
    }

    switch (entry.status) {
      case 'GRADED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.graded')}
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <ClockIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.submitted')}
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircleIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.missing')}
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <ClockIcon className="w-4 h-4 mr-1" />
            {t('gradebook.late')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {t('gradebook.status.not_submitted')}
          </span>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateModuleStats = (grades: GradeEntry[]) => {
    const completed = grades.filter(g => g.score !== null && g.score !== undefined).length;
    const total = grades.length;
    const earnedPoints = grades.reduce((sum, g) => sum + (g.score || 0), 0);
    const totalPoints = grades.reduce((sum, g) => sum + g.max_points, 0);
    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    return { completed, total, earnedPoints, totalPoints, percentage };
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{error}</h3>
      </div>
    );
  }

  if (!gradebook) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {gradebook.summary && (
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <AcademicCapIcon className="mx-auto h-8 w-8 text-primary-600 dark:text-primary-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('gradebook.current_grade')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {gradebook.summary.letter_grade || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {gradebook.summary.current_grade !== null && gradebook.summary.current_grade !== undefined
                    ? `${gradebook.summary.current_grade.toFixed(1)}%`
                    : '-'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('gradebook.points_earned')}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                  {gradebook.summary.total_points_earned.toFixed(1)} / {gradebook.summary.total_points_possible}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('gradebook.assignments_completed')}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                  {gradebook.summary.assignments_completed} / {gradebook.summary.assignments_total}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('gradebook.completion_rate')}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                  {gradebook.summary.assignments_total > 0
                    ? `${((gradebook.summary.assignments_completed / gradebook.summary.assignments_total) * 100).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Grades by Module */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('gradebook.assignment_grades')}
        </h3>

        {gradebook.modules.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('gradebook.no_grades')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('gradebook.no_grades_description')}
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          gradebook.modules.map((module) => {
            const stats = calculateModuleStats(module.grades);
            const isExpanded = module.module_id ? expandedModules.has(module.module_id) : true;

            return (
              <Card key={module.module_id || 'unassigned'}>
                <div
                  className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => toggleModule(module.module_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {module.module_id && (
                        <>
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          )}
                        </>
                      )}
                      <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                        {module.module_title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-gray-500 dark:text-gray-400">
                          {stats.completed}/{stats.total} {t('gradebook.assignments_completed')}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {stats.earnedPoints.toFixed(1)}/{stats.totalPoints} {t('gradebook.points')}
                        </div>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <div className={`text-lg font-bold ${
                          stats.percentage >= 90 ? 'text-green-600 dark:text-green-400' :
                          stats.percentage >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.percentage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <CardBody>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('gradebook.assignment')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('gradebook.due_date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('gradebook.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('gradebook.score')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('gradebook.percentage')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {module.grades.map((grade) => (
                            <tr key={grade.assignment_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {grade.assignment_title}
                                </div>
                                {grade.category && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {grade.category}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(grade.due_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(grade)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`font-medium ${
                                  grade.score !== null && grade.score !== undefined
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  {grade.score !== null && grade.score !== undefined
                                    ? `${grade.score.toFixed(1)} / ${grade.max_points}`
                                    : `- / ${grade.max_points}`}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`font-medium ${
                                  grade.percentage !== null && grade.percentage !== undefined
                                    ? grade.percentage >= 90 ? 'text-green-600 dark:text-green-400' :
                                      grade.percentage >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-red-600 dark:text-red-400'
                                    : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  {grade.percentage !== null && grade.percentage !== undefined
                                    ? `${grade.percentage.toFixed(1)}%`
                                    : '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
