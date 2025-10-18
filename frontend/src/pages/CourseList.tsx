import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Course } from '../types';

export const CourseList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading } = useCourseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = (courses || []).filter((course: Course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterVisibility === 'all' || course.visibility === filterVisibility.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const canCreateCourse = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('courses.title')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {filteredCourses.length} {t('courses.title').toLowerCase()}
                </p>
              </div>
              {canCreateCourse && (
                <Link to="/courses/create">
                  <Button>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {t('courses.createCourse')}
                  </Button>
                </Link>
              )}
            </div>

            {/* Search and Filter */}
            <Card className="mb-6">
              <CardBody>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={t('common.search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'public', 'private', 'draft'].map((filter) => (
                      <Button
                        key={filter}
                        variant={filterVisibility === filter ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterVisibility(filter)}
                      >
                        {t(`courses.${filter}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                    {t('dashboard.noCourses')}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course: Course) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <Card hoverable className="h-full">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {course.code}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              course.visibility === 'PUBLIC'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : course.visibility === 'PRIVATE'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {t(`courses.${course.visibility.toLowerCase()}`)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {course.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {course.owner_name || t('courses.instructor')}
                          </span>
                          {course.member_count !== undefined && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {course.member_count} {t('courses.students')}
                            </span>
                          )}
                        </div>
                        {course.progress !== undefined && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>{course.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CourseList;
