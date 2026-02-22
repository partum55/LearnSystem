import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button, Loading } from '../components';
import { ConfirmModal } from '../components/common/ConfirmModal';
import apiClient from '../api/client';

interface SubmissionFile {
  id: string;
  file_url: string;
  filename: string;
  file_size: number;
}

interface Submission {
  id: string;
  user: string;
  student_name: string;
  student_email: string;
  status: string;
  text_answer: string;
  files: SubmissionFile[];
  uploaded_files: SubmissionFile[];
  submission_url: string | null;
  grade: number | null;
  feedback: string;
  rubric_evaluation: Record<string, number>;
  submitted_at: string;
  is_late: boolean;
  days_late: number;
  comments: Comment[];
}

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  comment: string;
  created_at: string;
}

interface Assignment {
  id: string;
  title: string;
  max_points: number;
  rubric: Record<string, number>;
  late_penalty_percent: number;
}

export const SpeedGrader: React.FC = () => {
  const { assignmentId: routeAssignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = routeAssignmentId || searchParams.get('assignmentId') || undefined;
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<'prev' | 'next' | 'exit' | null>(null);

  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [comment, setComment] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});

  const initialValuesRef = useRef<{ grade: string; feedback: string; rubricScores: Record<string, number> }>({
    grade: '',
    feedback: '',
    rubricScores: {},
  });

  const currentSubmission = submissions[currentIndex];

  // Protect against browser navigation/refresh when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved grading changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const submissionId = searchParams.get('submission');
    if (submissionId && submissions.length > 0) {
      const index = submissions.findIndex(s => s.id === submissionId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [searchParams, submissions]);

  useEffect(() => {
    if (currentSubmission) {
      const initialGrade = currentSubmission.grade?.toString() || '';
      const initialFeedback = currentSubmission.feedback || '';
      const initialRubric = currentSubmission.rubric_evaluation || {};

      setGrade(initialGrade);
      setFeedback(initialFeedback);
      setRubricScores(initialRubric);

      // Store initial values for dirty checking
      initialValuesRef.current = {
        grade: initialGrade,
        feedback: initialFeedback,
        rubricScores: initialRubric,
      };
      setIsDirty(false);
    }
  }, [currentSubmission]);

  const fetchAssignment = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const response = await apiClient.get<Assignment>(`/assessments/assignments/${assignmentId}`);
      setAssignment(response.data);
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    }
  }, [assignmentId]);

  const fetchSubmissions = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const response = await apiClient.get<{ ungraded?: Submission[]; recently_graded?: Submission[] }>(
        `/submissions/speedgrader?assignmentId=${assignmentId}`
      );
      const data = response.data;
      const allSubmissions = [...(data.ungraded || []), ...(data.recently_graded || [])];
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
  }, [fetchAssignment, fetchSubmissions]);

  const handleSaveGrade = async (navigateAfter?: 'prev' | 'next' | 'exit') => {
    if (!currentSubmission) return;

    setSaving(true);
    try {
      await apiClient.post(`/submissions/${currentSubmission.id}/grade`, {
        grade: parseFloat(grade),
        feedback,
        rubric_evaluation: rubricScores,
      });

      // Reset dirty state after successful save
      initialValuesRef.current = { grade, feedback, rubricScores };
      setIsDirty(false);

      // Handle pending navigation after save
      if (navigateAfter === 'next' && currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (navigateAfter === 'prev' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (navigateAfter === 'exit') {
        navigate(`/assignments/${assignmentId}`);
      } else if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to save grade:', error);
      alert('Failed to save grade');
    } finally {
      setSaving(false);
      setShowUnsavedModal(false);
      setPendingNavigation(null);
    }
  };

  const handleAddComment = async () => {
    if (!currentSubmission || !comment.trim()) return;

    try {
      await apiClient.post(`/submissions/${currentSubmission.id}/comments`, { comment });
      setComment('');
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Navigation with unsaved changes check
  const handleNavigation = (direction: 'prev' | 'next' | 'exit') => {
    if (isDirty) {
      setPendingNavigation(direction);
      setShowUnsavedModal(true);
    } else {
      executeNavigation(direction);
    }
  };

  const executeNavigation = (direction: 'prev' | 'next' | 'exit') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < submissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'exit') {
      navigate(`/assignments/${assignmentId}`);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      executeNavigation(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveAndNavigate = () => {
    if (pendingNavigation) {
      handleSaveGrade(pendingNavigation);
    }
  };

  const navigateToPrevious = () => {
    handleNavigation('prev');
  };

  const navigateToNext = () => {
    handleNavigation('next');
  };

  const handleExit = () => {
    handleNavigation('exit');
  };

  const calculateRubricTotal = () => {
    return Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
  };

  const applyRubricToGrade = () => {
    const total = calculateRubricTotal();
    setGrade(total.toString());
  };

  if (loading) {
    return <Loading />;
  }

  if (!assignment || submissions.length === 0) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              No Submissions to Grade
            </h2>
            <Button onClick={() => navigate(`/assignments/${assignmentId}`)}>
              Back to Assignment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={showUnsavedModal}
        onClose={() => {
          setShowUnsavedModal(false);
          setPendingNavigation(null);
        }}
        onConfirm={handleDiscardChanges}
        title="Unsaved Changes"
        message="You have unsaved changes to this grade. What would you like to do?"
        details="Your grade and feedback changes will be lost if you don't save."
        variant="warning"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        thirdAction={{
          text: "Save & Continue",
          onClick: handleSaveAndNavigate,
          isLoading: saving,
        }}
      />

      {/* SpeedGrader uses custom layout without sidebar */}
      <div className="px-8 py-4" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {assignment.title}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                SpeedGrader - {currentIndex + 1} of {submissions.length}
              </p>
              {isDirty && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--fn-warning)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--fn-warning)' }}></span>
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={navigateToPrevious}
              disabled={currentIndex === 0}
              variant="secondary"
            >
              &larr; Previous
            </Button>
            <Button
              onClick={navigateToNext}
              disabled={currentIndex === submissions.length - 1}
              variant="secondary"
            >
              Next &rarr;
            </Button>
            <Button onClick={handleExit}>
              Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Submission Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Student Info */}
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {currentSubmission.student_name}
                      </h2>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {currentSubmission.student_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Submitted: {new Date(currentSubmission.submitted_at).toLocaleString()}
                      </p>
                      {currentSubmission.is_late && (
                        <span className="badge badge-error inline-block mt-1">
                          Late ({currentSubmission.days_late} days)
                        </span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Text Answer */}
              {currentSubmission.text_answer && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Text Answer
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="max-w-none" style={{ color: 'var(--text-secondary)' }}>
                      <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                        {currentSubmission.text_answer}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Uploaded Files */}
              {currentSubmission.uploaded_files && currentSubmission.uploaded_files.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Uploaded Files
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2">
                      {currentSubmission.uploaded_files.map((file: SubmissionFile) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ background: 'var(--bg-elevated)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        >
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {file.filename}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {(file.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Submission URL */}
              {currentSubmission.submission_url && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Submission URL
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <a
                      href={currentSubmission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {currentSubmission.submission_url}
                    </a>
                  </CardBody>
                </Card>
              )}

              {/* Comments */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Comments
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {currentSubmission.comments?.map((c) => (
                      <div key={c.id} className="pl-4 py-2" style={{ borderLeft: '4px solid var(--border-strong)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {c.author_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p style={{ color: 'var(--text-secondary)' }}>{c.comment}</p>
                      </div>
                    ))}

                    <div className="pt-4">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="input w-full"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                        className="mt-2"
                      >
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Grading Panel */}
            <div className="space-y-6">
              {/* Grade Input */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Grade
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="label block mb-2">
                        Points
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          min="0"
                          max={assignment.max_points}
                          step="0.01"
                          className="input flex-1"
                        />
                        <span style={{ color: 'var(--text-muted)' }}>
                          / {assignment.max_points}
                        </span>
                      </div>
                      {currentSubmission.is_late && assignment.late_penalty_percent > 0 && (
                        <p className="text-sm mt-1" style={{ color: 'var(--fn-error)' }}>
                          Late penalty: {assignment.late_penalty_percent}% per day
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label block mb-2">
                        Feedback
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        placeholder="Provide feedback to the student..."
                        className="input w-full"
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Rubric */}
              {assignment.rubric && Object.keys(assignment.rubric).length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Rubric
                      </h3>
                      <Button onClick={applyRubricToGrade} variant="secondary" size="sm">
                        Apply to Grade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {Object.entries(assignment.rubric).map(([criterion, maxPoints]: [string, number]) => (
                        <div key={criterion}>
                          <label className="label block mb-1">
                            {criterion}
                          </label>
                          <input
                            type="number"
                            value={rubricScores[criterion] || 0}
                            onChange={(e) => setRubricScores({
                              ...rubricScores,
                              [criterion]: parseFloat(e.target.value) || 0
                            })}
                            min="0"
                            max={maxPoints}
                            step="0.5"
                            className="input w-full text-sm"
                          />
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Max: {maxPoints} points
                          </p>
                        </div>
                      ))}
                      <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Total: {calculateRubricTotal()} points
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Save Button */}
              <Button
                onClick={() => handleSaveGrade()}
                disabled={!grade || saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Grade & Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeedGrader;
