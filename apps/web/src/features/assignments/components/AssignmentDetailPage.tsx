'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCanonicalAssignment,
  useSubmitAssignment,
  useEditSubmission,
  useWithdrawSubmission,
} from '../hooks/useAssignmentQueries';
import { useStartQuizAttempt } from '@/features/quiz-attempts/hooks/useQuizAttemptQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import { Loading } from '@/components/Loading';
import type {
  FormAssignmentSettings,
  VplAssignmentSettings,
  FileAssignmentSettings,
  SubmissionFileItem,
  SubmissionRequest,
} from '../api/canonical.types';

interface AssignmentDetailPageProps {
  assignmentId: string;
}

export function AssignmentDetailPage({ assignmentId }: AssignmentDetailPageProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: teachingCourses } = useTeachingCourses();
  const { data: assignment, isLoading, error, refetch } = useCanonicalAssignment(assignmentId);

  const startQuizAttempt = useStartQuizAttempt();
  const submitAssignment = useSubmitAssignment();
  const editSubmission = useEditSubmission();
  const withdrawSubmission = useWithdrawSubmission();

  // Submission inputs state
  const [rteText, setRteText] = useState('');
  const [vplCode, setVplCode] = useState('');
  const [fileList, setFileList] = useState<SubmissionFileItem[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});

  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (isLoading) {
    return <Loading label="Loading assignment details..." />;
  }

  if (error || !assignment) {
    return (
      <div className="rounded-lg border p-6 text-[var(--text-primary)]" style={{ borderColor: 'var(--fn-error)', background: 'var(--bg-surface)' }}>
        <h2 className="text-lg font-semibold">Error Loading Assignment</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          This assignment could not be retrieved. It may have been archived or you might not have access to this course.
        </p>
      </div>
    );
  }

  const isStaff =
    currentUser?.role === 'ADMIN' ||
    teachingCourses?.some((c) => c.id === assignment.courseId);

  const { studentState, settings, type: assignmentType } = assignment;

  const handleStartQuiz = async () => {
    try {
      setStatusMessage(null);
      const res = await startQuizAttempt.mutateAsync(assignmentId);
      setStatusMessage({ type: 'success', text: 'Quiz attempt started successfully!' });
      // Redirect to quiz taking view
      router.push(`/quiz/${res.id}`);
    } catch (err) {
      const error = err as { message?: string };
      setStatusMessage({
        type: 'error',
        text: error.message || 'Failed to start quiz attempt. Please try again.',
      });
    }
  };

  const handleAddFile = () => {
    if (!newFileName.trim()) return;
    const item: SubmissionFileItem = {
      fileName: newFileName.trim(),
      fileUrl: newFileUrl.trim() || 'https://example.com/mock-upload/' + encodeURIComponent(newFileName.trim()),
    };
    setFileList((prev) => [...prev, item]);
    setNewFileName('');
    setNewFileUrl('');
  };

  const handleRemoveFile = (index: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const buildSubmissionRequest = (): SubmissionRequest => {
    switch (assignmentType) {
      case 'rte_submission':
        return { text: rteText };
      case 'file_submission':
        return { files: fileList };
      case 'form':
        return { answers: formAnswers };
      case 'vpl':
        return { code: vplCode, programmingLanguage: (settings as VplAssignmentSettings)?.language || 'javascript' };
      default:
        return { text: rteText };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusMessage(null);
      const request = buildSubmissionRequest();
      
      if (isEditing && studentState?.submissionId) {
        await editSubmission.mutateAsync({
          submissionId: studentState.submissionId,
          request,
        });
        setStatusMessage({ type: 'success', text: 'Submission updated successfully!' });
        setIsEditing(false);
      } else {
        await submitAssignment.mutateAsync({
          assignmentId,
          type: assignmentType,
          request,
        });
        setStatusMessage({ type: 'success', text: 'Assignment submitted successfully!' });
      }
      
      void refetch();
    } catch (err) {
      const error = err as { message?: string };
      setStatusMessage({
        type: 'error',
        text: error.message || 'Failed to submit. Please check your inputs.',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!studentState?.submissionId) return;
    if (!confirm('Are you sure you want to withdraw your submission? This will delete your current draft/submission.')) {
      return;
    }

    try {
      setStatusMessage(null);
      await withdrawSubmission.mutateAsync(studentState.submissionId);
      setStatusMessage({ type: 'success', text: 'Submission withdrawn successfully.' });
      setRteText('');
      setVplCode('');
      setFileList([]);
      setFormAnswers({});
      setIsEditing(false);
      void refetch();
    } catch (err) {
      const error = err as { message?: string };
      setStatusMessage({
        type: 'error',
        text: error.message || 'Failed to withdraw submission. Please try again.',
      });
    }
  };

  const handleEnterEditMode = () => {
    setIsEditing(true);
    // Pre-populate input fields if we are editing an existing state
    setStatusMessage(null);
  };

  const renderSubmissionForm = () => {
    switch (assignmentType) {
      case 'rte_submission':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Response Text Input (Rich Text simulated)
            </label>
            <textarea
              className="input min-h-[180px]"
              placeholder="Type your submission response here..."
              value={rteText}
              onChange={(e) => setRteText(e.target.value)}
              required
            />
          </div>
        );

      case 'file_submission': {
        const fileSettings = settings as FileAssignmentSettings;
        return (
          <div className="space-y-5">
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                File Submission Settings
              </h4>
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                <li>• Max Files: {fileSettings?.maxFiles ?? 'Unlimited'}</li>
                <li>• Max File Size: {fileSettings?.maxFileSizeMb ?? 10} MB</li>
                {fileSettings?.allowedFileTypes?.length && (
                  <li>• Allowed Formats: {fileSettings.allowedFileTypes.join(', ')}</li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Attach Mock Files to Submit
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm focus:outline-none"
                  placeholder="e.g. document.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm focus:outline-none"
                  placeholder="Mock URL (optional)"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddFile}
                  className="btn btn-primary"
                >
                  Add File
                </button>
              </div>

              {fileList.length > 0 && (
                <div className="mt-3 divide-y rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border-default)' }}>
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{file.fileName}</span>
                        <span className="ml-2 text-xs text-[var(--text-faint)]">({file.fileUrl})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-xs font-medium"
                        style={{ color: 'var(--fn-error)' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'form': {
        const formSettings = settings as FormAssignmentSettings;
        const fields = formSettings?.fields || [];
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Complete the form fields below:</h3>
            {fields.map((field, idx) => {
              const label = String(field.label || `Field ${idx + 1}`);
              const fieldId = String(field.fieldId || `field_${idx}`);
              const required = Boolean(field.required);
              return (
                <div key={fieldId} className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    {label} {required && <span style={{ color: 'var(--fn-error)' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    required={required}
                    className="input"
                    placeholder={String(field.placeholder || '')}
                    value={formAnswers[fieldId] || ''}
                    onChange={(e) =>
                      setFormAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))
                    }
                  />
                </div>
              );
            })}
            {!fields.length && <p className="text-sm text-[var(--text-muted)]">No form fields configured.</p>}
          </div>
        );
      }

      case 'vpl': {
        const vplSettings = settings as VplAssignmentSettings;
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Programming Code Submission ({vplSettings?.language || 'javascript'})
              </label>
              {vplSettings?.runtime && (
                <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                  Runtime: {vplSettings.runtime}
                </span>
              )}
            </div>
            <textarea
              className="input min-h-[220px] font-mono"
              placeholder={vplSettings?.templateCode || '// Enter your code execution here...'}
              value={vplCode}
              onChange={(e) => setVplCode(e.target.value)}
              required
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]';
      case 'DRAFT':
        return 'bg-[var(--bg-elevated)] text-[var(--fn-warning)] border border-[var(--border-default)]';
      case 'GRADED':
      case 'PUBLISHED':
        return 'bg-[var(--bg-elevated)] text-[var(--fn-success)] border border-[var(--border-default)]';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Status Banner Alerts */}
      {statusMessage && (
        <div
          className={`rounded-md p-4 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'border text-[var(--fn-success)] bg-[var(--bg-surface)] border-[var(--border-default)]'
              : 'border text-[var(--fn-error)] bg-[var(--bg-surface)] border-[var(--border-default)]'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Staff Administration Header Placement */}
      {isStaff && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-[var(--text-primary)]">
          <p className="text-sm font-medium">
            Course Staff Access
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Grading and submission review tools are available below.
          </p>
        </div>
      )}

      {/* Main Assignment Details Display */}
      <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {assignmentType.replace('_', ' ')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{assignment.title}</h1>
          </div>
          <div className="text-right">
            <span className="text-sm text-[var(--text-muted)]">Max Points</span>
            <p className="text-lg font-bold text-[var(--text-primary)]">{assignment.maxPoints}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
            Description & Instructions
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)] leading-relaxed">
            {assignment.instructions || assignment.description || 'No instruction manual has been provided.'}
          </p>
        </div>

        <div className="mt-6 grid gap-4 border-t border-[var(--border-subtle)] pt-5 text-sm md:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
              Submission Due Date
            </span>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">
              {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No due date scheduled'}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
              Submission Status
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                  studentState?.status || 'NOT_STARTED'
                )}`}
              >
                {studentState?.status?.replace('_', ' ') || 'NOT STARTED'}
              </span>
              {studentState?.grade && (
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Grade: {studentState.grade.points} / {assignment.maxPoints}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Submission Actions Hub */}
      {assignmentType === 'quiz' ? (
        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quiz Assessment</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This assignment is conducted via a quiz. You must start a timed attempt to answer.
          </p>
          
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {studentState?.canStartNewAttempt ? (
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={startQuizAttempt.isPending}
                className="btn btn-primary"
              >
                {startQuizAttempt.isPending ? 'Starting Timed Attempt...' : 'Start timed Quiz Attempt'}
              </button>
            ) : (
              <p className="text-sm font-medium text-[var(--text-muted)]">
                You have reached your quiz attempt limit or starting new attempts is restricted.
              </p>
            )}

            {studentState?.latestAttemptId && (
              <button
                type="button"
                onClick={() => router.push(`/quiz/${studentState.latestAttemptId}/review`)}
                className="rounded-md border border-[var(--border-strong)] px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
              >
                Review Latest Attempt
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Submission</h2>

          {/* Submission content history */}
          {studentState?.submittedAt && !isEditing && (
            <div className="mt-3 rounded-md bg-[var(--bg-base)] p-4 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Latest Submission Summary:</p>
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                <li>• Version Submitted: {studentState.attemptsUsed ?? 1}</li>
                <li>• Submitted Timestamp: {new Date(studentState.submittedAt).toLocaleString()}</li>
              </ul>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {studentState.canEdit && (
                  <button
                    type="button"
                    onClick={handleEnterEditMode}
                    className="btn btn-primary btn-sm"
                  >
                    Edit Submission
                  </button>
                )}
                {studentState.canDelete && (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawSubmission.isPending}
                    className="rounded-md px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'var(--fn-error)', color: 'var(--bg-base)' }}
                  >
                    {withdrawSubmission.isPending ? 'Withdrawing...' : 'Withdraw Submission'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submission Input Form Editor */}
          {((!studentState?.submittedAt && studentState?.canSubmit) || isEditing || studentState?.canResubmit) ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {renderSubmissionForm()}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitAssignment.isPending || editSubmission.isPending}
                  className="btn btn-primary"
                >
                  {submitAssignment.isPending || editSubmission.isPending
                    ? 'Submitting response...'
                    : isEditing
                    ? 'Save Submission Updates'
                    : 'Submit Assignment Response'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-md border border-[var(--border-default)] px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          ) : (
            studentState?.submittedAt ? null : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Submissions are not permitted for this assignment, or the availability window has closed.
              </p>
            )
          )}
        </section>
      )}
    </div>
  );
}
