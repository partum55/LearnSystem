import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Loading } from '../components';
import apiClient from '../api/client';
import { submissionsApi } from '../api/assessments';
import { GradingSuggestionPanel } from '../components/GradingSuggestionPanel';
import { PlagiarismCheckPanel } from '../components/PlagiarismCheckPanel';
import { RichContentRenderer } from '../components/common/RichContentRenderer';

interface Assignment {
  id: string;
  title: string;
  maxPoints: number;
  latePenaltyPercent: number;
}

interface SubmissionFile {
  id: string;
  fileUrl: string;
  filename: string;
  fileSize: number;
}

interface Comment {
  id: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  textAnswer: string;
  submissionUrl: string | null;
  uploadedFiles: SubmissionFile[];
  comments: Comment[];
  isLate: boolean;
  daysLate: number;
  submittedAt: string | null;
  updatedAt: string | null;
  rawScore: number | null;
  draftGrade: number | null;
  draftFeedback: string;
  publishedGrade: number | null;
  publishedFeedback: string;
  grade: number | null;
  feedback: string;
  version: number | null;
}

interface ReviewQueueResponse {
  content: Submission[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

const asString = (value: unknown) => (value == null ? '' : String(value));
const asNumberOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapSubmission = (raw: Record<string, unknown>): Submission => ({
  id: asString(raw.id),
  studentName: asString(raw.studentName ?? raw.student_name),
  studentEmail: asString(raw.studentEmail ?? raw.student_email),
  status: asString(raw.status).toUpperCase(),
  textAnswer: asString(raw.textAnswer ?? raw.text_answer),
  submissionUrl:
    raw.submissionUrl == null && raw.submission_url == null
      ? null
      : asString(raw.submissionUrl ?? raw.submission_url),
  uploadedFiles: Array.isArray(raw.uploadedFiles ?? raw.uploaded_files)
    ? ((raw.uploadedFiles ?? raw.uploaded_files) as Record<string, unknown>[]).map((file) => ({
        id: asString(file.id),
        fileUrl: asString(file.fileUrl ?? file.file_url),
        filename: asString(file.filename),
        fileSize: Number(file.fileSize ?? file.file_size ?? 0),
      }))
    : [],
  comments: Array.isArray(raw.comments)
    ? (raw.comments as Record<string, unknown>[]).map((comment) => ({
        id: asString(comment.id),
        authorName: asString(comment.authorName ?? comment.author_name),
        comment: asString(comment.comment),
        createdAt: asString(comment.createdAt ?? comment.created_at),
      }))
    : [],
  isLate: Boolean(raw.isLate ?? raw.is_late),
  daysLate: Number(raw.daysLate ?? raw.days_late ?? 0),
  submittedAt:
    raw.submittedAt == null && raw.submitted_at == null
      ? null
      : asString(raw.submittedAt ?? raw.submitted_at),
  updatedAt:
    raw.updatedAt == null && raw.updated_at == null
      ? null
      : asString(raw.updatedAt ?? raw.updated_at),
  rawScore: asNumberOrNull(raw.rawScore ?? raw.raw_score),
  draftGrade: asNumberOrNull(raw.draftGrade ?? raw.draft_grade),
  draftFeedback: asString(raw.draftFeedback ?? raw.draft_feedback),
  publishedGrade: asNumberOrNull(raw.publishedGrade ?? raw.published_grade),
  publishedFeedback: asString(raw.publishedFeedback ?? raw.published_feedback),
  grade: asNumberOrNull(raw.grade),
  feedback: asString(raw.feedback),
  version: asNumberOrNull(raw.version ?? raw.entity_version),
});

const mapQueueResponse = (raw: Record<string, unknown>): ReviewQueueResponse => ({
  content: Array.isArray(raw.content)
    ? (raw.content as Record<string, unknown>[]).map(mapSubmission)
    : [],
  pageNumber: Number(raw.pageNumber ?? 0),
  pageSize: Number(raw.pageSize ?? 25),
  totalElements: Number(raw.totalElements ?? 0),
  totalPages: Number(raw.totalPages ?? 0),
});

const statusLabel = (status: string) => {
  if (status === 'IN_REVIEW' || status === 'SUBMITTED') return 'Needs review';
  if (status === 'GRADED_DRAFT') return 'Draft graded';
  if (status === 'GRADED_PUBLISHED') return 'Published';
  return status;
};

const statusToApi = (statusFilter: string) => {
  if (statusFilter === 'all') return undefined;
  if (statusFilter === 'needs_review') return 'IN_REVIEW';
  if (statusFilter === 'draft') return 'GRADED_DRAFT';
  if (statusFilter === 'published') return 'GRADED_PUBLISHED';
  return undefined;
};

export const SpeedGrader: React.FC = () => {
  const { assignmentId: routeAssignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const assignmentId = routeAssignmentId || searchParams.get('assignmentId') || undefined;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [queue, setQueue] = useState<ReviewQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('needs_review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    () => searchParams.get('submission')
  );
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [rawScore, setRawScore] = useState('');
  const [finalScore, setFinalScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const initialRef = useRef({ rawScore: '', finalScore: '', feedback: '' });

  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const currentSubmission = useMemo(() => {
    if (!queue?.content || queue.content.length === 0) return null;
    if (selectedSubmissionId) {
      return queue.content.find((item) => item.id === selectedSubmissionId) || null;
    }
    return queue.content[0] || null;
  }, [queue, selectedSubmissionId]);

  const hasFormChanges =
    rawScore !== initialRef.current.rawScore
    || finalScore !== initialRef.current.finalScore
    || feedback !== initialRef.current.feedback;

  const hydrateForm = useCallback((submission: Submission | null) => {
    if (!submission) {
      setRawScore('');
      setFinalScore('');
      setFeedback('');
      initialRef.current = { rawScore: '', finalScore: '', feedback: '' };
      return;
    }

    const raw = submission.rawScore ?? submission.draftGrade ?? submission.publishedGrade ?? submission.grade;
    const final = submission.draftGrade ?? submission.publishedGrade ?? submission.grade;
    const fb = submission.draftFeedback || submission.publishedFeedback || submission.feedback || '';

    const next = {
      rawScore: raw == null ? '' : String(raw),
      finalScore: final == null ? '' : String(final),
      feedback: fb,
    };

    setRawScore(next.rawScore);
    setFinalScore(next.finalScore);
    setFeedback(next.feedback);
    initialRef.current = next;
  }, []);

  const fetchAssignment = useCallback(async () => {
    if (!assignmentId) return;
    const response = await apiClient.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`);
    setAssignment({
      id: asString(response.data.id),
      title: asString(response.data.title),
      maxPoints: Number(response.data.maxPoints ?? response.data.max_points ?? 100),
      latePenaltyPercent: Number(response.data.latePenaltyPercent ?? response.data.late_penalty_percent ?? 0),
    });
  }, [assignmentId]);

  const fetchQueue = useCallback(async () => {
    if (!assignmentId) return;

    setQueueLoading(true);
    setError(null);

    try {
      const response = await submissionsApi.getReviewQueue(assignmentId, {
        status: statusToApi(statusFilter),
        search: search.trim() || undefined,
        page,
        size: 25,
        sort: 'needs_review',
      });

      const payload = mapQueueResponse(response.data as Record<string, unknown>);
      setQueue(payload);

      setSelectedSubmissionId((prev) => {
        if (prev && payload.content.some((item) => item.id === prev)) {
          return prev;
        }
        return payload.content[0]?.id || null;
      });
    } catch (err) {
      const maybe = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybe.response?.data?.message || maybe.message || 'Failed to load review queue');
    } finally {
      setQueueLoading(false);
      setLoading(false);
    }
  }, [assignmentId, page, search, statusFilter]);

  useEffect(() => {
    void fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    hydrateForm(currentSubmission);
    setComment('');
    setConflictError(null);
  }, [currentSubmission, hydrateForm]);

  useEffect(() => {
    if (!assignmentId || !selectedSubmissionId) {
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('assignmentId', assignmentId);
      next.set('submission', selectedSubmissionId);
      return next;
    }, { replace: true });
  }, [assignmentId, selectedSubmissionId, setSearchParams]);

  useEffect(() => {
    if (!currentSubmission || !hasFormChanges || savingDraft || publishing) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSaveDraft(true);
    }, 1500);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubmission?.id, rawScore, finalScore, feedback, hasFormChanges]);

  const mergeSubmissionIntoQueue = (updated: Submission) => {
    setQueue((prev) => {
      if (!prev) return prev;
      const nextContent = prev.content.map((item) => (item.id === updated.id ? updated : item));
      return { ...prev, content: nextContent };
    });
    setSelectedSubmissionId(updated.id);
    hydrateForm(updated);
  };

  const parseAxiosError = (err: unknown) => {
    const maybe = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const status = maybe.response?.status;
    const message = maybe.response?.data?.message || maybe.message || 'Request failed';
    return { status, message };
  };

  const handleSaveDraft = async (silent = false) => {
    if (!currentSubmission) return;

    if (!silent) {
      setSavingDraft(true);
    }

    setError(null);
    setConflictError(null);

    try {
      const response = await submissionsApi.saveGradeDraft(currentSubmission.id, {
        rawScore: rawScore === '' ? undefined : Number(rawScore),
        finalScore: finalScore === '' ? undefined : Number(finalScore),
        feedback,
        overridePenalty: true,
        version: currentSubmission.version,
      });

      const updated = mapSubmission(response.data as Record<string, unknown>);
      mergeSubmissionIntoQueue(updated);
    } catch (err) {
      const parsed = parseAxiosError(err);
      if (parsed.status === 409) {
        setConflictError(parsed.message || 'Submission changed by another reviewer. Reload queue.');
      } else if (!silent) {
        setError(parsed.message);
      }
    } finally {
      if (!silent) {
        setSavingDraft(false);
      }
    }
  };

  const selectNextSubmission = () => {
    if (!queue || !currentSubmission) return;
    const currentIndex = queue.content.findIndex((item) => item.id === currentSubmission.id);
    if (currentIndex >= 0 && currentIndex < queue.content.length - 1) {
      setSelectedSubmissionId(queue.content[currentIndex + 1].id);
    }
  };

  const handlePublish = async (moveNext = false) => {
    if (!currentSubmission) return;

    setPublishing(true);
    setError(null);
    setConflictError(null);

    try {
      const response = await submissionsApi.publishGrade(currentSubmission.id, {
        finalScore: finalScore === '' ? undefined : Number(finalScore),
        feedback,
        version: currentSubmission.version,
      });
      const updated = mapSubmission(response.data as Record<string, unknown>);
      mergeSubmissionIntoQueue(updated);
      if (moveNext) {
        selectNextSubmission();
      }
    } catch (err) {
      const parsed = parseAxiosError(err);
      if (parsed.status === 409) {
        setConflictError(parsed.message || 'Submission changed by another reviewer. Reload queue.');
      } else {
        setError(parsed.message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentSubmission || !comment.trim()) return;

    try {
      await apiClient.post(`/submissions/${currentSubmission.id}/comments`, { comment });
      setComment('');
      await fetchQueue();
    } catch (err) {
      const parsed = parseAxiosError(err);
      setError(parsed.message);
    }
  };

  const selectedRowsList = Array.from(selectedRows);

  const handleBulkPublish = async () => {
    if (selectedRowsList.length === 0 || !queue) return;

    const summary = `Publish grades for ${selectedRowsList.length} selected submissions?`;
    if (!window.confirm(summary)) {
      return;
    }

    setPublishing(true);
    try {
      const items = selectedRowsList.map((id) => {
        const found = queue.content.find((entry) => entry.id === id);
        return { submissionId: id, version: found?.version };
      });

      const response = await submissionsApi.publishBulk(items);
      const result = response.data as {
        published?: number;
        total?: number;
        results?: Array<{ status?: string; message?: string }>;
      };

      const failed = (result.results || []).filter((item) => item.status && item.status !== 'published');
      setSelectedRows(new Set());

      if (failed.length > 0) {
        setError(`Published ${result.published || 0}/${result.total || items.length}. Some items failed.`);
      }

      await fetchQueue();
    } catch (err) {
      const parsed = parseAxiosError(err);
      setError(parsed.message);
    } finally {
      setPublishing(false);
    }
  };

  const toggleRow = (submissionId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (!assignmentId || !assignment) {
    return (
      <div className="p-8">
        <p style={{ color: 'var(--text-muted)' }}>Assignment not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-[1500px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {assignment.title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Reviewer workspace · {queue?.totalElements || 0} submissions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(0);
                setStatusFilter(event.target.value);
              }}
              className="input"
            >
              <option value="needs_review">Needs review</option>
              <option value="draft">Draft graded</option>
              <option value="published">Published</option>
              <option value="all">All</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input"
              placeholder="Search student"
            />
            <Button variant="secondary" onClick={() => { setPage(0); void fetchQueue(); }}>
              Search
            </Button>
            <Button variant="secondary" onClick={() => void fetchQueue()}>
              Reload
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--fn-error)' }}>
            {error}
          </div>
        )}

        {conflictError && (
          <div className="p-3 rounded flex items-center justify-between gap-2" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--fn-warning)' }}>
            <span>{conflictError}</span>
            <Button variant="secondary" size="sm" onClick={() => void fetchQueue()}>Reload queue</Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="xl:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Submission Review
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkPublish}
                  disabled={selectedRowsList.length === 0 || publishing}
                >
                  Publish selected ({selectedRowsList.length})
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {queueLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading queue...</p>
              ) : !queue || queue.content.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No submissions in this queue.</p>
              ) : (
                <div className="space-y-2">
                  {queue.content.map((item) => {
                    const isSelected = item.id === currentSubmission?.id;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded border cursor-pointer"
                        style={{
                          borderColor: isSelected ? 'var(--border-strong)' : 'var(--border-subtle)',
                          background: isSelected ? 'var(--bg-active)' : 'var(--bg-elevated)',
                        }}
                        onClick={() => {
                          setSelectedSubmissionId(item.id);
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set('submission', item.id);
                            next.set('assignmentId', assignmentId);
                            return next;
                          }, { replace: true });
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.studentName}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.studentEmail}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {statusLabel(item.status)}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(item.id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleRow(item.id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </div>
                        {item.submittedAt && (
                          <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
                            Submitted {new Date(item.submittedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                      disabled={page <= 0}
                    >
                      Previous
                    </Button>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Page {(queue.pageNumber || 0) + 1} / {Math.max(queue.totalPages || 0, 1)}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((prev) => prev + 1)}
                      disabled={queue.totalPages > 0 ? page >= queue.totalPages - 1 : true}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="xl:col-span-5 space-y-4">
            {!currentSubmission ? (
              <Card>
                <CardBody>
                  <p style={{ color: 'var(--text-muted)' }}>Select a submission to review.</p>
                </CardBody>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {currentSubmission.studentName}
                      </h2>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {statusLabel(currentSubmission.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {currentSubmission.studentEmail}
                    </p>
                    {currentSubmission.submittedAt && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Submitted at {new Date(currentSubmission.submittedAt).toLocaleString()}
                      </p>
                    )}
                    {currentSubmission.isLate && (
                      <p className="text-sm mt-2" style={{ color: 'var(--fn-error)' }}>
                        Late by {currentSubmission.daysLate} day(s)
                      </p>
                    )}
                  </CardBody>
                </Card>

                {currentSubmission.textAnswer && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Submission text
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <RichContentRenderer
                        content={currentSubmission.textAnswer}
                        className="whitespace-pre-wrap"
                      />
                    </CardBody>
                  </Card>
                )}

                {currentSubmission.submissionUrl && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Submission URL
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <a href={currentSubmission.submissionUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                        {currentSubmission.submissionUrl}
                      </a>
                    </CardBody>
                  </Card>
                )}

                {currentSubmission.uploadedFiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Uploaded files
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2">
                        {currentSubmission.uploadedFiles.map((file) => (
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                          >
                            {file.filename}
                          </a>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Comments
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {currentSubmission.comments.map((entry) => (
                        <div key={entry.id} className="p-2 rounded" style={{ background: 'var(--bg-elevated)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.authorName}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.comment}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(entry.createdAt).toLocaleString()}</p>
                        </div>
                      ))}

                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={3}
                        className="input w-full"
                        placeholder="Add a comment"
                      />
                      <Button variant="secondary" onClick={handleAddComment} disabled={!comment.trim()}>
                        Add comment
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          <Card className="xl:col-span-3 h-fit">
            <CardHeader>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Grading
              </h2>
            </CardHeader>
            <CardBody>
              {!currentSubmission ? (
                <p style={{ color: 'var(--text-muted)' }}>Select a submission to grade.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="label block mb-1">Raw score</label>
                    <input
                      className="input w-full"
                      type="number"
                      min={0}
                      max={assignment.maxPoints}
                      step="0.01"
                      value={rawScore}
                      onChange={(event) => setRawScore(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label block mb-1">Final score</label>
                    <input
                      className="input w-full"
                      type="number"
                      min={0}
                      max={assignment.maxPoints}
                      step="0.01"
                      value={finalScore}
                      onChange={(event) => setFinalScore(event.target.value)}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      / {assignment.maxPoints}
                    </p>
                    {currentSubmission.isLate && assignment.latePenaltyPercent > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--fn-warning)' }}>
                        Suggested late penalty: {assignment.latePenaltyPercent}% per day (override allowed).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label block mb-1">Feedback</label>
                    <textarea
                      className="input w-full"
                      rows={8}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Private until published"
                    />
                  </div>

                  {/* AI Grading Assistant */}
                  {assignmentId && currentSubmission && (
                    <GradingSuggestionPanel
                      assignmentId={assignmentId}
                      submissionId={currentSubmission.id}
                      onAccept={(grade, fb) => {
                        setFinalScore(String(grade));
                        setFeedback(fb);
                      }}
                    />
                  )}

                  {/* AI Plagiarism Check */}
                  {currentSubmission && (
                    <PlagiarismCheckPanel submissionId={currentSubmission.id} />
                  )}

                  <div className="space-y-2">
                    <Button onClick={() => void handleSaveDraft(false)} disabled={savingDraft || publishing || !hasFormChanges} className="w-full" variant="secondary">
                      {savingDraft ? 'Saving draft...' : 'Save Draft'}
                    </Button>
                    <Button onClick={() => void handlePublish(false)} disabled={publishing || finalScore === ''} className="w-full">
                      {publishing ? 'Publishing...' : 'Publish'}
                    </Button>
                    <Button onClick={() => void handlePublish(true)} disabled={publishing || finalScore === ''} className="w-full" variant="secondary">
                      Publish & Next
                    </Button>
                  </div>

                  {currentSubmission.publishedGrade != null && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last published</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {currentSubmission.publishedGrade} / {assignment.maxPoints}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpeedGrader;
