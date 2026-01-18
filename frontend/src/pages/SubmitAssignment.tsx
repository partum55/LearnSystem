import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';

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
  resources: any[];
}

interface Submission {
  id: string;
  status: string;
  text_answer: string;
  submission_url: string;
  files: any[];
  grade: number | null;
  feedback: string;
  submitted_at: string | null;
}

const SubmitAssignment: React.FC = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [urlAnswer, setUrlAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Track initial values for dirty checking
  const [initialValues, setInitialValues] = useState({ textAnswer: '', codeAnswer: '', urlAnswer: '' });

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (submitting) return false;
    const hasTextChanges = textAnswer !== initialValues.textAnswer;
    const hasCodeChanges = codeAnswer !== initialValues.codeAnswer;
    const hasUrlChanges = urlAnswer !== initialValues.urlAnswer;
    const hasFileChanges = files.length > 0;
    return hasTextChanges || hasCodeChanges || hasUrlChanges || hasFileChanges;
  }, [textAnswer, codeAnswer, urlAnswer, files, initialValues, submitting]);

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
    fetchAssignment();
    fetchOrCreateSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await api.get<Assignment>(`assessments/assignments/${assignmentId}/`);
      setAssignment(response.data);
      if (response.data.starter_code) {
        setCodeAnswer(response.data.starter_code);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrCreateSubmission = async () => {
    try {
      // Try to get existing submission
      const response = await api.get<{ results: Submission[] }>(`submissions/submissions/?assignment=${assignmentId}`);
      if (response.data.results && response.data.results.length > 0) {
        const existingSub = response.data.results[0];
        setSubmission(existingSub);
        
        // Load existing data
        if (existingSub.text_answer) {
          setTextAnswer(existingSub.text_answer);
          setCodeAnswer(existingSub.text_answer);
          setInitialValues(prev => ({
            ...prev,
            textAnswer: existingSub.text_answer,
            codeAnswer: existingSub.text_answer
          }));
        }
        if (existingSub.submission_url) {
          setUrlAnswer(existingSub.submission_url);
          setInitialValues(prev => ({ ...prev, urlAnswer: existingSub.submission_url }));
        }
      } else {
        // Create new draft submission
        try {
          const createResponse = await api.post<Submission>('submissions/submissions/', {
            assignment: assignmentId,
            status: 'DRAFT'
          });
          // Backend returns existing submission with 200 or new with 201
          setSubmission(createResponse.data);
        } catch (createErr: any) {
          console.error('Error creating submission:', createErr);
          // If creation fails, try fetching again in case it was created by another request
          const retryResponse = await api.get<{ results: Submission[] }>(`submissions/submissions/?assignment=${assignmentId}`);
          if (retryResponse.data.results && retryResponse.data.results.length > 0) {
            setSubmission(retryResponse.data.results[0]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching/creating submission:', err);
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
      const oversizedFiles = selectedFiles.filter(f => f.size > maxSize);
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
        
        await api.post(`submissions/submissions/${submission.id}/upload_file/`, fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: any) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(((i + progress / 100) / files.length) * 100);
          }
        });
      }
      
      setUploadProgress(100);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'File upload failed');
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
          await api.post(`submissions/submissions/${submission.id}/submit_code/`, {
            code: codeAnswer,
            language: assignment.programming_language
          });
          break;

        case 'TEXT':
          await api.post(`submissions/submissions/${submission.id}/submit_text/`, {
            text_answer: textAnswer
          });
          break;

        case 'URL':
          await api.post(`submissions/submissions/${submission.id}/submit_url/`, {
            url: urlAnswer
          });
          break;

        case 'FILE_UPLOAD':
          const filesUploaded = await uploadFiles();
          if (!filesUploaded) {
            setSubmitting(false);
            return;
          }
          await api.post(`submissions/submissions/${submission.id}/submit/`);
          break;

        default:
          await api.post(`submissions/submissions/${submission.id}/submit/`);
      }

      // Success - redirect to assignment page
      navigate(`/courses/${courseId}/assignments/${assignmentId}`, {
        state: { message: t('submission.submitted_successfully') }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSubmissionForm = () => {
    if (!assignment) return null;

    switch (assignment.assignment_type) {
      case 'CODE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('submission.code_editor')}
              </label>
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                placeholder="// Enter your code here..."
                required
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>{t('submission.language')}: <strong>{assignment.programming_language}</strong></p>
            </div>
          </div>
        );

      case 'TEXT':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('submission.text_answer')}
            </label>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={t('submission.enter_answer')}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        );

      case 'URL':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('submission.submission_url')}
            </label>
            <input
              type="url"
              value={urlAnswer}
              onChange={(e) => setUrlAnswer(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('submission.url_help')}
            </p>
          </div>
        );

      case 'FILE_UPLOAD':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('submission.upload_files')}
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept={assignment.allowed_file_types?.join(',') || '*'}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-200"
              />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>{t('submission.max_files')}: {assignment.max_files}</p>
                <p>{t('submission.max_size')}: {(assignment.max_file_size / 1048576).toFixed(1)}MB</p>
                {assignment.allowed_file_types && assignment.allowed_file_types.length > 0 && (
                  <p>{t('submission.allowed_types')}: {assignment.allowed_file_types.join(', ')}</p>
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('submission.selected_files')}:
                </h4>
                <ul className="space-y-1">
                  {files.map((file, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs ml-2">({(file.size / 1024).toFixed(1)}KB)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('submission.type_not_supported')}
          </div>
        );
    }
  };

  const renderContent = (content: string, format: string) => {
    if (format === 'MARKDOWN' || format === 'RICH') {
      // Simple rendering - in production use a markdown/rich text library
      return <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{content}</div>;
    }
    return <p className="whitespace-pre-wrap">{content}</p>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!assignment) return null;

  // Check if already submitted
  const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED';

  return (
    <>
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
          onClick={() => navigate(`/courses/${courseId}`)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('common.back_to_course')}
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isSubmitted ? t('submission.view_submission') : t('submission.submit_assignment')}
        </h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400 mt-2">
          {assignment.title}
        </h2>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('assignment.description')}
        </h3>
        <div className="text-gray-700 dark:text-gray-300">
          {renderContent(assignment.description, assignment.description_format)}
        </div>

        {assignment.instructions && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              {t('assignment.instructions')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300">
              {renderContent(assignment.instructions, assignment.instructions_format)}
            </div>
          </>
        )}

        {assignment.resources && assignment.resources.length > 0 && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              {t('assignment.resources')}
            </h3>
            <ul className="space-y-2">
              {assignment.resources.map((resource: any, idx: number) => (
                <li key={idx}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2"
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
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 dark:text-green-200 font-medium">
              {t('submission.submitted_successfully')}
            </p>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-2">
            {t('submission.submitted_at')}: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
          </p>
          {submission.grade !== null && (
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              {t('submission.grade')}: {submission.grade} / {assignment.max_points}
            </p>
          )}
          {submission.feedback && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('submission.feedback')}:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      {!isSubmitted && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('submission.your_submission')}
          </h3>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {renderSubmissionForm()}

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {submitting ? t('submission.submitting') : t('submission.submit')}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
      </div>
    </>
  );
};

export default SubmitAssignment;

