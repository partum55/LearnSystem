import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Header,
  Sidebar,
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Loading,
  AICourseGenerator,
} from '../components';
import { useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { getAccessToken } from '../api/token';
import { PlusIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Course } from '../types';

export const CourseList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading } = useCourseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = (courses || []).filter((course: Course) => {
    const matchesSearch =
      (course.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (course.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterVisibility === 'all' || course.visibility === filterVisibility.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const canCreateCourse = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {t('courses.title')}
                </h1>
                <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                  {filteredCourses.length} {t('courses.title').toLowerCase()}
                </p>
              </div>
              {canCreateCourse && (
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAIGenerator(true)}
                  >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    AI Generator
                  </Button>
                  <Link to="/courses/create">
                    <Button>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      {t('courses.createCourse')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Search and Filter */}
            <Card className="mb-6">
              <CardBody>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5"
                      style={{ color: 'var(--text-faint)' }}
                    />
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
                  <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
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
                          <h3
                            className="text-lg font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {course.code}
                          </h3>
                          <span
                            className={`badge ${
                              course.visibility === 'PUBLIC'
                                ? 'badge-success'
                                : course.visibility === 'PRIVATE'
                                  ? ''
                                  : 'badge-warning'
                            }`}
                          >
                            {t(`courses.${(course.visibility?.toLowerCase() || 'public')}`)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <h4
                          className="font-medium mb-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {course.title}
                        </h4>
                        <p
                          className="text-sm line-clamp-2 mb-4"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-muted)' }}>
                            {course.ownerName || t('courses.instructor')}
                          </span>
                          {course.memberCount !== undefined && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {course.memberCount} {t('courses.students')}
                            </span>
                          )}
                        </div>
                        {course.progress !== undefined && (
                          <div className="mt-4">
                            <div
                              className="flex justify-between text-xs mb-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <span>Progress</span>
                              <span>{course.progress}%</span>
                            </div>
                            <div
                              className="w-full rounded-full h-2"
                              style={{ background: 'var(--bg-overlay)' }}
                            >
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${course.progress}%`,
                                  background: 'var(--text-primary)',
                                }}
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

      {/* AI Course Generator Modal */}
      {showAIGenerator && (
        <AICourseGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          userId={user?.id}
          authToken={getAccessToken() || ''}
          onCourseGenerated={(course) => {
            console.log('AI generated course:', course);
            setShowAIGenerator(false);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
};

export default CourseList;
