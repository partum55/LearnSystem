import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Layout, Card, CardBody, Loading } from '../components';
import apiClient, { extractErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { AcademicCapIcon, ChartBarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface CourseGrade {
  course_id: string;
  course_code: string;
  course_title: string;
  current_grade?: number;
  letter_grade?: string;
  total_points_earned: number;
  total_points_possible: number;
  assignments_completed: number;
  assignments_total: number;
  completion_rate: number;
}

interface AllGradesData {
  student_id: string;
  student_name: string;
  courses: CourseGrade[];
}

interface ApiCourse {
  id: string;
  code?: string;
  title?: string;
  titleUk?: string;
  titleEn?: string;
}

interface ApiGradebookEntry {
  maxScore: number;
  score?: number;
  finalScore?: number;
  overrideScore?: number;
}

export const AllGrades: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [gradesData, setGradesData] = useState<AllGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const fetchAllGrades = useCallback(async () => {
    if (!user?.id) {
      setError(t('gradebook.error'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const coursesResponse = await apiClient.get<{ content?: ApiCourse[] }>('/courses/my?size=100');
      const courses = coursesResponse.data.content || [];

      const gradeRows = await Promise.all(
        courses.map(async (course): Promise<CourseGrade> => {
          const entriesResponse = await apiClient.get<ApiGradebookEntry[]>(
            `/gradebook/entries/course/${course.id}/student/${user.id}`
          );
          const entries = entriesResponse.data || [];
          const gradedEntries = entries.filter((entry) => {
            const resolved = entry.finalScore ?? entry.overrideScore ?? entry.score;
            return resolved !== undefined && resolved !== null;
          });

          const totalPointsEarned = gradedEntries.reduce((sum, entry) => {
            const resolved = entry.finalScore ?? entry.overrideScore ?? entry.score ?? 0;
            return sum + Number(resolved);
          }, 0);
          const totalPointsPossible = gradedEntries.reduce((sum, entry) => sum + Number(entry.maxScore || 0), 0);
          const currentGrade = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : undefined;

          return {
            course_id: course.id,
            course_code: course.code || '',
            course_title: course.title || course.titleUk || course.titleEn || '',
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
            assignments_total: entries.length,
            completion_rate: entries.length > 0 ? (gradedEntries.length / entries.length) * 100 : 0,
          };
        })
      );

      setGradesData({
        student_id: user.id,
        student_name: user.display_name || user.email,
        courses: gradeRows,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch all grades:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    fetchAllGrades();
  }, [fetchAllGrades]);

  const getLetterGradeColor = (letterGrade?: string): React.CSSProperties => {
    if (!letterGrade) return { color: 'var(--text-muted)' };

    const grade = letterGrade.charAt(0);
    switch (grade) {
      case 'A':
        return { color: 'var(--fn-success)' };
      case 'B':
        return { color: 'var(--text-secondary)' };
      case 'C':
        return { color: 'var(--fn-warning)' };
      case 'D':
        return { color: 'var(--fn-warning)' };
      case 'F':
        return { color: 'var(--fn-error)' };
      default:
        return { color: 'var(--text-muted)' };
    }
  };

  const calculateOverallGPA = () => {
    if (!gradesData || gradesData.courses.length === 0) return null;

    const coursesWithGrades = gradesData.courses.filter(c => c.current_grade !== null);
    if (coursesWithGrades.length === 0) return null;

    const totalGrade = coursesWithGrades.reduce((sum, c) => sum + (c.current_grade || 0), 0);
    return (totalGrade / coursesWithGrades.length).toFixed(1);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Loading />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('grades.my_grades')}
            </h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              {t('grades.overview_description')}
            </p>
          </div>

          {error && (
            <Card className="mb-6">
              <CardBody>
                <div className="text-center" style={{ color: 'var(--fn-error)' }}>
                  {error}
                </div>
              </CardBody>
            </Card>
          )}

          {gradesData && (
            <>
              {/* Overall Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card>
                  <CardBody>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AcademicCapIcon className="h-12 w-12" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <div className="ml-5">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          {t('grades.overall_average')}
                        </p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {calculateOverallGPA() || 'N/A'}
                          {calculateOverallGPA() && <span className="text-lg">%</span>}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-12 w-12" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <div className="ml-5">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          {t('grades.total_courses')}
                        </p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {gradesData.courses.length}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-12 w-12" style={{ color: 'var(--fn-success)' }} />
                      </div>
                      <div className="ml-5">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          {t('grades.total_assignments')}
                        </p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {gradesData.courses.reduce((sum, c) => sum + c.assignments_completed, 0)} / {gradesData.courses.reduce((sum, c) => sum + c.assignments_total, 0)}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Course Grades */}
              <Card>
                <CardBody>
                  <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                    {t('grades.course_grades')}
                  </h2>

                  <div className="table-container">
                    <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-elevated)' }}>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('grades.course')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('grades.current_grade')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('grades.points')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('grades.completion')}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {t('common.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradesData.courses.map((course) => (
                          <tr
                            key={course.course_id}
                            style={{
                              background: hoveredRow === course.course_id ? 'var(--bg-hover)' : 'transparent',
                              borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                            }}
                            onMouseEnter={() => setHoveredRow(course.course_id)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {course.course_title}
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {course.course_code}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-2xl font-bold" style={getLetterGradeColor(course.letter_grade)}>
                                  {course.letter_grade || '-'}
                                </span>
                                {course.current_grade != null && (
                                  <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                    ({course.current_grade.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                              {course.total_points_earned.toFixed(1)} / {course.total_points_possible}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-full rounded-full h-2.5 max-w-[100px]" style={{ background: 'var(--bg-overlay)' }}>
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{ width: `${course.completion_rate}%`, background: 'var(--text-primary)' }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {course.completion_rate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link
                                to={`/courses/${course.course_id}`}
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {t('common.view_details')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {gradesData.courses.length === 0 && (
                    <div className="text-center py-12">
                      <AcademicCapIcon className="mx-auto h-12 w-12" style={{ color: 'var(--text-muted)' }} />
                      <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t('grades.no_courses')}
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {t('grades.no_courses_description')}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
