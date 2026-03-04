import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import api from '../api/client';
import { Button, Loading } from '../components';
import { parseCanonicalDocument } from '../features/editor-core';
import { DocumentRenderer } from '../features/editor-core/DocumentRenderer';

interface AssignmentPrintData {
  id: string;
  title: string;
  description: string;
  descriptionFormat: string;
  instructions?: string;
  instructionsFormat?: string;
  dueDate?: string;
  availableFrom?: string;
  maxPoints?: number;
  assignmentType?: string;
  submissionTypes: string[];
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  rubric?: Record<string, unknown>;
}

export const AssignmentPrintView: React.FC = () => {
  const { t } = useTranslation();
  const params = useParams<{
    id?: string;
    assignmentId?: string;
    courseId?: string;
    moduleId?: string;
  }>();
  const assignmentId = params.assignmentId || params.id;
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<AssignmentPrintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('print-assignment');
    return () => document.body.classList.remove('print-assignment');
  }, []);

  useEffect(() => {
    if (!assignmentId) {
      setError('Missing assignment id');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const fetchAssignment = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Record<string, unknown>>(
          `/assessments/assignments/${assignmentId}`
        );
        if (!mounted) return;
        const data = response.data;
        setAssignment({
          id: String(data.id || ''),
          title: String(data.title || ''),
          description: String(data.description || ''),
          descriptionFormat: String(data.descriptionFormat || data.description_format || 'MARKDOWN'),
          instructions: data.instructions ? String(data.instructions) : undefined,
          instructionsFormat: data.instructionsFormat
            ? String(data.instructionsFormat)
            : data.instructions_format
              ? String(data.instructions_format)
              : undefined,
          dueDate: data.dueDate ? String(data.dueDate) : undefined,
          availableFrom: data.availableFrom ? String(data.availableFrom) : undefined,
          maxPoints:
            typeof data.maxPoints === 'number'
              ? data.maxPoints
              : typeof data.max_points === 'number'
                ? data.max_points
                : undefined,
          assignmentType: data.assignmentType ? String(data.assignmentType) : undefined,
          submissionTypes:
            (Array.isArray(data.submissionTypes)
              ? data.submissionTypes
              : Array.isArray(data.submission_types)
                ? data.submission_types
                : []) as string[],
          allowLateSubmission: Boolean(
            data.allowLateSubmission ?? data.allow_late_submission ?? false
          ),
          latePenaltyPercent: Number(
            data.latePenaltyPercent ?? data.late_penalty_percent ?? 0
          ),
          rubric:
            typeof data.rubric === 'object' && data.rubric !== null
              ? (data.rubric as Record<string, unknown>)
              : undefined,
        });
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load assignment');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchAssignment();
    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  const backPath = useMemo(() => {
    if (params.courseId && params.moduleId && params.assignmentId) {
      return `/courses/${params.courseId}/modules/${params.moduleId}/assignments/${params.assignmentId}`;
    }
    return assignmentId ? `/assignments/${assignmentId}` : '/assignments';
  }, [assignmentId, params.assignmentId, params.courseId, params.moduleId]);

  const renderContent = (content: string, format?: string) => {
    if (!content) return null;
    if (format === 'RICH') {
      return <DocumentRenderer document={parseCanonicalDocument(content)} />;
    }
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {content}
      </p>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="print-page min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="print-no mb-5 flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <PrinterIcon className="mr-1 h-4 w-4" />
            {t('assignment.print', 'Print')}
          </Button>
        </div>

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

        {!error && assignment && (
          <article
            className="print-card rounded-lg border p-6"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <header className="mb-6 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                {assignment.assignmentType || 'Assignment'}
              </p>
              <h1
                className="mt-1 text-3xl font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {assignment.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                {assignment.dueDate && (
                  <span>{t('assignment.due', 'Due')}: {new Date(assignment.dueDate).toLocaleString()}</span>
                )}
                {assignment.availableFrom && (
                  <span>{t('assignment.availableFrom', 'Available from')}: {new Date(assignment.availableFrom).toLocaleString()}</span>
                )}
                {typeof assignment.maxPoints === 'number' && (
                  <span>{t('assignment.points', 'Points')}: {assignment.maxPoints}</span>
                )}
              </div>
            </header>

            <section className="mb-6">
              <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('assignment.description', 'Description')}
              </h2>
              {renderContent(assignment.description, assignment.descriptionFormat)}
            </section>

            {assignment.instructions && (
              <section className="mb-6">
                <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('assignment.instructions', 'Instructions')}
                </h2>
                {renderContent(assignment.instructions, assignment.instructionsFormat)}
              </section>
            )}

            {assignment.submissionTypes.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('assignment.submission_types', 'Submission types')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {assignment.submissionTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {assignment.allowLateSubmission && (
              <section className="mb-6">
                <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('assignment.late_policy', 'Late policy')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {assignment.latePenaltyPercent}% {t('assignment.penalty_per_day', 'penalty per day')}
                </p>
              </section>
            )}

            {assignment.rubric && Object.keys(assignment.rubric).length > 0 && (
              <section>
                <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('assignment.rubric', 'Rubric')}
                </h2>
                <pre
                  className="overflow-x-auto whitespace-pre-wrap rounded-md border p-3 text-xs"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {JSON.stringify(assignment.rubric, null, 2)}
                </pre>
              </section>
            )}
          </article>
        )}
      </div>
    </div>
  );
};

export default AssignmentPrintView;
