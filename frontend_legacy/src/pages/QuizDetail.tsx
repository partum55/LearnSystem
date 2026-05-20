import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { Loading } from '../components';
import { CreateQuestionModal } from '../components';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { RichContentRenderer } from '../components/common/RichContentRenderer';
import apiClient from '../api/client';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  points: number;
  options: Record<string, unknown>;
  correct_answer: Record<string, unknown> | string | number | boolean;
  explanation: string;
}

interface QuizQuestion {
  id: string;
  position: number;
  points_override: number | null;
  question_detail: Question;
}

interface Quiz {
  id: string;
  course: string;
  module_id?: string;
  title: string;
  description: string;
  time_limit: number | null;
  timer_enabled: boolean;
  attempts_allowed: number | null;
  attempt_limit_enabled: boolean;
  attempt_score_policy: 'HIGHEST' | 'LATEST' | 'FIRST';
  secure_session_enabled: boolean;
  secure_require_fullscreen: boolean;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  pass_percentage: number;
  questions: QuizQuestion[];
  questions_count: number;
  total_points: number;
}

export const QuizDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDuplicatingQuiz, setIsDuplicatingQuiz] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [hoveredQuestionId, setHoveredQuestionId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>('');

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    try {
      const response = await apiClient.get<{
        id: string;
        courseId: string;
        moduleId?: string;
        title: string;
        description?: string;
        timeLimit?: number | null;
        timerEnabled?: boolean;
        attemptsAllowed?: number;
        attemptLimitEnabled?: boolean;
        attemptScorePolicy?: 'HIGHEST' | 'LATEST' | 'FIRST';
        secureSessionEnabled?: boolean;
        secureRequireFullscreen?: boolean;
        shuffleQuestions?: boolean;
        shuffleAnswers?: boolean;
        showCorrectAnswers?: boolean;
        passPercentage?: number;
        questions?: Array<{
          id: string;
          position: number;
          pointsOverride?: number | null;
          question: {
            id: string;
            questionType: string;
            stem: string;
            points: number;
            options: Record<string, unknown>;
            correctAnswer: Record<string, unknown> | string | number | boolean;
            explanation: string;
          };
        }>;
        totalQuestions?: number;
        totalPoints?: number;
      }>(`/assessments/quizzes/${quizId}`);

      const mapped: Quiz = {
        id: response.data.id,
        course: response.data.courseId,
        module_id: response.data.moduleId,
        title: response.data.title,
        description: response.data.description || '',
        time_limit: response.data.timeLimit ?? null,
        timer_enabled: Boolean(response.data.timerEnabled ?? (response.data.timeLimit !== null && response.data.timeLimit !== undefined)),
        attempts_allowed:
          response.data.attemptsAllowed === null || response.data.attemptsAllowed === undefined
            ? null
            : response.data.attemptsAllowed,
        attempt_limit_enabled:
          Boolean(response.data.attemptLimitEnabled ?? (response.data.attemptsAllowed !== null && response.data.attemptsAllowed !== undefined)),
        attempt_score_policy: response.data.attemptScorePolicy ?? 'HIGHEST',
        secure_session_enabled: Boolean(response.data.secureSessionEnabled),
        secure_require_fullscreen:
          response.data.secureRequireFullscreen === undefined ? true : Boolean(response.data.secureRequireFullscreen),
        shuffle_questions: Boolean(response.data.shuffleQuestions),
        shuffle_answers: Boolean(response.data.shuffleAnswers),
        show_correct_answers: Boolean(response.data.showCorrectAnswers),
        pass_percentage: Number(response.data.passPercentage ?? 60),
        questions: (response.data.questions || []).map((q) => ({
          id: q.id,
          position: q.position,
          points_override: q.pointsOverride ?? null,
          question_detail: {
            id: q.question.id,
            question_type: q.question.questionType,
            stem: q.question.stem,
            points: q.question.points,
            options: q.question.options,
            correct_answer: q.question.correctAnswer,
            explanation: q.question.explanation,
          },
        })),
        questions_count: Number(response.data.totalQuestions ?? 0),
        total_points: Number(response.data.totalPoints ?? 0),
      };
      setQuiz(mapped);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  const fetchAvailableQuestions = useCallback(async () => {
    if (!quiz?.course) return;
    try {
      const response = await apiClient.get<{ content?: Array<{
        id: string;
        questionType: string;
        stem: string;
        points: number;
        options: Record<string, unknown>;
        correctAnswer: Record<string, unknown> | string | number | boolean;
        explanation: string;
      }> }>(`/assessments/questions/course/${quiz.course}`);
      const data = (response.data.content || []).map((q) => ({
        id: q.id,
        question_type: q.questionType,
        stem: q.stem,
        points: q.points,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
      }));
      setAvailableQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  }, [quiz?.course]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  useEffect(() => {
    if (quiz?.course) {
      fetchAvailableQuestions();
    }
  }, [quiz?.course, fetchAvailableQuestions]);

  useEffect(() => {
    const fetchCourseName = async () => {
      if (!quiz?.course) {
        return;
      }
      try {
        const response = await apiClient.get<{ titleUk?: string; titleEn?: string; title?: string; code?: string }>(
          `/courses/${quiz.course}`
        );
        const data = response.data;
        setCourseName(data.titleEn || data.titleUk || data.title || data.code || '');
      } catch {
        setCourseName('');
      }
    };

    void fetchCourseName();
  }, [quiz?.course]);

  const handleAddQuestions = async () => {
    try {
      await Promise.all(
        selectedQuestions.map((questionId) =>
          apiClient.post(`/assessments/quizzes/${quizId}/questions/${questionId}`)
        )
      );
      setSelectedQuestions([]);
      fetchQuiz();
    } catch (error) {
      console.error('Failed to add questions:', error);
    }
  };

  const handleDuplicateQuiz = async () => {
    if (!quizId || !quiz) return;
    setIsDuplicatingQuiz(true);
    try {
      const response = await apiClient.post<{ id: string }>(`/assessments/quizzes/${quizId}/duplicate`, {
        targetCourseId: quiz.course,
        targetModuleId: quiz.module_id,
      });
      const duplicatedQuizId = String(response.data.id);
      navigate(`/quiz/${duplicatedQuizId}`);
    } catch (error) {
      console.error('Failed to duplicate quiz:', error);
      window.alert(t('quiz.duplicateFailed', 'Failed to duplicate quiz.'));
    } finally {
      setIsDuplicatingQuiz(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'SINGLE_CHOICE': t('question.types.singleChoice', 'Single Choice'),
      'MULTIPLE_CHOICE': t('question.types.multipleChoice'),
      'MULTIPLE_RESPONSE': t('question.types.multipleResponse', 'Multiple Response'),
      'TRUE_FALSE': t('question.types.trueFalse'),
      'FILL_BLANK': t('question.types.fillBlank'),
      'MATCHING': t('question.types.matching'),
      'NUMERICAL': t('question.types.numerical'),
      'NUMERIC': t('question.types.numeric', 'Numeric'),
      'ORDERING': t('question.types.ordering', 'Ordering'),
      'FORMULA': t('question.types.formula'),
      'SHORT_ANSWER': t('question.types.shortAnswer'),
      'ESSAY': t('question.types.essay'),
      'CODE': t('question.types.code'),
    };
    return types[type] || type;
  };

  if (loading) {
    return <Loading />;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumbs
            className="mb-6"
            items={[
              { label: t('courses.title', 'Courses'), to: '/courses' },
              ...(quiz.course ? [{ label: courseName || t('courses.title', 'Course'), to: `/courses/${quiz.course}` }] : []),
              { label: quiz.title },
            ]}
          />

          {/* Quiz Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {quiz.title}
                </h1>
                <div className="mt-2">
                  <RichContentRenderer content={quiz.description} />
                </div>
              </div>
              <Button onClick={handleDuplicateQuiz} disabled={isDuplicatingQuiz}>
                {isDuplicatingQuiz
                  ? t('common.processing', 'Processing...')
                  : t('quiz.duplicateQuiz', 'Duplicate Quiz')}
              </Button>
            </div>
          </div>

          {/* Quiz Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {quiz.questions_count}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('quiz.questions')}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {quiz.total_points}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('quiz.totalPoints')}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {quiz.timer_enabled && quiz.time_limit ? quiz.time_limit : '∞'}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('quiz.minutes')}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {quiz.attempt_limit_enabled ? (quiz.attempts_allowed ?? '\u2014') : t('quiz.unlimited', '∞')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('quiz.attempts')}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Questions List */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('quiz.questions')}
                </h2>
                <Button onClick={() => setIsQuestionModalOpen(true)}>
                  {t('question.createNew')}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {quiz.questions.length === 0 ? (
                <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  {t('quiz.noQuestions')}
                </p>
              ) : (
                <div className="space-y-4">
                  {quiz.questions.map((quizQuestion, index) => (
                    <div
                      key={quizQuestion.id}
                      className="rounded-lg p-4"
                      style={{ border: '1px solid var(--border-default)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {index + 1}.
                            </span>
                            <span className="badge">
                              {getQuestionTypeLabel(quizQuestion.question_detail.question_type)}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {quizQuestion.points_override || quizQuestion.question_detail.points} {t('quiz.points')}
                            </span>
                          </div>
                          <p className="mb-2" style={{ color: 'var(--text-primary)' }}>
                            {quizQuestion.question_detail.stem}
                          </p>
                          {quizQuestion.question_detail.explanation && (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              💡 {quizQuestion.question_detail.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Add Questions from Bank */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('quiz.addFromBank')}
              </h2>
            </CardHeader>
            <CardBody>
              {availableQuestions.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {t('quiz.noAvailableQuestions')}
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {availableQuestions.map((question) => (
                      <label
                        key={question.id}
                        className="flex items-start space-x-3 p-3 rounded-lg cursor-pointer"
                        style={{
                          border: '1px solid var(--border-default)',
                          backgroundColor: hoveredQuestionId === question.id ? 'var(--bg-hover)' : 'transparent',
                        }}
                        onMouseEnter={() => setHoveredQuestionId(question.id)}
                        onMouseLeave={() => setHoveredQuestionId(null)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuestions([...selectedQuestions, question.id]);
                            } else {
                              setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                            }
                          }}
                          className="mt-1 rounded"
                          style={{ accentColor: 'var(--text-primary)' }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="badge">
                              {getQuestionTypeLabel(question.question_type)}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {question.points} {t('quiz.points')}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-primary)' }}>
                            {question.stem}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleAddQuestions}
                    disabled={selectedQuestions.length === 0}
                  >
                    {t('quiz.addSelected')} ({selectedQuestions.length})
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <CreateQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        courseId={quiz.course}
        onQuestionCreated={() => {
          fetchAvailableQuestions();
        }}
      />
    </Layout>
  );
};

export default QuizDetail;
