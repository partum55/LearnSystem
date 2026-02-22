import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

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

interface ApiGradebookEntry {
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

const StudentGradebook: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'score'>('date');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    fetchGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  const fetchGradebook = async () => {
    const queryCourseId = new URLSearchParams(window.location.search).get('courseId');
    const resolvedCourseId = courseId || queryCourseId;
    if (!resolvedCourseId || !user?.id) {
      setLoading(false);
      setError(t('gradebook.error'));
      return;
    }

    try {
      setLoading(true);
      const [entriesResponse, courseResponse] = await Promise.all([
        api.get<ApiGradebookEntry[]>(`/gradebook/entries/course/${resolvedCourseId}/student/${user.id}`),
        api.get<{ code?: string; title?: string; titleUk?: string; titleEn?: string }>(`/courses/${resolvedCourseId}`),
      ]);

      const grades: GradeEntry[] = (entriesResponse.data || []).map((entry) => {
        const resolvedScore = entry.finalScore ?? entry.overrideScore ?? entry.score;
        return {
          assignment_id: entry.assignmentId,
          assignment_title: entry.assignmentTitle,
          assignment_type: 'ASSIGNMENT',
          max_points: Number(entry.maxScore || 0),
          due_date: null,
          category: null,
          score: resolvedScore !== undefined && resolvedScore !== null ? Number(resolvedScore) : null,
          percentage: entry.percentage !== undefined && entry.percentage !== null ? Number(entry.percentage) : null,
          status: entry.status,
          is_late: Boolean(entry.late),
          is_excused: Boolean(entry.excused),
          graded_at: null,
          notes: null,
        };
      });

      const graded = grades.filter((grade) => grade.score !== null);
      const totalPointsEarned = graded.reduce((sum, grade) => sum + (grade.score || 0), 0);
      const totalPointsPossible = graded.reduce((sum, grade) => sum + grade.max_points, 0);
      const currentGrade = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : null;

      setGradebook({
        course_id: resolvedCourseId,
        course_code: courseResponse.data?.code || '',
        course_title:
          courseResponse.data?.title ||
          courseResponse.data?.titleUk ||
          courseResponse.data?.titleEn ||
          '',
        grades,
        summary: {
          current_grade: currentGrade,
          letter_grade:
            currentGrade === null ? '-' :
              currentGrade >= 90 ? 'A' :
                currentGrade >= 80 ? 'B' :
                  currentGrade >= 70 ? 'C' :
                    currentGrade >= 60 ? 'D' : 'F',
          total_points_earned: totalPointsEarned,
          total_points_possible: totalPointsPossible,
          assignments_completed: graded.length,
          assignments_total: grades.length,
        },
      });
      setError(null);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.response?.data?.message || 'Failed to load gradebook');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isLate: boolean, isExcused: boolean) => {
    if (isExcused) {
      return (
        <span className="badge">
          {t('gradebook.excused')}
        </span>
      );
    }

    if (isLate) {
      return (
        <span className="badge badge-warning">
          {t('gradebook.late')}
        </span>
      );
    }

    const statusClasses: Record<string, string> = {
      GRADED: 'badge badge-success',
      SUBMITTED: 'badge',
      NOT_SUBMITTED: 'badge badge-error',
    };

    return (
      <span className={statusClasses[status] || 'badge'}>
        {t(`gradebook.status.${status.toLowerCase()}`)}
      </span>
    );
  };

  const getGradeStyle = (percentage: number | null): React.CSSProperties => {
    if (percentage === null) return { color: 'var(--text-muted)' };
    if (percentage >= 90) return { color: 'var(--fn-success)' };
    if (percentage >= 80) return { color: 'var(--text-secondary)' };
    if (percentage >= 70) return { color: 'var(--fn-warning)' };
    if (percentage >= 60) return { color: 'var(--fn-warning)' };
    return { color: 'var(--fn-error)' };
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
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
      </div>
    );
  }

  if (error || !gradebook) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <p style={{ color: 'var(--fn-error)' }}>{error || t('gradebook.error')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/courses/${gradebook.course_id}`} className="mb-2 inline-block" style={{ color: 'var(--text-secondary)' }}>
          ← {t('common.back_to_course')}
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {t('gradebook.title')}
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
          {gradebook.course_code} - {gradebook.course_title}
        </p>
      </div>

      {/* Summary Card */}
      {gradebook.summary && (
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('gradebook.current_grade')}</p>
              <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {gradebook.summary.current_grade !== null
                  ? `${gradebook.summary.current_grade.toFixed(1)}%`
                  : 'N/A'}
              </p>
              <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                {gradebook.summary.letter_grade}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('gradebook.points_earned')}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {gradebook.summary.total_points_earned.toFixed(1)} / {gradebook.summary.total_points_possible.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('gradebook.assignments_completed')}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {gradebook.summary.assignments_completed} / {gradebook.summary.assignments_total}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('gradebook.completion_rate')}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {gradebook.summary.assignments_total > 0
                  ? ((gradebook.summary.assignments_completed / gradebook.summary.assignments_total) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg mb-6 p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('gradebook.filter_category')}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="all">{t('gradebook.all_categories')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t('gradebook.sort_by')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'score')}
              className="input"
            >
              <option value="date">{t('gradebook.sort.due_date')}</option>
              <option value="title">{t('gradebook.sort.title')}</option>
              <option value="score">{t('gradebook.sort.score')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.assignment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.due_date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.score')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.percentage')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGrades().map((grade) => (
                <tr
                  key={grade.assignment_id}
                  style={{
                    background: hoveredRow === grade.assignment_id ? 'var(--bg-hover)' : 'transparent',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={() => setHoveredRow(grade.assignment_id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/assignments/${grade.assignment_id}`}
                      className="font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {grade.assignment_title}
                    </Link>
                    {grade.category && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        ({grade.category})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {grade.due_date
                      ? new Date(grade.due_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(grade.status, grade.is_late, grade.is_excused)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium" style={getGradeStyle(grade.percentage)}>
                      {grade.score !== null
                        ? `${grade.score.toFixed(1)} / ${grade.max_points}`
                        : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold" style={getGradeStyle(grade.percentage)}>
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
          <p style={{ color: 'var(--text-muted)' }}>{t('gradebook.no_grades')}</p>
        </div>
      )}
    </div>
  );
};

export default StudentGradebook;
