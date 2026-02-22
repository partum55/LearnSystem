import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient, { extractErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
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

interface ApiGradebookEntry {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  score?: number;
  finalScore?: number;
  overrideScore?: number;
  percentage?: number;
  status: string;
  late: boolean;
  excused: boolean;
}

interface CourseGradesTabProps {
  courseId: string;
}

const getPercentageColor = (pct: number) =>
  pct >= 90 ? 'var(--fn-success)' : pct >= 70 ? 'var(--fn-warning)' : 'var(--fn-error)';

export const CourseGradesTab: React.FC<CourseGradesTabProps> = ({ courseId }) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  const fetchGradebook = async () => {
    if (!user?.id) {
      setError(t('gradebook.error'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [entriesResponse, courseResponse] = await Promise.all([
        apiClient.get<ApiGradebookEntry[]>(`/gradebook/entries/course/${courseId}/student/${user.id}`),
        apiClient.get<{ code?: string; title?: string; titleUk?: string; titleEn?: string }>(`/courses/${courseId}`),
      ]);

      const grades: GradeEntry[] = (entriesResponse.data || []).map((entry) => {
        const resolvedScore = entry.finalScore ?? entry.overrideScore ?? entry.score;
        return {
          assignment_id: entry.assignmentId,
          assignment_title: entry.assignmentTitle,
          assignment_type: 'ASSIGNMENT',
          max_points: Number(entry.maxScore || 0),
          score: resolvedScore !== undefined && resolvedScore !== null ? Number(resolvedScore) : undefined,
          percentage: entry.percentage !== undefined && entry.percentage !== null ? Number(entry.percentage) : undefined,
          status: entry.status,
          is_late: Boolean(entry.late),
          is_excused: Boolean(entry.excused),
        };
      });

      const gradedEntries = grades.filter((grade) => grade.score !== undefined && grade.score !== null);
      const totalPointsEarned = gradedEntries.reduce((sum, grade) => sum + (grade.score || 0), 0);
      const totalPointsPossible = gradedEntries.reduce((sum, grade) => sum + grade.max_points, 0);
      const currentGrade = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : undefined;

      const mapped: GradebookData = {
        course_id: courseId,
        course_code: courseResponse.data?.code || '',
        course_title:
          courseResponse.data?.title ||
          courseResponse.data?.titleUk ||
          courseResponse.data?.titleEn ||
          '',
        summary: {
          current_grade: currentGrade,
          letter_grade:
            currentGrade === undefined ? '-' :
              currentGrade >= 90 ? 'A' :
                currentGrade >= 80 ? 'B' :
                  currentGrade >= 70 ? 'C' :
                    currentGrade >= 60 ? 'D' : 'F',
          total_points_earned: totalPointsEarned,
          total_points_possible: totalPointsPossible,
          assignments_completed: gradedEntries.length,
          assignments_total: grades.length,
        },
        modules: [
          {
            module_id: 'all',
            module_title: t('gradebook.assignment_grades'),
            module_position: 0,
            grades,
          },
        ],
      };

      setGradebook(mapped);
      setExpandedModules(new Set(['all']));
    } catch (err: unknown) {
      console.error('Failed to fetch gradebook:', err);
      setError(extractErrorMessage(err));
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
        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <ExclamationCircleIcon className="w-4 h-4 mr-1" />
          {t('gradebook.excused')}
        </span>
      );
    }

    switch (entry.status) {
      case 'GRADED':
        return (
          <span className="badge badge-success">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.graded')}
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <ClockIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.submitted')}
          </span>
        );
      case 'MISSING':
        return (
          <span className="badge badge-error">
            <XCircleIcon className="w-4 h-4 mr-1" />
            {t('gradebook.status.missing')}
          </span>
        );
      case 'LATE':
        return (
          <span className="badge badge-warning">
            <ClockIcon className="w-4 h-4 mr-1" />
            {t('gradebook.late')}
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
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
        <XCircleIcon className="mx-auto h-12 w-12" style={{ color: 'var(--fn-error)' }} />
        <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</h3>
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
                <AcademicCapIcon className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.current_grade')}
                </p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {gradebook.summary.letter_grade || 'N/A'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {gradebook.summary.current_grade !== null && gradebook.summary.current_grade !== undefined
                    ? `${gradebook.summary.current_grade.toFixed(1)}%`
                    : '-'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.points_earned')}
                </p>
                <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {gradebook.summary.total_points_earned.toFixed(1)} / {gradebook.summary.total_points_possible}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.assignments_completed')}
                </p>
                <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {gradebook.summary.assignments_completed} / {gradebook.summary.assignments_total}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.completion_rate')}
                </p>
                <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
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
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {t('gradebook.assignment_grades')}
        </h3>

        {gradebook.modules.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <AcademicCapIcon className="mx-auto h-12 w-12" style={{ color: 'var(--text-faint)' }} />
                <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('gradebook.no_grades')}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
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
                  className="px-6 py-4 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  onClick={() => toggleModule(module.module_id)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {module.module_id && (
                        <>
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </>
                      )}
                      <FolderIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                      <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {module.module_title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div style={{ color: 'var(--text-muted)' }}>
                          {stats.completed}/{stats.total} {t('gradebook.assignments_completed')}
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {stats.earnedPoints.toFixed(1)}/{stats.totalPoints} {t('gradebook.points')}
                        </div>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <div
                          className="text-lg font-bold"
                          style={{ color: getPercentageColor(stats.percentage) }}
                        >
                          {stats.percentage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <CardBody>
                    <div className="overflow-x-auto">
                      <table className="table-container min-w-full">
                        <thead style={{ background: 'var(--bg-elevated)' }}>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('gradebook.assignment')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('gradebook.due_date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('gradebook.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('gradebook.score')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {t('gradebook.percentage')}
                            </th>
                          </tr>
                        </thead>
                        <tbody style={{ background: 'var(--bg-surface)' }}>
                          {module.grades.map((grade) => (
                            <tr
                              key={grade.assignment_id}
                              style={{ borderBottom: '1px solid var(--border-default)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {grade.assignment_title}
                                </div>
                                {grade.category && (
                                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {grade.category}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-muted)' }}>
                                {formatDate(grade.due_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(grade)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: grade.score !== null && grade.score !== undefined
                                      ? 'var(--text-primary)'
                                      : 'var(--text-faint)'
                                  }}
                                >
                                  {grade.score !== null && grade.score !== undefined
                                    ? `${grade.score.toFixed(1)} / ${grade.max_points}`
                                    : `- / ${grade.max_points}`}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: grade.percentage !== null && grade.percentage !== undefined
                                      ? getPercentageColor(grade.percentage)
                                      : 'var(--text-faint)'
                                  }}
                                >
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
