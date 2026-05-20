import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  ArchiveBoxIcon,
  DocumentTextIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import {
  CourseArchiveSnapshotResponse,
  coursesApi,
} from '../api/courses';
import { extractErrorMessage } from '../api/client';
import { Layout, Loading } from '../components';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

const getDisplayTitle = (titleUk?: string, titleEn?: string, fallback?: string) =>
  titleUk || titleEn || fallback || 'Archived course';

export const CourseArchive: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<CourseArchiveSnapshotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing course id');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const loadSnapshot = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await coursesApi.getArchive(id);
        if (!mounted) return;
        setSnapshot(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(extractErrorMessage(err));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSnapshot();
    return () => {
      mounted = false;
    };
  }, [id]);

  const course = snapshot?.payload?.course;
  const modules = snapshot?.payload?.modules || [];
  const assignments = snapshot?.payload?.assignments || [];

  const title = useMemo(
    () => getDisplayTitle(course?.titleUk, course?.titleEn, course?.code),
    [course]
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <Breadcrumbs
          items={[
            { label: t('courses.title', 'Courses'), to: '/courses' },
            { label: title },
            { label: t('courses.archive', 'Archive') },
          ]}
        />

        {error && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--fn-error)',
            }}
          >
            {error}
          </div>
        )}

        {!error && snapshot && (
          <>
            <section
              className="rounded-lg border p-5"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p
                    className="mb-1 text-xs uppercase tracking-wider"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <ArchiveBoxIcon className="mr-1 inline h-4 w-4" />
                    {t('courses.archiveSnapshot', 'Archive snapshot')}
                  </p>
                  <h1
                    className="text-2xl font-semibold"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {title}
                  </h1>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {course?.code}
                    {course?.academicYear ? ` · ${course.academicYear}` : ''}
                  </p>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <p>
                    {t('common.version', 'Version')}: {snapshot.version}
                  </p>
                  <p>
                    {t('common.created', 'Created')}:{' '}
                    {snapshot.createdAt ? format(new Date(snapshot.createdAt), 'yyyy-MM-dd HH:mm') : 'n/a'}
                  </p>
                </div>
              </div>

              {course?.syllabus && (
                <div className="mt-4 rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    Syllabus
                  </p>
                  <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {course.syllabus}
                  </p>
                </div>
              )}
            </section>

            <section
              className="rounded-lg border p-5"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <h2
                className="mb-3 text-lg font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {t('courses.modules', 'Modules')} ({modules.length})
              </h2>

              {modules.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('courses.archiveEmptyModules', 'No published modules were captured.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {modules.map((module, index) => (
                    <article
                      key={module.moduleId}
                      className="rounded-md border p-4"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                    >
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {index + 1}. {module.title}
                      </h3>
                      {module.description && (
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {module.description}
                        </p>
                      )}

                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                            {t('resources.title', 'Resources')} ({module.resources.length})
                          </p>
                          {module.resources.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              {t('resources.none', 'No resources')}
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {module.resources.map((resource) => (
                                <li key={resource.resourceId} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {resource.title}
                                  {(resource.fileUrl || resource.externalUrl) && (
                                    <a
                                      href={resource.fileUrl || resource.externalUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-1 inline-flex items-center gap-1 text-xs"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                      {t('common.open', 'Open')}
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                            {t('pages.title', 'Pages')} ({module.pages.length})
                          </p>
                          {module.pages.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              {t('pages.none', 'No pages')}
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {module.pages.map((page) => (
                                <li key={page.pageId} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  <DocumentTextIcon className="mr-1 inline h-4 w-4" />
                                  {page.title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="rounded-lg border p-5"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <h2
                className="mb-3 text-lg font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {t('courses.assignments', 'Assignments')} ({assignments.length})
              </h2>

              {assignments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('courses.archiveEmptyAssignments', 'No published assignments were captured.')}
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.assignmentId}
                      className="rounded-md border p-3"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {assignment.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {assignment.assignmentType}
                            {assignment.dueDate ? ` · ${assignment.dueDate}` : ''}
                          </p>
                        </div>
                        <Link
                          to={`/assignments/${assignment.assignmentId}/print`}
                          className="text-xs underline"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('assignment.printFriendly', 'Print view')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CourseArchive;
