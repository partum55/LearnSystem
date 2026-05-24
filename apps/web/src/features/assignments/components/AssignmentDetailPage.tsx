'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { RichContentEditor } from '@/features/rich-content/components/RichContentEditor';
import { RichContentRenderer } from '@/features/rich-content/components/RichContentRenderer';
import type { RichContentDocument } from '@/features/rich-content/rich-content.types';
import type {
  VplAssignmentSettings,
  FileAssignmentSettings,
  SubmissionFileItem,
  SubmissionRequest,
  SeminarAttendanceOverviewDto,
} from '../api/canonical.types';
import { seminarAttendanceApi } from '../api/assignments.api';

interface AssignmentDetailPageProps {
  assignmentId: string;
}

type TabId = 'instructions' | 'answer' | 'history';

const parseDocument = (content: any): RichContentDocument => {
  if (!content) return { version: 1, blocks: [] };
  if (typeof content === 'object') return content as RichContentDocument;
  try {
    return JSON.parse(content) as RichContentDocument;
  } catch {
    // Wrap simple text in a paragraph block
    return {
      version: 1,
      blocks: [{ id: 'init', type: 'paragraph', data: { text: String(content) } }],
    };
  }
};

export function AssignmentDetailPage({ assignmentId }: AssignmentDetailPageProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { data: teachingCourses } = useTeachingCourses();
  const { data: assignment, isLoading, error, refetch } = useCanonicalAssignment(assignmentId);

  const startQuizAttempt = useStartQuizAttempt();
  const submitAssignment = useSubmitAssignment();
  const editSubmission = useEditSubmission();
  const withdrawSubmission = useWithdrawSubmission();

  // Active Workspace Tab state (for TEXT_SUBMISSION)
  const [activeTab, setActiveTab] = useState<TabId>('instructions');

  // Submission inputs state
  const [submissionValue, setSubmissionValue] = useState<RichContentDocument>({
    version: 1,
    blocks: [],
  });
  const [vplCode, setVplCode] = useState('');
  const [fileList, setFileList] = useState<SubmissionFileItem[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  // Submission Versions History
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { studentState, settings, type: assignmentType } = assignment || {};

  // Seminar Attendance state
  const [attendanceOverview, setAttendanceOverview] = useState<SeminarAttendanceOverviewDto | null>(null);
  const [sessionTimer, setSessionTimer] = useState<number | null>(null); // remaining seconds
  const [rawToken, setRawToken] = useState<string | null>(null);

  const fetchAttendance = async () => {
    if (assignmentType !== 'SEMINAR') return;
    try {
      const res = await seminarAttendanceApi.getOverview(assignmentId);
      setAttendanceOverview(res);
    } catch (err) {
      console.error('Failed to fetch attendance overview', err);
    }
  };

  useEffect(() => {
    if (assignmentType === 'SEMINAR') {
      fetchAttendance();
      const interval = setInterval(fetchAttendance, 5000); // Polling every 5 seconds for live check-in updates
      return () => clearInterval(interval);
    }
  }, [assignmentId, assignmentType]);

  useEffect(() => {
    if (!attendanceOverview?.activeSession) {
      setSessionTimer(null);
      return;
    }
    const expiresAt = new Date(attendanceOverview.activeSession.expiresAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setSessionTimer(diff);
      if (diff === 0) {
        void fetchAttendance();
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [attendanceOverview?.activeSession]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateSession = async () => {
    try {
      setStatusMessage(null);
      const res = await seminarAttendanceApi.createSession(assignmentId);
      setRawToken(res.rawToken || null);
      setStatusMessage({ type: 'success', text: 'Seminar check-in session started successfully!' });
      void fetchAttendance();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to start check-in';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleCloseSession = async () => {
    if (!attendanceOverview?.activeSession) return;
    try {
      setStatusMessage(null);
      await seminarAttendanceApi.closeSession(attendanceOverview.activeSession.id);
      setRawToken(null);
      setStatusMessage({ type: 'success', text: 'Seminar check-in session closed.' });
      void fetchAttendance();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to close session';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  // Fetch current submission text answer and version history directly from Supabase
  useEffect(() => {
    if (studentState?.submissionId && assignment?.type === 'TEXT_SUBMISSION') {
      const subId = studentState.submissionId;
      const fetchSubmissionData = async () => {
        const supabase = getSupabaseBrowserClient();
        
        // 1. Fetch current answer
        const { data } = await supabase
          .from('assignment_submissions')
          .select('content_json')
          .eq('id', subId)
          .single();
        
        const subData = data as any;
        if (subData?.content_json) {
          setSubmissionValue(parseDocument(subData.content_json));
        }

        // 2. Fetch version attempts
        const { data: verDataList } = await supabase
          .from('submission_versions')
          .select('*')
          .eq('submission_id', subId)
          .order('version_number', { ascending: false });

        const verData = verDataList as any[] | null;
        if (verData) {
          setVersions(verData);
          if (verData.length > 0) {
            setSelectedVersionId(verData[0].id);
          }
        }
      };
      
      fetchSubmissionData();
    }
  }, [studentState?.submissionId, assignmentType]);

  const selectedVersion = useMemo(() => {
    if (!versions || !selectedVersionId) return null;
    return versions.find((v) => v.id === selectedVersionId) || null;
  }, [versions, selectedVersionId]);

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

  const typeStr = (assignmentType || 'FILE_SUBMISSION') as string;

  const isStaff =
    currentUser?.role === 'ADMIN' ||
    teachingCourses?.some((c) => c.id === assignment.courseId);

  const handleStartQuiz = async () => {
    try {
      setStatusMessage(null);
      const res = await startQuizAttempt.mutateAsync(assignmentId);
      setStatusMessage({ type: 'success', text: 'Quiz attempt started successfully!' });
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
    switch (typeStr) {
      case 'TEXT_SUBMISSION':
        return { text: JSON.stringify(submissionValue) };
      case 'FILE_SUBMISSION':
        return { files: fileList };
      case 'VPL':
        return { code: vplCode, programmingLanguage: (settings as VplAssignmentSettings)?.language || 'javascript' };
      default:
        return { text: JSON.stringify(submissionValue) };
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
          type: typeStr,
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
      setSubmissionValue({ version: 1, blocks: [] });
      setVplCode('');
      setFileList([]);
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
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Dynamic Status Alert Banner */}
      {statusMessage && (
        <div
          className={`rounded-xl p-4 text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'border text-[var(--fn-success)] bg-[var(--bg-surface)] border-[var(--border-default)] animate-slide-in'
              : 'border text-[var(--fn-error)] bg-[var(--bg-surface)] border-[var(--border-default)] animate-slide-in'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Staff Administration Banner */}
      {isStaff && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-[var(--text-primary)] shadow-3xs">
          <p className="text-xs font-extrabold uppercase tracking-wide">Course Staff Access</p>
          <p className="mt-1 text-3xs text-[var(--text-muted)] leading-relaxed">
            Grading triggers and full student submission histories are managed within the Dedicated Course Gradebook page.
          </p>
        </div>
      )}

      {/* Main Assignment Details Panel */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
              {typeStr.replace('_', ' ')}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-[var(--text-primary)] tracking-tight">{assignment.title}</h1>
          </div>
          <div className="text-right">
            <span className="text-3xs uppercase font-extrabold text-[var(--text-muted)] block">Max Score</span>
            <p className="text-lg font-extrabold text-[var(--text-primary)]">{assignment.maxPoints} pts</p>
          </div>
        </div>

        {/* Instructions preview (for non-RTE view; RTE submission has its own tab) */}
        {assignmentType !== 'TEXT_SUBMISSION' && (
          <div className="prose max-w-none text-xs">
            <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)] block mb-1">Instructions</span>
            <RichContentRenderer document={assignment.instructionsJson as any} />
          </div>
        )}

        <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-4 text-xs md:grid-cols-2">
          <div>
            <span className="text-3xs uppercase font-extrabold tracking-widest text-[var(--text-faint)]">Due Date</span>
            <p className="mt-1 font-bold text-[var(--text-primary)]">
              {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No due date scheduled'}
            </p>
          </div>
          <div>
            <span className="text-3xs uppercase tracking-widest font-extrabold text-[var(--text-faint)]">Your Status</span>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wide ${getStatusBadgeClass(studentState?.status || 'NOT_STARTED')}`}>
                {studentState?.status?.replace('_', ' ') || 'NOT STARTED'}
              </span>
              {studentState?.grade && (
                <span className="text-2xs font-bold text-[var(--text-secondary)]">
                  Grade: {studentState.grade.points} / {assignment.maxPoints}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Submission Actions workspace */}

      {/* FORM: IN DEVELOPMENT */}
      {assignmentType === 'FORM' && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center space-y-4 shadow-xs">
          <div className="inline-flex rounded-full bg-[var(--bg-elevated)] p-3 text-[var(--fn-warning)] border border-[var(--border-default)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Form Submissions In Development</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              FORM assignments and full-featured Form Builders are currently under active development. You cannot submit responses at this time.
            </p>
          </div>
        </section>
      )}

      {/* QUIZ */}
      {assignmentType === 'QUIZ' && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">Quiz Assessment</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            This assignment is conducted via a quiz. You must start a timed attempt to answer.
          </p>
          
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {studentState?.canStartNewAttempt ? (
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={startQuizAttempt.isPending}
                className="btn btn-primary text-xs px-5 py-2 font-bold cursor-pointer"
              >
                {startQuizAttempt.isPending ? 'Starting Timed Attempt...' : 'Start Quiz Attempt'}
              </button>
            ) : (
              <p className="text-xs font-bold text-[var(--text-muted)]">
                You have reached your quiz attempt limit or starting new attempts is restricted.
              </p>
            )}

            {studentState?.latestAttemptId && (
              <button
                type="button"
                onClick={() => router.push(`/quiz/${studentState.latestAttemptId}/review`)}
                className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer"
              >
                Review Latest Attempt
              </button>
            )}
          </div>
        </section>
      )}

      {/* TEXT / RTE SUBMISSION (WITH DETAILED 3-TAB WORKSPACE) */}
      {assignmentType === 'TEXT_SUBMISSION' && (
        <section className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-6 shadow-xs space-y-6">
          {/* Tabs Navigation */}
          <nav className="flex gap-2 border-b border-[var(--border-default)] pb-0">
            {(['instructions', 'answer', 'history'] as TabId[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    isActive 
                      ? 'border-[var(--text-primary)] text-[var(--text-primary)]' 
                      : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab === 'instructions' ? 'Instructions' : tab === 'answer' ? 'Your Answer' : 'Submission History'}
                </button>
              );
            })}
          </nav>

          {/* TAB 1: INSTRUCTIONS */}
          {activeTab === 'instructions' && (
            <div>
              <RichContentRenderer document={assignment.instructionsJson as any} />
            </div>
          )}

          {/* TAB 2: YOUR ANSWER (WYSIWYG RTE EDITOR WITH AUTO-PREVIEW) */}
          {activeTab === 'answer' && (
            <div className="space-y-6">
              {studentState?.submittedAt && !isEditing ? (
                <div className="space-y-4">
                  <div className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-6">
                    <RichContentRenderer document={submissionValue} />
                  </div>
                  
                  <div className="flex gap-3">
                    {studentState.canEdit && (
                      <button onClick={() => setIsEditing(true)} className="btn btn-primary text-2xs px-4 py-2 font-bold cursor-pointer">
                        Edit Submission Draft
                      </button>
                    )}
                    {studentState.canDelete && (
                      <button 
                        onClick={handleWithdraw} 
                        disabled={withdrawSubmission.isPending} 
                        className="btn btn-danger text-2xs px-4 py-2 font-bold cursor-pointer"
                      >
                        {withdrawSubmission.isPending ? 'Withdrawing...' : 'Withdraw Submission'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <RichContentEditor value={submissionValue} onChange={setSubmissionValue} />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitAssignment.isPending || editSubmission.isPending}
                      className="btn btn-primary text-xs px-5 py-2 font-bold cursor-pointer"
                    >
                      {submitAssignment.isPending || editSubmission.isPending
                        ? 'Saving response...'
                        : isEditing
                        ? 'Save Answer Updates'
                        : 'Submit Assignment'}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY (VERSION HISTORY RENDERER) */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {versions.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">No submission attempts recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Submission Version Attempt:</span>
                    <select
                      value={selectedVersionId || ''}
                      onChange={(e) => setSelectedVersionId(e.target.value)}
                      className="input text-xs font-semibold py-1 px-3 bg-[var(--bg-base)] w-64"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Attempt #{v.version_number} - {new Date(v.created_at || v.submitted_at).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedVersion && (
                    <div className="border border-[var(--border-default)] rounded-xl p-6 bg-[var(--bg-base)] animate-fade-in">
                      <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)] block mb-3">
                        Attempt #{selectedVersion.version_number} Content
                      </span>
                      <RichContentRenderer document={selectedVersion.content_json} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* FILE SUBMISSION */}
      {assignmentType === 'FILE_SUBMISSION' && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">File Upload Submission</h2>

          {studentState?.submittedAt && !isEditing ? (
            <div className="rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-5 space-y-4">
              <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)] block">My Submission Summary</span>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                <li>• Version Submitted: {studentState.attemptsUsed ?? 1}</li>
                <li>• Submitted Timestamp: {new Date(studentState.submittedAt).toLocaleString()}</li>
              </ul>
              
              <div className="flex gap-3">
                {studentState.canEdit && (
                  <button onClick={() => setIsEditing(true)} className="btn btn-primary btn-sm font-bold cursor-pointer">
                    Edit Submission
                  </button>
                )}
                {studentState.canDelete && (
                  <button 
                    onClick={handleWithdraw} 
                    disabled={withdrawSubmission.isPending} 
                    className="btn btn-danger btn-sm font-bold cursor-pointer"
                  >
                    Withdraw Submission
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <span className="text-3xs font-extrabold uppercase tracking-wide text-[var(--text-faint)] block">Upload Settings</span>
                <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                  <li>• Max Upload Count: {(settings as FileAssignmentSettings)?.maxFiles ?? 1}</li>
                  <li>• Max File Size: {(settings as FileAssignmentSettings)?.maxFileSizeMb ?? 10} MB</li>
                  {((settings as FileAssignmentSettings)?.allowedFileTypes?.length ?? 0) > 0 && (
                    <li>• Formats Allowed: {((settings as FileAssignmentSettings)?.allowedFileTypes || []).join(', ')}</li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">Mock File Attachment Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs focus:outline-none bg-[var(--bg-base)] text-[var(--text-primary)]"
                    placeholder="e.g. document.pdf"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs focus:outline-none bg-[var(--bg-base)] text-[var(--text-primary)]"
                    placeholder="Mock URL (optional)"
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                  />
                  <button type="button" onClick={handleAddFile} className="btn btn-secondary text-xs py-1.5 px-4 font-bold cursor-pointer">
                    Add File
                  </button>
                </div>

                {fileList.length > 0 && (
                  <div className="divide-y rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                    {fileList.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2 text-xs font-bold">
                        <div>
                          <span>{file.fileName}</span>
                          <span className="ml-2 text-3xs text-[var(--text-faint)] font-mono">({file.fileUrl})</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveFile(idx)} className="text-xs font-bold text-[var(--fn-error)] cursor-pointer">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={submitAssignment.isPending || editSubmission.isPending} className="btn btn-primary text-xs px-5 py-2 font-bold cursor-pointer">
                  {submitAssignment.isPending || editSubmission.isPending ? 'Submitting...' : isEditing ? 'Save Update' : 'Submit Assignment'}
                </button>
                {isEditing && (
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer">
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {/* VPL SUBMISSION */}
      {assignmentType === 'VPL' && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">VPL Code Workspace</h2>
            {(settings as VplAssignmentSettings)?.runtime && (
              <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                Runtime: {(settings as VplAssignmentSettings).runtime}
              </span>
            )}
          </div>

          {studentState?.submittedAt && !isEditing ? (
            <div className="space-y-4">
              <div className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-5 font-mono text-xs overflow-x-auto whitespace-pre">
                {vplCode || '// No code submitted.'}
              </div>
              
              <div className="flex gap-3">
                {studentState.canEdit && (
                  <button onClick={() => setIsEditing(true)} className="btn btn-primary btn-sm font-bold cursor-pointer">
                    Edit Code Submission
                  </button>
                )}
                {studentState.canDelete && (
                  <button 
                    onClick={handleWithdraw} 
                    disabled={withdrawSubmission.isPending} 
                    className="btn btn-danger btn-sm font-bold cursor-pointer"
                  >
                    Withdraw Submission
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  Code Input ({(settings as VplAssignmentSettings)?.language || 'javascript'})
                </label>
                <textarea
                  className="input min-h-[220px] font-mono text-xs"
                  placeholder={(settings as VplAssignmentSettings)?.templateCode || '// Write your code execution here...'}
                  value={vplCode}
                  onChange={(e) => setVplCode(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={submitAssignment.isPending || editSubmission.isPending} className="btn btn-primary text-xs px-5 py-2 font-bold cursor-pointer">
                  {submitAssignment.isPending || editSubmission.isPending ? 'Submitting...' : isEditing ? 'Save Update' : 'Submit Code'}
                </button>
                {isEditing && (
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer">
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {/* SEMINAR ATTENDANCE */}
      {assignmentType === 'SEMINAR' && (
        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">Seminar Attendance</h2>
            {attendanceOverview?.activeSession && (
              <span className="rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] px-2.5 py-0.5 text-xs font-bold text-[var(--fn-success)]">
                Session Active
              </span>
            )}
          </div>

          {isStaff ? (
            /* TEACHER FLOW */
            <div className="space-y-6">
              {!attendanceOverview?.activeSession ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                    Start a new QR check-in session for this seminar. Students will scan the code to register their attendance instantly.
                  </div>
                  <button
                    onClick={handleCreateSession}
                    className="btn btn-primary text-xs px-6 py-2.5 font-bold cursor-pointer transition-all duration-200"
                  >
                    Create QR Check-in
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {rawToken ? (
                    <div className="text-center space-y-4">
                      <div className="p-4 border rounded-2xl bg-[var(--bg-base)] max-w-xs mx-auto" style={{ borderColor: 'var(--border-subtle)' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                            `${window.location.origin}/seminars/check-in?token=${rawToken}`
                          )}`}
                          alt="Check-in QR Code"
                          className="w-56 h-56 mx-auto rounded-lg shadow-sm border border-[var(--border-subtle)] bg-white p-1"
                        />
                      </div>
                      <div className="text-3xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                        Project this QR code on a screen. The link is valid for 15 minutes.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 border rounded-xl bg-[var(--bg-base)] max-w-md mx-auto" style={{ borderColor: 'var(--border-subtle)' }}>
                      <p className="text-xs text-[var(--text-secondary)] font-bold">QR Code Unavailable</p>
                      <p className="text-2xs text-[var(--text-muted)] mt-2 leading-relaxed">
                        The QR code is no longer viewable because the page was refreshed. Active session remains valid for students who have the link or scanned it.
                      </p>
                      <p className="text-2xs text-[var(--text-muted)] mt-1">
                        To show a new QR code, close this session and start a new one.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="p-4 border rounded-xl text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                      <div className="text-3xs font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Time Remaining</div>
                      <div className="text-xl font-black mt-1 text-[var(--text-primary)] font-mono">
                        {sessionTimer !== null ? formatTimer(sessionTimer) : '0:00'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-xl text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                      <div className="text-3xs font-extrabold uppercase text-[var(--text-muted)] tracking-wider">Checked In</div>
                      <div className="text-xl font-black mt-1 text-[var(--text-primary)]">
                        {attendanceOverview.checkedInCount}
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={handleCloseSession}
                      className="btn btn-danger btn-sm text-xs font-bold cursor-pointer transition-all duration-200"
                    >
                      Close Session
                    </button>
                  </div>
                </div>
              )}

              {/* Checked-In Students List */}
              <div className="border-t border-[var(--border-subtle)] pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Checked-In Students</h3>
                {attendanceOverview && attendanceOverview.records.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)]" style={{ background: 'var(--bg-overlay)' }}>
                          <th className="p-3 font-bold text-[var(--text-muted)] text-3xs uppercase tracking-wider">Student Name</th>
                          <th className="p-3 font-bold text-[var(--text-muted)] text-3xs uppercase tracking-wider">Email</th>
                          <th className="p-3 font-bold text-[var(--text-muted)] text-3xs uppercase tracking-wider text-right">Check-In Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {attendanceOverview.records.map((record) => (
                          <tr key={record.id} className="hover:bg-[var(--bg-overlay)] transition-colors">
                            <td className="p-3 font-semibold text-[var(--text-primary)]">{record.studentName}</td>
                            <td className="p-3 text-[var(--text-secondary)]">{record.studentEmail}</td>
                            <td className="p-3 text-right text-[var(--text-muted)] font-mono">
                              {new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-3xs text-[var(--text-faint)] bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)] border-dashed">
                    No students checked in yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STUDENT FLOW */
            <div className="space-y-4">
              {attendanceOverview && attendanceOverview.records.length > 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.02)] text-center space-y-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(16,185,129,0.08)] text-[var(--fn-success)] text-xl font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Attendance Approved</h3>
                    <p className="text-3xs text-[var(--text-muted)] mt-1">
                      Checked In: {new Date(attendanceOverview.records[0].checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.02)] text-center space-y-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(245,158,11,0.08)] text-[var(--fn-warning)] text-xl font-semibold font-mono">
                    !
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Not Checked In</h3>
                    <p className="text-3xs text-[var(--text-muted)] mt-1 max-w-xs leading-relaxed">
                      Please scan the QR code displayed by your instructor in the classroom to record your attendance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
