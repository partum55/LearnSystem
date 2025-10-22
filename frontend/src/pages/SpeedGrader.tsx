import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Header, Card, CardHeader, CardBody, Button, Loading } from '../components';
import apiClient from '../api/client';

interface Submission {
  id: string;
  user: string;
  student_name: string;
  student_email: string;
  status: string;
  text_answer: string;
  files: any[];
  uploaded_files: any[];
  submission_url: string | null;
  grade: number | null;
  feedback: string;
  rubric_evaluation: any;
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
  rubric: any;
  late_penalty_percent: number;
}

export const SpeedGrader: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [comment, setComment] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});

  const currentSubmission = submissions[currentIndex];

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
  }, [assignmentId]);

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
      setGrade(currentSubmission.grade?.toString() || '');
      setFeedback(currentSubmission.feedback || '');
      setRubricScores(currentSubmission.rubric_evaluation || {});
    }
  }, [currentSubmission]);

  const fetchAssignment = async () => {
    try {
      const response = await apiClient.get<Assignment>(`/assessments/assignments/${assignmentId}/`);
      setAssignment(response.data);
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await apiClient.get<any>(`/submissions/submissions/speedgrader/?assignment=${assignmentId}`);
      const data = response.data;
      const allSubmissions = [...(data.ungraded || []), ...(data.recently_graded || [])];
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!currentSubmission) return;

    setSaving(true);
    try {
      await apiClient.post(`/submissions/submissions/${currentSubmission.id}/grade/`, {
        grade: parseFloat(grade),
        feedback,
        rubric_evaluation: rubricScores,
      });

      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to save grade:', error);
      alert('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentSubmission || !comment.trim()) return;

    try {
      await apiClient.post(`/submissions/submissions/${currentSubmission.id}/add_comment/`, { comment });
      setComment('');
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const navigateToNext = () => {
    if (currentIndex < submissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {assignment.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                SpeedGrader - {currentIndex + 1} of {submissions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={navigateToPrevious}
                disabled={currentIndex === 0}
                variant="secondary"
              >
                ← Previous
              </Button>
              <Button
                onClick={navigateToNext}
                disabled={currentIndex === submissions.length - 1}
                variant="secondary"
              >
                Next →
              </Button>
              <Button onClick={() => navigate(`/assignments/${assignmentId}`)}>
                Exit
              </Button>
            </div>
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
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {currentSubmission.student_name}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentSubmission.student_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Submitted: {new Date(currentSubmission.submitted_at).toLocaleString()}
                      </p>
                      {currentSubmission.is_late && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Text Answer
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Uploaded Files
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2">
                      {currentSubmission.uploaded_files.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {file.filename}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(file.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Submission URL
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <a
                      href={currentSubmission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {currentSubmission.submission_url}
                    </a>
                  </CardBody>
                </Card>
              )}

              {/* Comments */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Comments
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {currentSubmission.comments?.map((c) => (
                      <div key={c.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {c.author_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{c.comment}</p>
                      </div>
                    ))}
                    
                    <div className="pt-4">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Grade
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          / {assignment.max_points}
                        </span>
                      </div>
                      {currentSubmission.is_late && assignment.late_penalty_percent > 0 && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Late penalty: {assignment.late_penalty_percent}% per day
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Feedback
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={6}
                        placeholder="Provide feedback to the student..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Rubric
                      </h3>
                      <Button onClick={applyRubricToGrade} variant="secondary" size="sm">
                        Apply to Grade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {Object.entries(assignment.rubric).map(([criterion, maxPoints]: [string, any]) => (
                        <div key={criterion}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          />
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Max: {maxPoints} points
                          </p>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Total: {calculateRubricTotal()} points
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSaveGrade}
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

