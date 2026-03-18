import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { coursesApi, CoursePreviewResponse } from '../api/courses';
import { extractErrorMessage } from '../api/client';
import { Loading } from '../components';

const getPreferredText = (uk?: string, en?: string) => uk || en || '';

export const CoursePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [preview, setPreview] = useState<CoursePreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing course id');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await coursesApi.getPreview(id);
        if (!isMounted) return;
        setPreview(response.data);
      } catch (err) {
        if (!isMounted) return;
        setError(extractErrorMessage(err));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const displayTitle = useMemo(
    () => getPreferredText(preview?.titleUk, preview?.titleEn) || preview?.code || 'Course Preview',
    [preview]
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Link>

        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--fn-error)',
            }}
          >
            {error}
          </div>
        )}

        {!error && preview && (
          <div className="space-y-6">
            <section
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--border-default)',
                background: 'var(--bg-surface)',
              }}
            >
              {preview.thumbnailUrl ? (
                <div
                  className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${preview.thumbnailUrl})` }}
                />
              ) : (
                <div
                  className="h-3"
                  style={{ background: preview.themeColor || 'var(--text-primary)' }}
                />
              )}

              <div className="space-y-4 px-5 py-5 sm:px-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      background: 'var(--bg-active)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {preview.code}
                  </span>
                  {preview.academicYear && (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {preview.academicYear}
                    </span>
                  )}
                </div>

                <h1
                  className="text-3xl font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {displayTitle}
                </h1>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {getPreferredText(preview.descriptionUk, preview.descriptionEn) || 'No description'}
                </p>

                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <BookOpenIcon className="h-4 w-4" />
                    {preview.moduleCount} modules
                  </span>
                  <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <DocumentTextIcon className="h-4 w-4" />
                    {preview.assignmentCount} assignments
                  </span>
                  {preview.ownerName && (
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <UserCircleIcon className="h-4 w-4" />
                      {preview.ownerName}
                    </span>
                  )}
                </div>
              </div>
            </section>

            {preview.syllabus && (
              <section
                className="rounded-xl border px-5 py-5 sm:px-7"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
              >
                <h2
                  className="mb-3 text-base font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  Syllabus
                </h2>
                <p
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {preview.syllabus}
                </p>
              </section>
            )}

            <section
              className="rounded-xl border px-5 py-5 sm:px-7"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <h2
                className="mb-4 text-base font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                Course Structure
              </h2>

              {preview.modules.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No published modules available.
                </p>
              ) : (
                <div className="space-y-3">
                  {preview.modules.map((module, index) => (
                    <article
                      key={module.moduleId}
                      className="rounded-lg border p-4"
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

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                            Resources
                          </p>
                          {module.resourceTitles.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              No resources listed
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {module.resourceTitles.map((title, idx) => (
                                <li key={`${module.moduleId}-resource-${idx}`} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                            Assignments
                          </p>
                          {module.assignmentTitles.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              No assignments in this module
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {module.assignmentTitles.map((title, idx) => (
                                <li key={`${module.moduleId}-assignment-${idx}`} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {title}
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

            <div className="flex justify-end">
              <Link
                to={id ? `/courses/${id}` : '/courses'}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
              >
                <AcademicCapIcon className="h-4 w-4" />
                Open course
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursePreview;
