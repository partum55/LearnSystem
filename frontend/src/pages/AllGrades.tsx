import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Layout, Card, CardBody, Loading } from '../components';
import apiClient from '../api/client';
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

export const AllGrades: React.FC = () => {
  const { t } = useTranslation();
  const [gradesData, setGradesData] = useState<AllGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllGrades();
  }, []);

  const fetchAllGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AllGradesData>('/gradebook/entries/student/all/');
      setGradesData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch all grades:', err);
      setError(err.response?.data?.error || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const getLetterGradeColor = (letterGrade?: string) => {
    if (!letterGrade) return 'text-gray-500';
    
    const grade = letterGrade.charAt(0);
    switch (grade) {
      case 'A':
        return 'text-green-600 dark:text-green-400';
      case 'B':
        return 'text-blue-600 dark:text-blue-400';
      case 'C':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'D':
        return 'text-orange-600 dark:text-orange-400';
      case 'F':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('grades.my_grades')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('grades.overview_description')}
              </p>
            </div>

            {error && (
              <Card className="mb-6">
                <CardBody>
                  <div className="text-center text-red-600 dark:text-red-400">
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
                          <AcademicCapIcon className="h-12 w-12 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t('grades.overall_average')}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">
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
                          <ChartBarIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t('grades.total_courses')}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">
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
                          <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t('grades.total_assignments')}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      {t('grades.course_grades')}
                    </h2>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('grades.course')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('grades.current_grade')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('grades.points')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('grades.completion')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('common.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {gradesData.courses.map((course) => (
                            <tr key={course.course_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {course.course_title}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {course.course_code}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className={`text-2xl font-bold ${getLetterGradeColor(course.letter_grade)}`}>
                                    {course.letter_grade || '-'}
                                  </span>
                                  {course.current_grade != null && (
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                      ({course.current_grade.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {course.total_points_earned.toFixed(1)} / {course.total_points_possible}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[100px]">
                                    <div
                                      className="bg-primary-600 h-2.5 rounded-full"
                                      style={{ width: `${course.completion_rate}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    {course.completion_rate.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link
                                  to={`/courses/${course.course_id}`}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
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
                        <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                          {t('grades.no_courses')}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
