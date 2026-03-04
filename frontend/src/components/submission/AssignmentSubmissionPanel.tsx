import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/client';
import { Button, Card, CardBody, CardHeader } from '..';

interface SubmissionFile {
  id: string;
  fileUrl: string;
  filename: string;
  fileSize: number;
  uploadedAt?: string;
}

interface SubmissionRecord {
  id: string;
  status: string;
  textAnswer: string;
  submissionUrl: string;
  programmingLanguage: string;
  grade: number | null;
  feedback: string;
  publishedGrade: number | null;
  publishedFeedback: string;
  publishedAt: string | null;
  isReReviewInProgress: boolean;
  files: SubmissionFile[];
  version: number | null;
  submissionVersion: number;
}

interface AssignmentSubmissionPanelProps {
  assignmentId: string;
  assignmentType: string;
  programmingLanguage?: string;
  maxPoints: number;
  latePenaltyPercent?: number;
  isVirtualLab?: boolean;
  onOpenVirtualLab?: () => void;
}

const parseSubmission = (raw: Record<string, unknown>): SubmissionRecord => ({
  id: String(raw.id ?? ''),
  status: String(raw.status ?? 'DRAFT').toUpperCase(),
  textAnswer: String(raw.textAnswer ?? raw.text_answer ?? ''),
  submissionUrl: String(raw.submissionUrl ?? raw.submission_url ?? ''),
  programmingLanguage: String(raw.programmingLanguage ?? raw.programming_language ?? ''),
  grade: raw.grade == null ? null : Number(raw.grade),
  feedback: String(raw.feedback ?? ''),
  publishedGrade:
    raw.publishedGrade == null && raw.published_grade == null
      ? null
      : Number(raw.publishedGrade ?? raw.published_grade),
  publishedFeedback: String(raw.publishedFeedback ?? raw.published_feedback ?? ''),
  publishedAt: raw.publishedAt
    ? String(raw.publishedAt)
    : raw.published_at
      ? String(raw.published_at)
      : null,
  isReReviewInProgress: Boolean(raw.isReReviewInProgress ?? raw.is_re_review_in_progress),
  files: Array.isArray(raw.files)
    ? raw.files.map((file) => {
      const entry = file as Record<string, unknown>;
      return {
        id: String(entry.id ?? ''),
        fileUrl: String(entry.fileUrl ?? entry.file_url ?? ''),
        filename: String(entry.filename ?? ''),
        fileSize: Number(entry.fileSize ?? entry.file_size ?? 0),
        uploadedAt: entry.uploadedAt
          ? String(entry.uploadedAt)
          : entry.uploaded_at
            ? String(entry.uploaded_at)
            : undefined,
      };
    })
    : [],
  version: raw.version == null && raw.entity_version == null ? null : Number(raw.version ?? raw.entity_version),
  submissionVersion: Number(raw.submissionVersion ?? raw.submission_version ?? 1),
});

const isReviewState = (status: string) =>
  status === 'IN_REVIEW' || status === 'SUBMITTED' || status === 'GRADED_DRAFT';

export const AssignmentSubmissionPanel: React.FC<AssignmentSubmissionPanelProps> = ({
  assignmentId,
  assignmentType,
  programmingLanguage,
  maxPoints,
  latePenaltyPercent,
  isVirtualLab,
  onOpenVirtualLab,
}) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [urlAnswer, setUrlAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [baseline, setBaseline] = useState({
    textAnswer: '',
    urlAnswer: '',
    codeAnswer: '',
    submittedAtVersion: 1,
  });

  const draftTimerRef = useRef<number | null>(null);

  const normalizedType = (assignmentType || 'FILE_UPLOAD').toUpperCase();

  const hasChanges = useMemo(() => {
    const textChanged = textAnswer.trim() !== baseline.textAnswer.trim();
    const urlChanged = urlAnswer.trim() !== baseline.urlAnswer.trim();
    const codeChanged = codeAnswer.trim() !== baseline.codeAnswer.trim();
    const filesChanged = selectedFiles.length > 0;
    return textChanged || urlChanged || codeChanged || filesChanged;
  }, [baseline.codeAnswer, baseline.textAnswer, baseline.urlAnswer, codeAnswer, selectedFiles.length, textAnswer, urlAnswer]);

  const canResubmit = useMemo(() => {
    if (!submission) return false;
    if (submission.status === 'DRAFT') return true;
    return hasChanges;
  }, [hasChanges, submission]);

  useEffect(() => {
    void loadOrCreateSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    if (!submission || submission.status !== 'DRAFT' || !hasChanges || submitting) {
      return;
    }

    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }

    draftTimerRef.current = window.setTimeout(() => {
      void saveDraft();
    }, 1500);

    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id, submission?.status, textAnswer, urlAnswer, codeAnswer, hasChanges, submitting]);

  const loadOrCreateSubmission = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ results?: Record<string, unknown>[]; content?: Record<string, unknown>[] } | Record<string, unknown>[]>(
        `/submissions?assignmentId=${assignmentId}`
      );

      const list = Array.isArray(response.data)
        ? response.data
        : response.data.results || response.data.content || [];

      if (list.length > 0) {
        hydrateFromSubmission(parseSubmission(list[0]));
        return;
      }

      const created = await apiClient.post<Record<string, unknown>>('/submissions', {
        assignmentId,
        status: 'DRAFT',
      });
      hydrateFromSubmission(parseSubmission(created.data));
    } catch (err) {
      const maybe = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybe.response?.data?.message || maybe.message || 'Failed to load submission state');
    } finally {
      setLoading(false);
    }
  };

  const hydrateFromSubmission = (next: SubmissionRecord) => {
    setSubmission(next);
    setTextAnswer(next.textAnswer || '');
    setCodeAnswer(next.textAnswer || '');
    setUrlAnswer(next.submissionUrl || '');
    setSelectedFiles([]);

    setBaseline({
      textAnswer: next.textAnswer || '',
      urlAnswer: next.submissionUrl || '',
      codeAnswer: next.textAnswer || '',
      submittedAtVersion: next.submissionVersion || 1,
    });
  };

  const saveDraft = async () => {
    if (!submission?.id || submission.status !== 'DRAFT') {
      return;
    }

    setSavingDraft(true);
    try {
      await apiClient.put(`/submissions/${submission.id}/draft`, {
        content: normalizedType === 'CODE' ? codeAnswer : textAnswer,
        submissionUrl: normalizedType === 'URL' ? urlAnswer : undefined,
        programmingLanguage: normalizedType === 'CODE' ? programmingLanguage : undefined,
      });

      setBaseline((prev) => ({
        ...prev,
        textAnswer,
        codeAnswer,
        urlAnswer,
      }));
    } catch (err) {
      const maybe = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybe.response?.data?.message || maybe.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const uploadSelectedFiles = async () => {
    if (!submission?.id || selectedFiles.length === 0) {
      return;
    }

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/submissions/${submission.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
  };

  const handleSubmit = async () => {
    if (!submission?.id) {
      return;
    }

    if (!canResubmit) {
      setError('Please make changes before resubmitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (normalizedType === 'FILE_UPLOAD') {
        await uploadSelectedFiles();
      }

      const payload: Record<string, unknown> = {};
      if (normalizedType === 'TEXT') {
        payload.type = 'TEXT';
        payload.text_answer = textAnswer;
      } else if (normalizedType === 'CODE') {
        payload.type = 'CODE';
        payload.code = codeAnswer;
        payload.language = programmingLanguage;
      } else if (normalizedType === 'URL') {
        payload.type = 'URL';
        payload.url = urlAnswer;
      } else if (normalizedType === 'FILE_UPLOAD') {
        payload.type = 'FILE_UPLOAD';
      }

      const response = await apiClient.post<Record<string, unknown>>(`/submissions/${submission.id}/submit`, payload);
      hydrateFromSubmission(parseSubmission(response.data));
      await loadOrCreateSubmission();
    } catch (err) {
      const maybe = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setError(
        maybe.response?.data?.message
          || maybe.response?.data?.error
          || maybe.message
          || 'Submission failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderInput = () => {
    if (normalizedType === 'URL') {
      return (
        <input
          type="url"
          className="input w-full"
          placeholder="https://..."
          value={urlAnswer}
          onChange={(event) => setUrlAnswer(event.target.value)}
        />
      );
    }

    if (normalizedType === 'CODE') {
      return (
        <textarea
          className="input w-full"
          rows={10}
          value={codeAnswer}
          onChange={(event) => setCodeAnswer(event.target.value)}
          placeholder={t('submission.code_placeholder', 'Enter your code solution')}
        />
      );
    }

    if (normalizedType === 'FILE_UPLOAD') {
      return (
        <input
          type="file"
          className="input w-full"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              setSelectedFiles(Array.from(event.target.files));
            }
          }}
        />
      );
    }

    return (
      <textarea
        className="input w-full"
        rows={8}
        value={textAnswer}
        onChange={(event) => setTextAnswer(event.target.value)}
        placeholder={t('submission.text_placeholder', 'Write your answer')}
      />
    );
  };

  if (loading) {
    return (
      <div id="assignment-submission-panel">
        <Card className="mt-8">
          <CardBody>
            <p style={{ color: 'var(--text-muted)' }}>{t('common.loading', 'Loading...')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isVirtualLab) {
    return (
      <div id="assignment-submission-panel">
        <Card className="mt-8">
          <CardHeader>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('submission.your_submission', 'Your Submission')}
            </h3>
          </CardHeader>
          <CardBody>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t('assignment.virtualLabSubmissionHint', 'Complete your task in the virtual lab workspace.')}
            </p>
            <Button onClick={onOpenVirtualLab}>{t('assignment.open_virtual_lab', 'Open Virtual Lab')}</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div id="assignment-submission-panel">
        <Card className="mt-8">
          <CardBody>
            <p style={{ color: 'var(--fn-error)' }}>{error || 'Submission state is unavailable.'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const publishedScore = submission.publishedGrade ?? submission.grade;
  const publishedFeedback = submission.publishedFeedback || submission.feedback;

  return (
    <div id="assignment-submission-panel">
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('submission.your_submission', 'Your Submission')}
            </h3>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {savingDraft && submission.status === 'DRAFT' ? 'Saving draft...' : submission.status.replaceAll('_', ' ')}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
          {submission.isReReviewInProgress && publishedScore !== null && (
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Re-review in progress
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Last published result stays visible until teacher publishes a new grade.
              </p>
            </div>
          )}

          {publishedScore !== null && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Published result
              </p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {publishedScore} / {maxPoints}
              </p>
              {publishedFeedback && (
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {publishedFeedback}
                </p>
              )}
              {submission.publishedAt && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Published at {new Date(submission.publishedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {isReviewState(submission.status) && (
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Under review. You can submit an updated version.
              </p>
            </div>
          )}

          {renderInput()}

          {normalizedType === 'FILE_UPLOAD' && selectedFiles.length > 0 && (
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedFiles.map((file) => (
                <li key={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
              ))}
            </ul>
          )}

          {submission.files.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Uploaded files
              </p>
              <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {submission.files.map((file) => (
                  <li key={file.id}>
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                      {file.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {typeof latePenaltyPercent === 'number' && latePenaltyPercent > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Late policy: {latePenaltyPercent}% penalty per day (teacher may override).
            </p>
          )}

          {error && <p style={{ color: 'var(--fn-error)' }}>{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={submitting || !canResubmit}>
                {submitting
                  ? t('submission.submitting', 'Submitting...')
                  : submission.status === 'DRAFT'
                    ? t('submission.submit_assignment', 'Submit Assignment')
                    : t('submission.resubmit', 'Resubmit')}
              </Button>
              {!canResubmit && submission.status !== 'DRAFT' && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Make a change to resubmit.
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AssignmentSubmissionPanel;
