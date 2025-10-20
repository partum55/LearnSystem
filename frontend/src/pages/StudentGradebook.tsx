import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

interface GradeEntry {
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  max_points: number;
  due_date: string | null;
  category: string | null;
  score: number | null;
  percentage: number | null;
  status: string;
  is_late: boolean;
  is_excused: boolean;
  graded_at: string | null;
  notes: string | null;
}

interface GradeSummary {
  current_grade: number | null;
  letter_grade: string;
  total_points_earned: number;
  total_points_possible: number;
  assignments_completed: number;
  assignments_total: number;
}

interface GradebookData {
  course_id: string;
  course_code: string;
  course_title: string;
  grades: GradeEntry[];
  summary: GradeSummary | null;
}

const StudentGradebook: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'score'>('date');

  useEffect(() => {
    fetchGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchGradebook = async () => {
    try {
      setLoading(true);
      const response = await api.get<GradebookData>(`/api/gradebook/student/${courseId}/`);
      setGradebook(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load gradebook');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isLate: boolean, isExcused: boolean) => {
    if (isExcused) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {t('gradebook.excused')}
        </span>
      );
    }
    
    if (isLate) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          {t('gradebook.late')}
        </span>
      );
    }

    const statusColors: Record<string, string> = {
      GRADED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      NOT_SUBMITTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {t(`gradebook.status.${status.toLowerCase()}`)}
      </span>
    );
  };

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-500';
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredAndSortedGrades = () => {
    if (!gradebook) return [];
    
    let filtered = gradebook.grades;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(g => g.category === filterCategory);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.assignment_title.localeCompare(b.assignment_title);
        case 'score':
          return (b.percentage || 0) - (a.percentage || 0);
        case 'date':
        default:
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      }
    });
    
    return sorted;
  };

  const categories = gradebook ? Array.from(new Set(gradebook.grades.map(g => g.category).filter(Boolean))) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !gradebook) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error || t('gradebook.error')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/courses/${courseId}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-2 inline-block">
          ← {t('common.back_to_course')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('gradebook.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {gradebook.course_code} - {gradebook.course_title}
        </p>
      </div>

      {/* Summary Card */}
      {gradebook.summary && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">{t('gradebook.current_grade')}</p>
              <p className="text-4xl font-bold">
                {gradebook.summary.current_grade !== null 
                  ? `${gradebook.summary.current_grade.toFixed(1)}%` 
                  : 'N/A'}
              </p>
              <p className="text-2xl font-semibold mt-1">
                {gradebook.summary.letter_grade}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">{t('gradebook.points_earned')}</p>
              <p className="text-2xl font-bold">
                {gradebook.summary.total_points_earned.toFixed(1)} / {gradebook.summary.total_points_possible.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">{t('gradebook.assignments_completed')}</p>
              <p className="text-2xl font-bold">
                {gradebook.summary.assignments_completed} / {gradebook.summary.assignments_total}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">{t('gradebook.completion_rate')}</p>
              <p className="text-2xl font-bold">
                {gradebook.summary.assignments_total > 0
                  ? ((gradebook.summary.assignments_completed / gradebook.summary.assignments_total) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('gradebook.filter_category')}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">{t('gradebook.all_categories')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('gradebook.sort_by')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="date">{t('gradebook.sort.due_date')}</option>
              <option value="title">{t('gradebook.sort.title')}</option>
              <option value="score">{t('gradebook.sort.score')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('gradebook.assignment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('gradebook.due_date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('gradebook.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('gradebook.score')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('gradebook.percentage')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedGrades().map((grade) => (
                <tr key={grade.assignment_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <Link
                      to={`/courses/${courseId}/assignments/${grade.assignment_id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                    >
                      {grade.assignment_title}
                    </Link>
                    {grade.category && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ({grade.category})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {grade.due_date 
                      ? new Date(grade.due_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(grade.status, grade.is_late, grade.is_excused)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${getGradeColor(grade.percentage)}`}>
                      {grade.score !== null 
                        ? `${grade.score.toFixed(1)} / ${grade.max_points}` 
                        : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-lg font-bold ${getGradeColor(grade.percentage)}`}>
                      {grade.percentage !== null ? `${grade.percentage.toFixed(1)}%` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedGrades().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('gradebook.no_grades')}</p>
        </div>
      )}
    </div>
  );
};

export default StudentGradebook;
