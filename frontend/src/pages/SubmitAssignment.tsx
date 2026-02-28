import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { CourseLayout } from '../components/CourseLayout';
import { Layout } from '../components';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import {
  BlockEditor,
  createEmptyDocument,
  createParagraphDocument,
  extractDocumentText,
  hasMeaningfulDocumentContent,
  parseCanonicalDocument,
} from '../features/editor-core';
import { assignmentDocumentsApi, editorMediaApi, submissionDocumentsApi } from '../api/pages';
import { CanonicalDocument } from '../types';

interface Assignment {
  id: string;
  title: string;
  description: string;
  description_format: string;
  instructions: string;
  instructions_format: string;
  assignment_type: string;
  max_points: number;
  due_date: string | null;
  starter_code: string;
  programming_language: string;
  allowed_file_types: string[];
  max_file_size: number;
  max_files: number;
  resources: { name: string; url: string }[];
}

interface SubmissionFile {
  id: string;
  file_url: string;
  filename: string;
  file_size: number;
}

interface Submission {
  id: string;
  status: string;
  text_answer: string;
  textAnswer?: string;
  submission_url: string;
  submissionUrl?: string;
  files: SubmissionFile[];
  grade: number | null;
  feedback: string;
  submitted_at: string | null;
  submittedAt?: string | null;
}

const parseSubmission = (raw: Record<string, unknown>): Submission => ({
  id: String(raw.id ?? ''),
  status: String(raw.status ?? 'DRAFT'),
  text_answer: String(raw.textAnswer ?? raw.text_answer ?? ''),
  textAnswer: raw.textAnswer ? String(raw.textAnswer) : undefined,
  submission_url: String(raw.submissionUrl ?? raw.submission_url ?? ''),
  submissionUrl: raw.submissionUrl ? String(raw.submissionUrl) : undefined,
  files: Array.isArray(raw.files)
    ? raw.files.map((item) => ({
        id: String((item as Record<string, unknown>).id ?? ''),
        file_url: String((item as Record<string, unknown>).fileUrl ?? (item as Record<string, unknown>).file_url ?? ''),
        filename: String((item as Record<string, unknown>).filename ?? ''),
        file_size: Number((item as Record<string, unknown>).fileSize ?? (item as Record<string, unknown>).file_size ?? 0),
      }))
    : [],
  grade: raw.grade == null ? null : Number(raw.grade),
  feedback: String(raw.feedback ?? ''),
  submitted_at: raw.submittedAt ? String(raw.submittedAt) : (raw.submitted_at ? String(raw.submitted_at) : null),
  submittedAt: raw.submittedAt ? String(raw.submittedAt) : undefined,
});

const SubmitAssignment: React.FC = () => {
  const params = useParams<{ id?: string; assignmentId?: string; courseId?: string; moduleId?: string }>();
  const assignmentId = params.assignmentId || params.id;
  const courseId = params.courseId;
  const moduleId = params.moduleId;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  // Build base path for assignment navigation
  const assignmentBasePath = courseId && moduleId
    ? `/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`
    : `/assignments/${assignmentId}`;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [urlAnswer, setUrlAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [textDocument, setTextDocument] = useState<CanonicalDocument>(createEmptyDocument());
  const [documentLoading, setDocumentLoading] = useState(false);
  const [loadedDocumentSubmissionId, setLoadedDocumentSubmissionId] = useState<string | null>(null);

  // Track initial values for dirty checking
  const [initialValues, setInitialValues] = useState({
    textAnswer: '',
    codeAnswer: '',
    urlAnswer: '',
    textDocument: JSON.stringify(createEmptyDocument()),
  });

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (submitting) return false;
    const hasTextChanges = textAnswer !== initialValues.textAnswer;
    const hasCodeChanges = codeAnswer !== initialValues.codeAnswer;
    const hasUrlChanges = urlAnswer !== initialValues.urlAnswer;
    const hasFileChanges = files.length > 0;
    const hasDocumentChanges =
      assignment?.assignment_type === 'TEXT' &&
      JSON.stringify(textDocument) !== initialValues.textDocument;

    return hasTextChanges || hasCodeChanges || hasUrlChanges || hasFileChanges || Boolean(hasDocumentChanges);
  }, [
    textAnswer,
    codeAnswer,
    urlAnswer,
    files,
    initialValues,
    submitting,
    assignment?.assignment_type,
    textDocument,
  ]);

  // Unsaved changes warning
  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedChanges,
    message: t('assignment.unsavedWarning', 'You have unsaved changes to your submission. Are you sure you want to leave?'),
  });

  useEffect(() => {
    void fetchAssignment();
    void fetchOrCreateSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    if (!submission?.id || assignment?.assignment_type !== 'TEXT') {
      return;
    }

    if (loadedDocumentSubmissionId === submission.id) {
      return;
    }

    void initializeSubmissionDocument(submission.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.assignment_type, submission?.id, loadedDocumentSubmissionId]);

  const fetchAssignment = async () => {
    try {
      const response = await api.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`);
      const data = response.data;
      const mappedAssignment: Assignment = {
        id: String(data.id || ''),
        title: String(data.title || ''),
        description: String(data.description || ''),
        description_format: String(data.descriptionFormat || data.description_format || 'MARKDOWN'),
        instructions: String(data.instructions || ''),
        instructions_format: String(data.instructionsFormat || data.instructions_format || 'MARKDOWN'),
        assignment_type: String(data.assignmentType || data.assignment_type || 'FILE_UPLOAD'),
        max_points: Number(data.maxPoints || data.max_points || 0),
        due_date: (data.dueDate as string | null) || (data.due_date as string | null) || null,
        starter_code: String(data.starterCode || data.starter_code || ''),
        programming_language: String(data.programmingLanguage || data.programming_language || 'python'),
        allowed_file_types: (data.allowedFileTypes as string[]) || (data.allowed_file_types as string[]) || [],
        max_file_size: Number(data.maxFileSize || data.max_file_size || 10485760),
        max_files: Number(data.maxFiles || data.max_files || 5),
        resources: (data.resources as { name: string; url: string }[]) || [],
      };
      setAssignment(mappedAssignment);
      if (mappedAssignment.starter_code) {
        setCodeAnswer(mappedAssignment.starter_code);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrCreateSubmission = async () => {
    try {
      // Try to get existing submission
      const response = await api.get<{ results?: Record<string, unknown>[]; content?: Record<string, unknown>[] } | Record<string, unknown>[]>(
        `/submissions?assignmentId=${assignmentId}`
      );
      const fetchedSubmissions = Array.isArray(response.data)
        ? response.data
        : response.data.results || response.data.content || [];

      if (fetchedSubmissions.length > 0) {
        const existingSub = parseSubmission(fetchedSubmissions[0]);
        setSubmission(existingSub);

        // Load existing data
        if (existingSub.text_answer) {
          setTextAnswer(existingSub.text_answer);
          setCodeAnswer(existingSub.text_answer);
          setInitialValues((prev) => ({
            ...prev,
            textAnswer: existingSub.text_answer,
            codeAnswer: existingSub.text_answer,
          }));
        }
        if (existingSub.submission_url) {
          setUrlAnswer(existingSub.submission_url);
          setInitialValues((prev) => ({ ...prev, urlAnswer: existingSub.submission_url }));
        }
      } else {
        // Create new draft submission
        try {
          const createResponse = await api.post<Record<string, unknown>>('/submissions', {
            assignmentId,
            status: 'DRAFT',
          });
          setSubmission(parseSubmission(createResponse.data));
        } catch (createErr: unknown) {
          console.error('Error creating submission:', createErr);
          // If creation fails, try fetching again in case it was created by another request
          const retryResponse = await api.get<{ results?: Record<string, unknown>[]; content?: Record<string, unknown>[] } | Record<string, unknown>[]>(
            `/submissions?assignmentId=${assignmentId}`
          );
          const retrySubmissions = Array.isArray(retryResponse.data)
            ? retryResponse.data
            : retryResponse.data.results || retryResponse.data.content || [];
          if (retrySubmissions.length > 0) {
            setSubmission(parseSubmission(retrySubmissions[0]));
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching/creating submission:', err);
    }
  };

  const initializeSubmissionDocument = async (submissionId: string) => {
    if (!assignmentId) {
      return;
    }

    setDocumentLoading(true);

    try {
      const existingDocResponse = await submissionDocumentsApi.get(submissionId);
      let doc = parseCanonicalDocument(existingDocResponse.data.document);

      if (!hasMeaningfulDocumentContent(doc)) {
        try {
          await assignmentDocumentsApi.cloneTemplateToSubmission(assignmentId);
          const clonedDocResponse = await submissionDocumentsApi.get(submissionId);
          doc = parseCanonicalDocument(clonedDocResponse.data.document);
        } catch (cloneErr) {
          console.warn('Template clone skipped or unavailable', cloneErr);
        }
      }

      if (!hasMeaningfulDocumentContent(doc)) {
        const existingText = submission?.text_answer || submission?.textAnswer || '';
        if (existingText.trim()) {
          doc = createParagraphDocument(existingText);
        }
      }

      setTextDocument(doc);
      setInitialValues((prev) => ({ ...prev, textDocument: JSON.stringify(doc) }));
    } catch (err) {
      console.error('Failed to initialize submission document', err);
      const fallback = createEmptyDocument();
      setTextDocument(fallback);
      setInitialValues((prev) => ({ ...prev, textDocument: JSON.stringify(fallback) }));
    } finally {
      setLoadedDocumentSubmissionId(submissionId);
      setDocumentLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);

      // Validate file count
      if (assignment && selectedFiles.length > assignment.max_files) {
        setError(`Maximum ${assignment.max_files} files allowed`);
        return;
      }

      // Validate file size
      const maxSize = assignment?.max_file_size || 10485760;
      const oversizedFiles = selectedFiles.filter((f) => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        setError(`Files exceed maximum size of ${(maxSize / 1048576).toFixed(1)}MB`);
        return;
      }

      setFiles(selectedFiles);
      setError(null);
    }
  };

  const uploadFiles = async () => {
    if (!submission || files.length === 0) return true;

    try {
      for (let i = 0; i < files.length; i++) {
        const fileFormData = new FormData();
        fileFormData.append('file', files[i]);

        await api.post(`/submissions/${submission.id}/files`, fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: { total?: number; loaded: number }) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(((i + progress / 100) / files.length) * 100);
          },
        });
      }

      setUploadProgress(100);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'File upload failed');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    setSubmitting(true);
    setError(null);

    try {
      // Handle different submission types
      switch (assignment?.assignment_type) {
        case 'CODE':
          await api.post(`/submissions/${submission.id}/submit`, {
            type: 'CODE',
            code: codeAnswer,
            language: assignment.programming_language,
          });
          break;

        case 'TEXT': {
          if (!hasMeaningfulDocumentContent(textDocument)) {
            throw new Error('Text submission is empty');
          }

          await submissionDocumentsApi.upsert(submission.id, {
            document: textDocument,
            schemaVersion: 1,
          });

          const plainText = extractDocumentText(textDocument);
          await api.post(`/submissions/${submission.id}/submit`, {
            type: 'TEXT',
            text_answer: plainText || '[Submitted from block editor]',
          });

          setInitialValues((prev) => ({ ...prev, textDocument: JSON.stringify(textDocument) }));
          break;
        }

        case 'URL':
          await api.post(`/submissions/${submission.id}/submit`, {
            type: 'URL',
            url: urlAnswer,
          });
          break;

        case 'FILE_UPLOAD': {
          const filesUploaded = await uploadFiles();
          if (!filesUploaded) {
            setSubmitting(false);
            return;
          }
          await api.post(`/submissions/${submission.id}/submit`, {
            type: 'FILE_UPLOAD',
          });
          break;
        }

        default:
          await api.post(`/submissions/${submission.id}/submit`, {});
      }

      // Success - redirect to assignment page
      navigate(assignmentBasePath, {
        state: { message: t('submission.submitted_successfully') },
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(error.response?.data?.error || error.response?.data?.message || error.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditorMediaUpload = async (file: File) => {
    const response = await editorMediaApi.upload(file);
    return { url: response.data.url, contentType: response.data.contentType };
  };

  const renderSubmissionForm = () => {
    if (!assignment) return null;

    switch (assignment.assignment_type) {
      case 'CODE':
        return (
          <div className="space-y-4">
            <div>
              <label className="label mb-2">
                {t('submission.code_editor')}
              </label>
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                className="input w-full h-96 font-mono text-sm"
                placeholder="// Enter your code here..."
                required
              />
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              <p>{t('submission.language')}: <strong>{assignment.programming_language}</strong></p>
            </div>
          </div>
        );

      case 'TEXT':
        return (
          <div className="space-y-3">
            <label className="label mb-2 block">
              {t('submission.text_answer')}
            </label>
            {documentLoading ? (
              <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)' }}>
                {t('common.loading', 'Loading...')}
              </div>
            ) : (
              <BlockEditor
                value={textDocument}
                onChange={setTextDocument}
                mode="lite"
                placeholder={t('submission.enter_answer', 'Enter your answer')}
                onUploadMedia={handleEditorMediaUpload}
              />
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('submission.text_editor_help', 'Use / commands for blocks, Alt+Up/Down to move blocks, and toolbar actions for formatting.')}
            </p>
          </div>
        );

      case 'URL':
        return (
          <div>
            <label className="label mb-2">
              {t('submission.submission_url')}
            </label>
            <input
              type="url"
              value={urlAnswer}
              onChange={(e) => setUrlAnswer(e.target.value)}
              placeholder="https://..."
              className="input w-full"
              required
            />
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('submission.url_help')}
            </p>
          </div>
        );

      case 'FILE_UPLOAD':
        return (
          <div className="space-y-4">
            <div>
              <label className="label mb-2">
                {t('submission.upload_files')}
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept={assignment.allowed_file_types?.join(',') || '*'}
                className="block w-full text-sm"
                style={{ color: 'var(--text-muted)' }}
              />
              <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <p>{t('submission.max_files')}: {assignment.max_files}</p>
                <p>{t('submission.max_size')}: {(assignment.max_file_size / 1048576).toFixed(1)}MB</p>
                {assignment.allowed_file_types && assignment.allowed_file_types.length > 0 && (
                  <p>{t('submission.allowed_types')}: {assignment.allowed_file_types.join(', ')}</p>
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className="rounded-md p-4" style={{ background: 'var(--bg-elevated)' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('submission.selected_files')}:
                </h4>
                <ul className="space-y-1">
                  {files.map((file, idx) => (
                    <li key={idx} className="text-sm flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs ml-2">({(file.size / 1024).toFixed(1)}KB)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full rounded-full h-2.5" style={{ background: 'var(--bg-overlay)' }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: 'var(--text-primary)' }}
                ></div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            {t('submission.type_not_supported')}
          </div>
        );
    }
  };

  const renderContent = (content: string, format: string) => {
    if (format === 'RICH') {
      const document = parseCanonicalDocument(content);
      return <BlockEditor value={document} onChange={() => undefined} readOnly mode="full" />;
    }

    if (format === 'MARKDOWN') {
      return <div className="max-w-none whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{content}</div>;
    }

    return <p className="whitespace-pre-wrap">{content}</p>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <p style={{ color: 'var(--fn-error)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!assignment) return null;

  // Check if already submitted
  const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED';

  const Wrapper = courseId
    ? ({ children }: { children: React.ReactNode }) => <CourseLayout courseId={courseId}>{children}</CourseLayout>
    : Layout;

  return (
    <Wrapper>
      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        title={t('assignment.unsavedChangesTitle', 'Unsaved Submission')}
        message={t('assignment.unsavedWarning', 'You have unsaved changes to your submission. Are you sure you want to leave?')}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(assignmentBasePath)}
            className="mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('common.back_to_course')}
          </button>

          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {isSubmitted ? t('submission.view_submission') : t('submission.submit_assignment')}
          </h1>
          <h2 className="text-xl mt-2" style={{ color: 'var(--text-muted)' }}>
            {assignment.title}
          </h2>
          <div className="flex items-center gap-4 mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('assignment.max_points')}: {assignment.max_points}
            </span>
            {assignment.due_date && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('assignment.due')}: {new Date(assignment.due_date).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Assignment Description */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {t('assignment.description')}
          </h3>
          <div style={{ color: 'var(--text-secondary)' }}>
            {renderContent(assignment.description, assignment.description_format)}
          </div>

          {assignment.instructions && (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>
                {t('assignment.instructions')}
              </h3>
              <div style={{ color: 'var(--text-secondary)' }}>
                {renderContent(assignment.instructions, assignment.instructions_format)}
              </div>
            </>
          )}

          {assignment.resources && assignment.resources.length > 0 && (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>
                {t('assignment.resources')}
              </h3>
              <ul className="space-y-2">
                {assignment.resources.map((resource: { name: string; url: string }, idx: number) => (
                  <li key={idx}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {resource.name || resource.url}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Submission Status */}
        {isSubmitted && submission && (
          <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: 'var(--fn-success)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium" style={{ color: 'var(--fn-success)' }}>
                {t('submission.submitted_successfully')}
              </p>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--fn-success)' }}>
              {t('submission.submitted_at')}: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
            </p>
            {submission.grade !== null && (
              <p className="text-sm mt-1" style={{ color: 'var(--fn-success)' }}>
                {t('submission.grade')}: {submission.grade} / {assignment.max_points}
              </p>
            )}
            {submission.feedback && (
              <div className="mt-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('submission.feedback')}:</p>
                <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{submission.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Submission Form */}
        {!isSubmitted && (
          <form onSubmit={handleSubmit} className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('submission.your_submission')}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <p style={{ color: 'var(--fn-error)' }}>{error}</p>
              </div>
            )}

            {renderSubmissionForm()}

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary flex-1 py-3 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t('submission.submitting') : t('submission.submit')}
              </button>
              <button
                type="button"
                onClick={() => navigate(assignmentBasePath)}
                className="btn px-6 py-3"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </Wrapper>
  );
};

export default SubmitAssignment;
