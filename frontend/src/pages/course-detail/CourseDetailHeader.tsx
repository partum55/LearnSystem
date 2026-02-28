import React from 'react';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { AcademicCapIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, CardHeader } from '../../components';
import { Course } from '../../types';

interface CourseDetailHeaderProps {
  courseId: string;
  course: Course;
  isInstructor: boolean;
  isPublishActionLoading: boolean;
  onOpenEnrollModal: () => void;
  onTogglePublish: () => void;
  t: TFunction;
}

export const CourseDetailHeader: React.FC<CourseDetailHeaderProps> = ({
  courseId,
  course,
  isInstructor,
  isPublishActionLoading,
  onOpenEnrollModal,
  onTogglePublish,
  t,
}) => (
  <div className="mb-8">
    <div className="mb-4 flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
      <Link
        to="/courses"
        className="transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('courses.title')}
      </Link>
      <span className="mx-2">/</span>
      <span>{course.title}</span>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <AcademicCapIcon className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} />
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                {course.title}
              </h1>
              <span
                className="rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  background: course.isPublished ? 'rgba(34,197,94,0.16)' : 'rgba(245,158,11,0.16)',
                  color: course.isPublished ? 'var(--fn-success)' : 'var(--fn-warning)',
                }}
              >
                {course.isPublished
                  ? t('common.published', 'Published')
                  : t('common.draft', 'Draft')}
              </span>
            </div>
            <h2 className="text-sm" style={{ color: 'var(--text-muted)' }}>{course.code}</h2>
          </div>
          {isInstructor && (
            <div className="flex gap-2">
              <Button
                variant={course.isPublished ? 'secondary' : 'primary'}
                size="sm"
                onClick={onTogglePublish}
                isLoading={isPublishActionLoading}
              >
                {course.isPublished
                  ? t('common.unpublish', 'Unpublish')
                  : t('common.publish', 'Publish')}
              </Button>
              <Link to={`/courses/${courseId}/edit`}>
                <Button variant="secondary" size="sm">
                  {t('common.edit')}
                </Button>
              </Link>
              <Button size="sm" onClick={onOpenEnrollModal}>
                <PlusIcon className="mr-1 h-4 w-4" />
                {t('courses.enrollStudents')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <p style={{ color: 'var(--text-muted)' }}>{course.description}</p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>{t('courses.instructor')}:</span>
            <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>
              {course.ownerName || 'Unknown'}
            </span>
          </div>
          {course.memberCount !== undefined && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{t('courses.students')}:</span>
              <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>{course.memberCount}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  </div>
);
