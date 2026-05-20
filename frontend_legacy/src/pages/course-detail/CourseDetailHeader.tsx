import React from 'react';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  EyeIcon,
  PlusIcon,
  RectangleStackIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, CardHeader } from '../../components';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { RichContentRenderer } from '../../components/common/RichContentRenderer';
import { Course } from '../../types';

interface CourseDetailHeaderProps {
  courseId: string;
  course: Course;
  isInstructor: boolean;
  isPublishActionLoading: boolean;
  isArchiveActionLoading: boolean;
  onOpenEnrollModal: () => void;
  onTogglePublish: () => void;
  onArchiveCourse: () => void;
  t: TFunction;
}

export const CourseDetailHeader: React.FC<CourseDetailHeaderProps> = ({
  courseId,
  course,
  isInstructor,
  isPublishActionLoading,
  isArchiveActionLoading,
  onOpenEnrollModal,
  onTogglePublish,
  onArchiveCourse,
  t,
}) => (
  <div className="mb-8">
    <Breadcrumbs
      className="mb-4"
      items={[
        { label: t('courses.title'), to: '/courses' },
        { label: course.title },
      ]}
    />

    <Card>
      {course.thumbnailUrl ? (
        <div
          className="h-28 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
        />
      ) : (
        <div
          className="h-2 w-full"
          style={{ background: course.themeColor || 'var(--text-primary)' }}
        />
      )}
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
                  background:
                    course.status === 'ARCHIVED'
                      ? 'rgba(148,163,184,0.18)'
                      : course.isPublished
                        ? 'rgba(34,197,94,0.16)'
                        : 'rgba(245,158,11,0.16)',
                  color:
                    course.status === 'ARCHIVED'
                      ? 'var(--text-muted)'
                      : course.isPublished
                        ? 'var(--fn-success)'
                        : 'var(--fn-warning)',
                }}
              >
                {course.status === 'ARCHIVED'
                  ? t('courses.filter_archived', 'Archived')
                  : course.isPublished
                    ? t('common.published', 'Published')
                    : t('common.draft', 'Draft')}
              </span>
              {course.themeColor && (
                <span
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                  style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}
                >
                  <SwatchIcon className="h-3.5 w-3.5" />
                  {course.themeColor}
                </span>
              )}
            </div>
            <h2 className="text-sm" style={{ color: 'var(--text-muted)' }}>{course.code}</h2>
          </div>
          {isInstructor && (
            <div className="flex flex-wrap gap-2 justify-end">
              {course.status !== 'ARCHIVED' && (
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
              )}
              {course.status !== 'ARCHIVED' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onArchiveCourse}
                  isLoading={isArchiveActionLoading}
                >
                  {t('courses.archiveCourse', 'Archive')}
                </Button>
              )}
              {course.isPublished && (
                <Link to={`/courses/${courseId}/preview`}>
                  <Button variant="secondary" size="sm">
                    <EyeIcon className="mr-1 h-4 w-4" />
                    {t('courses.preview', 'Preview')}
                  </Button>
                </Link>
              )}
              {course.status === 'ARCHIVED' && (
                <Link to={`/courses/${courseId}/archive`}>
                  <Button variant="secondary" size="sm">
                    <ArchiveBoxIcon className="mr-1 h-4 w-4" />
                    {t('courses.archive', 'Archive')}
                  </Button>
                </Link>
              )}
              <Link to={`/courses/create?template=${courseId}`}>
                <Button variant="secondary" size="sm">
                  <RectangleStackIcon className="mr-1 h-4 w-4" />
                  {t('courses.cloneStructure', 'Clone semester')}
                </Button>
              </Link>
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
        <RichContentRenderer content={course.description} />
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
