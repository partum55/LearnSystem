import React, { useEffect, useMemo, useState } from 'react';
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
import { StaggeredList, StaggeredItem } from '../components/animation';
import { useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import { getAccessToken } from '../api/token';
import { coursesApi } from '../api/courses';
import { PlusIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Course } from '../types';

export const CourseList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading } = useCourseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<'my' | 'published' | 'search'>('my');
  const [remoteCourses, setRemoteCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (discoveryMode !== 'published') return;

    let active = true;
    void coursesApi.getPublished()
      .then((response) => {
        if (!active) return;
        setRemoteCourses(response.data as unknown as Course[]);
      })
      .catch(() => {
        if (!active) return;
        setRemoteCourses([]);
      });
    return () => { active = false; };
  }, [discoveryMode]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      if (discoveryMode === 'search') {
        setDiscoveryMode('my');
        setRemoteCourses(null);
      }
      return;
    }

    let active = true;
    setDiscoveryMode('search');
    const byCode = query.toLowerCase().startsWith('code:') ? query.slice(5).trim() : '';
    if (byCode) {
      void coursesApi.getByCode(byCode)
        .then((response) => {
          if (!active) return;
          setRemoteCourses(response.data ? [response.data as unknown as Course] : []);
        })
        .catch(() => {
          if (!active) return;
          setRemoteCourses([]);
        });
    } else {
      void coursesApi.search(query)
        .then((response) => {
          if (!active) return;
          setRemoteCourses(response.data as unknown as Course[]);
        })
        .catch(() => {
          if (!active) return;
          setRemoteCourses([]);
        });
    }

    return () => { active = false; };
  }, [searchTerm, discoveryMode]);

  const effectiveCourses = (remoteCourses ?? courses ?? []) as Course[];

  const semesters = useMemo(
    () =>
      Array.from(
        new Set(
          effectiveCourses
            .map((course: Course) => course.academicYear)
            .filter((year): year is string => Boolean(year))
        )
      ).sort((a, b) => b.localeCompare(a)),
    [effectiveCourses]
  );

  const filteredCourses = effectiveCourses.filter((course: Course) => {
    const matchesSearch =
      (course.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (course.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesVisibility =
      filterVisibility === 'all' || course.visibility === filterVisibility.toUpperCase();
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'archived'
          ? course.status === 'ARCHIVED'
          : course.status !== 'ARCHIVED';
    const matchesSemester =
      filterSemester === 'all' || course.academicYear === filterSemester;
    return matchesSearch && matchesVisibility && matchesStatus && matchesSemester;
  });

  const canCreateCourse = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                      placeholder={t('common.search') + ' (2+ chars uses backend search)'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={discoveryMode === 'my' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        setDiscoveryMode('my');
                        setRemoteCourses(null);
                        setSearchTerm('');
                      }}
                    >
                      My Courses
                    </Button>
                    <Button
                      variant={discoveryMode === 'published' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        setDiscoveryMode('published');
                        setRemoteCourses(null);
                        setSearchTerm('');
                      }}
                    >
                      Published Discovery
                    </Button>
                    {(['active', 'archived', 'all'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={filterStatus === status ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterStatus(status)}
                      >
                        {t(`courses.filter_${status}`, status)}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="course-semester-filter" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                      {t('courses.semester', 'Semester')}
                    </label>
                    <select
                      id="course-semester-filter"
                      value={filterSemester}
                      onChange={(event) => setFilterSemester(event.target.value)}
                      className="input py-1 text-sm"
                    >
                      <option value="all">{t('courses.filter_all', 'All')}</option>
                      {semesters.map((semester) => (
                        <option key={semester} value={semester}>
                          {semester}
                        </option>
                      ))}
                    </select>
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
              <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course: Course) => (
                  <StaggeredItem key={course.id}>
                  <Link to={course.status === 'ARCHIVED' ? `/courses/${course.id}/archive` : `/courses/${course.id}`}>
                    <Card hoverable className="h-full overflow-hidden">
                      {course.thumbnailUrl ? (
                        <div
                          className="h-28 bg-cover bg-center"
                          style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
                        />
                      ) : (
                        <div
                          className="h-1"
                          style={{ background: course.themeColor || 'var(--border-default)' }}
                        />
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-lg font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {course.code}
                            </h3>
                            {course.themeColor && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border"
                                style={{
                                  background: course.themeColor,
                                  borderColor: 'rgba(255,255,255,0.35)',
                                }}
                              />
                            )}
                          </div>
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
                  </StaggeredItem>
                ))}
              </StaggeredList>
            )}
          </div>
        </main>
      </div>

      {/* AI Course Generator Modal */}
      {showAIGenerator && (
        <AICourseGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
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
