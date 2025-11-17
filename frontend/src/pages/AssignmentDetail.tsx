import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { Loading } from '../components';

interface Assignment {
  id: string;
  course: string;
  title: string;
  description: string;
  due_date: string;
  available_from: string | null;
  max_points: number;
  rubric: any;
  allow_late_submission: boolean;
  late_penalty_percent: number;
  submission_types: string[];
  submissions_count: number;
  graded_count: number;
  assignment_type: string;
}

interface Submission {
  id: string;
  user: string;
  student_name: string;
  student_email: string;
  status: string;
  grade: number | null;
  submitted_at: string | null;
  is_late: boolean;
}

export const AssignmentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'submissions'>('details');

  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN' || user?.role === 'TA';

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await api.get<Assignment>(`assessments/assignments/${assignmentId}/`);
      setAssignment(response.data);
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await api.get<{ results: Submission[] }>(`submissions/submissions/?assignment=${assignmentId}`);
      const submissionsList = response.data.results || [];
      setSubmissions(submissionsList);

      // Find current user's submission if student
      if (isStudent && user) {
        const userSubmission = submissionsList.find((s: Submission) => s.user === user.id);
        setMySubmission(userSubmission || null);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const handleSubmitAssignment = () => {
    // Navigate to submit page with correct route
    navigate(`/assignments/${assignmentId}/submit`);
  };

  const openVirtualLab = () => {
    navigate(`/virtual-lab/${assignmentId}`);
  };

  const openSpeedGrader = () => {
    navigate(`/speedgrader/${assignmentId}`);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'DRAFT': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200', label: 'Draft' },
      'SUBMITTED': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'Submitted' },
      'GRADED': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Graded' },
      'RETURNED': { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', label: 'Returned' },
    };

    const badge = badges[status] || badges['DRAFT'];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {/* Assignment Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {assignment.title}
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {t('assignment.due')}: {new Date(assignment.due_date).toLocaleString()}
                  </p>
                </div>

                {/* Submit Button for Students */}
                {isStudent && (
                  <div className="flex gap-3">
                    {assignment.assignment_type === 'VIRTUAL_LAB' ? (
                      <Button onClick={openVirtualLab} className="bg-green-600 hover:bg-green-700">
                        {t('assignment.open_virtual_lab')}
                      </Button>
                    ) : mySubmission && mySubmission.status !== 'DRAFT' ? (
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          {mySubmission.status === 'SUBMITTED' && (
                            <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              ✓ {t('submission.submitted_successfully')}
                            </span>
                          )}
                          {mySubmission.status === 'GRADED' && (
                            <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                              ✓ {t('gradebook.status.graded')}: {mySubmission.grade} / {assignment.max_points}
                            </span>
                          )}
                        </div>
                        <Button onClick={handleSubmitAssignment} variant="outline">
                          {t('submission.view_submission')}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleSubmitAssignment} className="bg-blue-600 hover:bg-blue-700">
                        {t('submission.submit_assignment')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {assignment.max_points}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Points
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {assignment.submissions_count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Submissions
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {assignment.graded_count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Graded
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {assignment.submissions_count - assignment.graded_count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      To Grade
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {t('assignment.tabs.basic')}
                </button>
                {isTeacher && (
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'submissions'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {t('courses.assignments')} ({assignment.submissions_count})
                  </button>
                )}
              </nav>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('assignment.description')}
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400">{assignment.description}</p>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Submission Types</h3>
                      <div className="flex flex-wrap gap-2">
                        {assignment.submission_types.map((type) => (
                          <span
                            key={type}
                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {assignment.allow_late_submission && (
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Late Policy</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {assignment.late_penalty_percent}% penalty per day
                        </p>
                      </div>
                    )}

                    {assignment.rubric && Object.keys(assignment.rubric).length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rubric</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <pre className="text-sm text-gray-600 dark:text-gray-400">
                            {JSON.stringify(assignment.rubric, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Submissions Tab - Only for Teachers */}
            {activeTab === 'submissions' && isTeacher && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {t('courses.assignments')}
                    </h2>
                    <Button onClick={openSpeedGrader}>
                      {t('gradebook.speedgrader') || 'Open SpeedGrader'}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {submissions.length === 0 ? (
                    <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                      No submissions yet
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Submitted
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Grade
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {submissions.map((submission) => (
                            <tr key={submission.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {submission.student_name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {submission.student_email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {getStatusBadge(submission.status)}
                                  {submission.is_late && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      Late
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {submission.submitted_at
                                  ? new Date(submission.submitted_at).toLocaleString()
                                  : 'Not submitted'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {submission.grade !== null
                                  ? `${submission.grade} / ${assignment.max_points}`
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/speedgrader/${assignmentId}?submission=${submission.id}`)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  Grade
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AssignmentDetail;
