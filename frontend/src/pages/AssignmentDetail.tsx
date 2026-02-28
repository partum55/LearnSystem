import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Layout } from '../components';
import { CourseLayout } from '../components/CourseLayout';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { Loading } from '../components';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { BlockEditor, parseCanonicalDocument } from '../features/editor-core';

interface Assignment {
  id: string;
  course: string;
  title: string;
  description: string;
  description_format: string;
  instructions: string;
  instructions_format: string;
  due_date: string;
  available_from: string | null;
  max_points: number;
  rubric: Record<string, unknown> | null;
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
  const params = useParams<{ id?: string; assignmentId?: string; courseId?: string; moduleId?: string }>();
  const assignmentId = params.assignmentId || params.id;
  const courseId = params.courseId;
  const moduleId = params.moduleId;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'submissions'>('details');
  const [courseName, setCourseName] = useState<string>('');
  const [moduleName, setModuleName] = useState<string>('');

  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN' || user?.role === 'TA';

  // Build base path for assignment navigation
  const assignmentBasePath = courseId && moduleId
    ? `/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`
    : `/assignments/${assignmentId}`;

  useEffect(() => {
    fetchAssignment();
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  // Fetch course and module names for breadcrumb context
  useEffect(() => {
    if (courseId) {
      api.get<Record<string, unknown>>(`/courses/${courseId}`)
        .then(res => {
          const d = res.data;
          setCourseName(String(d.titleEn || d.titleUk || d.title || d.code || ''));
        })
        .catch(() => { /* ignore */ });
    }
    if (courseId && moduleId) {
      api.get<Record<string, unknown>>(`/courses/${courseId}/modules/${moduleId}`)
        .then(res => {
          const d = res.data;
          setModuleName(String(d.title || ''));
        })
        .catch(() => { /* ignore */ });
    }
  }, [courseId, moduleId]);

  const fetchAssignment = async () => {
    try {
      const response = await api.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`);
      const data = response.data;
      setAssignment({
        id: String(data.id || ''),
        course: String(data.courseId || data.course || ''),
        title: String(data.title || ''),
        description: String(data.description || ''),
        description_format: String(data.descriptionFormat || data.description_format || 'MARKDOWN'),
        instructions: String(data.instructions || ''),
        instructions_format: String(data.instructionsFormat || data.instructions_format || 'MARKDOWN'),
        due_date: String(data.dueDate || ''),
        available_from: (data.availableFrom as string | null) || null,
        max_points: Number(data.maxPoints || 0),
        rubric: (data.rubric as Record<string, unknown> | null) || null,
        allow_late_submission: Boolean(data.allowLateSubmission),
        late_penalty_percent: Number(data.latePenaltyPercent || 0),
        submission_types: (data.submissionTypes as string[]) || [],
        submissions_count: Number(data.submissions_count || 0),
        graded_count: Number(data.graded_count || 0),
        assignment_type: String(data.assignmentType || data.assignment_type || ''),
      });
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await api.get<{ results?: Submission[]; content?: Submission[] } | Submission[]>(
        `/submissions?assignmentId=${assignmentId}`
      );
      const raw = response.data;
      const submissionsList = Array.isArray(raw) ? raw : raw.results || raw.content || [];
      setSubmissions(submissionsList);

      if (isStudent && user) {
        const userSubmission = submissionsList.find((s: Submission) => s.user === user.id);
        setMySubmission(userSubmission || null);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const handleSubmitAssignment = () => {
    navigate(`${assignmentBasePath}/submit`);
  };

  const openVirtualLab = () => {
    navigate(`/virtual-lab?assignmentId=${assignmentId}`);
  };

  const openSpeedGrader = () => {
    navigate(`/speed-grader?assignmentId=${assignmentId}`);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; label: string }> = {
      'DRAFT': { className: 'badge', label: 'Draft' },
      'SUBMITTED': { className: 'badge', label: 'Submitted' },
      'GRADED': { className: 'badge badge-success', label: 'Graded' },
      'RETURNED': { className: 'badge', label: 'Returned' },
    };

    const badge = styles[status] || styles['DRAFT'];
    return <span className={badge.className}>{badge.label}</span>;
  };

  if (loading) {
    return <Loading />;
  }

  if (!assignment) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto text-center py-16">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              {t('assignment.not_found', 'Assignment not found')}
            </p>
            {courseId && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                {t('courses.backToCourse', 'Back to Course')}
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const Wrapper = courseId ? ({ children }: { children: React.ReactNode }) => <CourseLayout courseId={courseId}>{children}</CourseLayout> : Layout;

  const renderContent = (content: string, format: string) => {
    if (format === 'RICH') {
      return <BlockEditor value={parseCanonicalDocument(content)} onChange={() => undefined} readOnly mode="full" />;
    }
    return <p style={{ color: 'var(--text-muted)' }}>{content}</p>;
  };

  return (
    <Wrapper>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb: Course > Module > Assignment */}
          {courseId && (
            <nav className="flex items-center text-sm mb-6 flex-wrap gap-y-1" style={{ color: 'var(--text-muted)' }}>
              <Link
                to="/courses"
                className="transition-colors hover:underline"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {t('nav.courses', 'Courses')}
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 mx-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <Link
                to={`/courses/${courseId}`}
                className="transition-colors hover:underline"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {courseName || t('courses.course', 'Course')}
              </Link>
              {moduleId && moduleName && (
                <>
                  <ChevronRightIcon className="h-3.5 w-3.5 mx-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <Link
                    to={`/courses/${courseId}`}
                    className="transition-colors hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    {moduleName}
                  </Link>
                </>
              )}
              <ChevronRightIcon className="h-3.5 w-3.5 mx-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-primary)' }}>
                {assignment.title}
              </span>
            </nav>
          )}
          {/* Assignment Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {assignment.title}
                </h1>
                <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                  {t('assignment.due')}: {new Date(assignment.due_date).toLocaleString()}
                </p>
              </div>

              {isStudent && (
                <div className="flex gap-3">
                  {assignment.assignment_type === 'VIRTUAL_LAB' ? (
                    <Button onClick={openVirtualLab}>
                      {t('assignment.open_virtual_lab')}
                    </Button>
                  ) : mySubmission && mySubmission.status !== 'DRAFT' ? (
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        {mySubmission.status === 'SUBMITTED' && (
                          <span className="badge">
                            {t('submission.submitted_successfully')}
                          </span>
                        )}
                        {mySubmission.status === 'GRADED' && (
                          <span className="badge badge-success">
                            {t('gradebook.status.graded')}: {mySubmission.grade} / {assignment.max_points}
                          </span>
                        )}
                      </div>
                      <Button onClick={handleSubmitAssignment} variant="secondary">
                        {t('submission.view_submission')}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleSubmitAssignment}>
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
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {assignment.max_points}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Points
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {assignment.submissions_count}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Submissions
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {assignment.graded_count}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Graded
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {assignment.submissions_count - assignment.graded_count}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    To Grade
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tabs */}
          <div className="mb-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                style={activeTab === 'details'
                  ? { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }
                  : { borderColor: 'transparent', color: 'var(--text-muted)' }
                }
              >
                {t('assignment.tabs.basic')}
              </button>
              {isTeacher && (
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  style={activeTab === 'submissions'
                    ? { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }
                    : { borderColor: 'transparent', color: 'var(--text-muted)' }
                  }
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
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('assignment.description')}
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Description</h3>
                    {renderContent(assignment.description, assignment.description_format)}
                  </div>

                  {assignment.instructions && (
                    <div>
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Instructions</h3>
                      {renderContent(assignment.instructions, assignment.instructions_format)}
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Submission Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {assignment.submission_types.map((type) => (
                        <span key={type} className="badge">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {assignment.allow_late_submission && (
                    <div>
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Late Policy</h3>
                      <p style={{ color: 'var(--text-muted)' }}>
                        {assignment.late_penalty_percent}% penalty per day
                      </p>
                    </div>
                  )}

                  {assignment.rubric && Object.keys(assignment.rubric).length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Rubric</h3>
                      <div
                        className="p-4 rounded-lg"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                      >
                        <pre
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
                        >
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
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('courses.assignments')}
                  </h2>
                  <Button onClick={openSpeedGrader}>
                    {t('gradebook.speedgrader') || 'Open SpeedGrader'}
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {submissions.length === 0 ? (
                  <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    No submissions yet
                  </p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Grade</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((submission) => (
                          <tr key={submission.id}>
                            <td>
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {submission.student_name}
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {submission.student_email}
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(submission.status)}
                                {submission.is_late && (
                                  <span className="badge badge-error">Late</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {submission.submitted_at
                                ? new Date(submission.submitted_at).toLocaleString()
                                : 'Not submitted'}
                            </td>
                            <td style={{ color: 'var(--text-primary)' }}>
                              {submission.grade !== null
                                ? `${submission.grade} / ${assignment.max_points}`
                                : '-'}
                            </td>
                            <td>
                              <button
                                onClick={() => navigate(`/speed-grader?assignmentId=${assignmentId}&submission=${submission.id}`)}
                                className="text-sm font-medium transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
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
    </Wrapper>
  );
};

export default AssignmentDetail;
