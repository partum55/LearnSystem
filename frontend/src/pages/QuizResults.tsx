import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardHeader, CardBody, Button, Loading } from '../components';
import apiClient from '../api/client';
import { CheckCircleIcon, XCircleIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/outline';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  options?: { choices?: string[] };
  correct_answer: Record<string, unknown> | string | number | boolean;
  explanation?: string;
  points: number;
}

interface StudentAnswer {
  selected_index?: number;
  selected_indices?: number[];
  value?: boolean | number;
  text?: string;
  order?: string[];
  pairs?: Record<string, string>;
  [key: string]: unknown;
}

interface QuizAttemptResult {
  id: string;
  quiz: {
    id: string;
    courseId: string;
    title: string;
    pass_percentage: number;
    show_correct_answers: boolean;
  };
  attempt_number: number;
  started_at: string;
  submitted_at: string;
  answers: Record<string, StudentAnswer>;
  auto_score: number;
  manual_score: number | null;
  final_score: number;
  feedback?: string;
  graded_by?: string;
  questions: Array<{
    id: string;
    question: Question;
    student_answer: StudentAnswer;
    is_correct: boolean | null;
    points_earned: number;
  }>;
}

interface ApiQuestion {
  id: string;
  questionType: string;
  stem: string;
  options?: { choices?: string[] };
  correctAnswer?: Record<string, unknown>;
  explanation?: string;
  points?: number;
}

interface ApiQuizQuestion {
  id: string;
  question?: ApiQuestion;
  questionId?: string;
  effectivePoints?: number;
}

interface ApiAttemptQuestion {
  id: string;
  questionId: string;
  position: number;
  points: number;
  payloadSnapshot?: Record<string, unknown>;
}

interface ApiQuiz {
  id: string;
  courseId: string;
  title: string;
  passPercentage?: number;
  showCorrectAnswers?: boolean;
  questions?: ApiQuizQuestion[];
}

interface ApiAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  answers?: Record<string, unknown>;
  autoScore?: number;
  manualScore?: number | null;
  finalScore?: number;
  feedback?: string;
  gradedBy?: string;
}

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '')).filter((item) => item.length > 0);
};

export const QuizResults: React.FC = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);

  const evaluateAnswer = (
    questionType: string,
    answerValue: unknown,
    correctAnswer: Record<string, unknown> | undefined
  ): { isCorrect: boolean | null; pointsMultiplier: number } => {
    if (!correctAnswer) return { isCorrect: null, pointsMultiplier: 0 };

    const type = questionType.toUpperCase();
    if (type === 'MULTIPLE_CHOICE' || type === 'SINGLE_CHOICE') {
      const expected = String(correctAnswer.choice ?? correctAnswer.answer ?? correctAnswer.value ?? '');
      const actual = String(answerValue ?? '');
      const correct = expected.length > 0 && actual === expected;
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'MULTIPLE_RESPONSE' || type === 'MULTI_SELECT') {
      const expected = new Set(readStringArray(correctAnswer.choices ?? correctAnswer.values));
      const actual = new Set(readStringArray(answerValue));
      const correct = expected.size > 0 && expected.size === actual.size && [...expected].every((item) => actual.has(item));
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'TRUE_FALSE') {
      const expected = String(correctAnswer.choice ?? correctAnswer.value ?? '').toLowerCase() === 'true';
      const actual = String(answerValue ?? '').toLowerCase() === 'true';
      const correct = actual === expected;
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'NUMERIC' || type === 'NUMERICAL') {
      const expected = Number(correctAnswer.value ?? NaN);
      const tolerance = Number(correctAnswer.tolerance ?? 0.01);
      const actual = Number(answerValue);
      if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
        return { isCorrect: false, pointsMultiplier: 0 };
      }
      const allowed = Math.abs(expected) * tolerance;
      const diff = Math.abs(expected - actual);
      const correct = diff <= allowed;
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'SHORT_ANSWER') {
      const expectedAnswers = readStringArray(correctAnswer.answers).map((ans) => ans.toLowerCase());
      const actual = String(answerValue ?? '').trim().toLowerCase();
      if (!expectedAnswers.length || !actual) return { isCorrect: null, pointsMultiplier: 0 };
      const correct = expectedAnswers.includes(actual);
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    // Short answer / essay / code are manually graded in backend
    return { isCorrect: null, pointsMultiplier: 0 };
  };

  const mapAnswerForDisplay = (question: Question, rawAnswer: unknown): StudentAnswer => {
    const type = question.question_type.toUpperCase();
    if (type === 'MULTIPLE_CHOICE' || type === 'SINGLE_CHOICE') {
      const choices = question.options?.choices || [];
      const selectedIndex = choices.findIndex((choice) => choice === rawAnswer);
      return selectedIndex >= 0 ? { selected_index: selectedIndex } : { text: String(rawAnswer ?? '') };
    }
    if (type === 'MULTIPLE_RESPONSE' || type === 'MULTI_SELECT') {
      const choices = question.options?.choices || [];
      const selectedIndices = readStringArray(rawAnswer)
        .map((value) => choices.findIndex((choice) => choice === value))
        .filter((idx) => idx >= 0);
      return { selected_indices: selectedIndices };
    }
    if (type === 'TRUE_FALSE') {
      return { value: String(rawAnswer ?? '').toLowerCase() === 'true' };
    }
    if (type === 'NUMERIC' || type === 'NUMERICAL') {
      return { value: Number(rawAnswer) };
    }
    if (type === 'MATCHING' && typeof rawAnswer === 'object' && rawAnswer !== null) {
      return { pairs: (rawAnswer as { pairs?: Record<string, string> }).pairs || {} };
    }
    if (type === 'ORDERING') {
      return { order: readStringArray(rawAnswer) };
    }
    if (typeof rawAnswer === 'string') {
      return { text: rawAnswer };
    }
    return { text: String(rawAnswer ?? '') };
  };

  const fetchResults = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const [quizResponse, attemptResponse] = await Promise.all([
        apiClient.get<ApiQuiz>(`/assessments/quizzes/${quizId}`),
        apiClient.get<ApiAttempt>(`/assessments/quiz-attempts/quiz/${quizId}/user/latest`),
      ]);

      const quizData = quizResponse.data;
      const attemptData = attemptResponse.data;
      const answersMap = attemptData.answers || {};
      const attemptQuestionsResponse = await apiClient.get<ApiAttemptQuestion[]>(
        `/assessments/quiz-attempts/${attemptData.id}/questions`
      );
      const attemptQuestions = Array.isArray(attemptQuestionsResponse.data) ? attemptQuestionsResponse.data : [];

      const quizQuestionsByQuestionId = new Map(
        (quizData.questions || []).map((quizQuestion) => {
          const questionId = quizQuestion.question?.id || quizQuestion.questionId || '';
          return [questionId, quizQuestion] as const;
        })
      );

      const questions = (attemptQuestions.length > 0 ? attemptQuestions : (quizData.questions || []).map((item) => ({
        id: item.id,
        questionId: item.question?.id || item.questionId || '',
        position: 0,
        points: Number(item.effectivePoints ?? item.question?.points ?? 0),
        payloadSnapshot: { questionType: item.question?.questionType, options: item.question?.options || {} },
      }))).map((attemptQuestion) => {
        const baseQuizQuestion = quizQuestionsByQuestionId.get(attemptQuestion.questionId);
        const apiQuestion = baseQuizQuestion?.question;
        const snapshot = (attemptQuestion.payloadSnapshot || {}) as Record<string, unknown>;
        const snapshotType = String(snapshot.questionType ?? snapshot.question_type ?? apiQuestion?.questionType ?? 'SHORT_ANSWER');
        const snapshotOptions = (snapshot.options && typeof snapshot.options === 'object')
          ? (snapshot.options as { choices?: string[] })
          : {};
        const points = Number(attemptQuestion.points ?? baseQuizQuestion?.effectivePoints ?? apiQuestion?.points ?? 0);
        const question: Question = {
          id: attemptQuestion.id,
          question_type: snapshotType,
          stem: apiQuestion?.stem || '',
          options: snapshotOptions.choices ? { choices: snapshotOptions.choices } : undefined,
          correct_answer: apiQuestion?.correctAnswer || {},
          explanation: apiQuestion?.explanation,
          points,
        };

        const rawAnswer = answersMap[attemptQuestion.id] ?? answersMap[attemptQuestion.questionId];
        const studentAnswer = mapAnswerForDisplay(question, rawAnswer);
        const evaluation = evaluateAnswer(question.question_type, rawAnswer, apiQuestion?.correctAnswer);
        const pointsEarned = evaluation.isCorrect === null ? 0 : points * evaluation.pointsMultiplier;

        return {
          id: attemptQuestion.id,
          question,
          student_answer: studentAnswer,
          is_correct: evaluation.isCorrect,
          points_earned: pointsEarned,
        };
      });

      const mapped: QuizAttemptResult = {
        id: attemptData.id,
        quiz: {
          id: quizData.id,
          courseId: quizData.courseId,
          title: quizData.title,
          pass_percentage: Number(quizData.passPercentage ?? 60),
          show_correct_answers: Boolean(quizData.showCorrectAnswers),
        },
        attempt_number: attemptData.attemptNumber,
        started_at: attemptData.startedAt,
        submitted_at: attemptData.submittedAt,
        answers: {},
        auto_score: Number(attemptData.autoScore ?? 0),
        manual_score: attemptData.manualScore ?? null,
        final_score: Number(attemptData.finalScore ?? attemptData.autoScore ?? 0),
        feedback: attemptData.feedback,
        graded_by: attemptData.gradedBy,
        questions,
      };

      setResult(mapped);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.response?.data?.error || t('quiz.errors.loadResultsFailed'));
    } finally {
      setLoading(false);
    }
  }, [quizId, t]);

  useEffect(() => {
    if (quizId) {
      fetchResults();
    }
  }, [quizId, fetchResults]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
  };

  const getAnswerDisplay = (question: Question, answer: StudentAnswer) => {
    if (!answer) return t('quiz.noAnswer');

    switch (question.question_type.toUpperCase()) {
      case 'MULTIPLE_CHOICE':
      case 'SINGLE_CHOICE':
        if (question.options?.choices && answer.selected_index !== undefined) {
          return question.options.choices?.[answer.selected_index] || t('quiz.noAnswer');
        }
        return t('quiz.noAnswer');

      case 'MULTIPLE_RESPONSE':
      case 'MULTI_SELECT':
        if (question.options?.choices && answer.selected_indices) {
          return answer.selected_indices
            .map((index) => question.options?.choices?.[index])
            .filter((choice): choice is string => Boolean(choice))
            .join(', ');
        }
        return t('quiz.noAnswer');

      case 'TRUE_FALSE':
        return answer.value ? t('question.true') : t('question.false');

      case 'NUMERIC':
      case 'NUMERICAL':
        return answer.value ?? answer.text ?? t('quiz.noAnswer');

      case 'SHORT_ANSWER':
      case 'ESSAY':
        return answer.text || t('quiz.noAnswer');

      case 'MATCHING':
        return JSON.stringify(answer.pairs || {});

      case 'ORDERING':
        return (answer.order || []).join(' → ');

      default:
        return JSON.stringify(answer);
    }
  };

  const getCorrectAnswerDisplay = (question: Question) => {
    const normalizedType = question.question_type.toUpperCase();
    const correctAnswerMap =
      typeof question.correct_answer === 'object' && question.correct_answer !== null
        ? (question.correct_answer as Record<string, unknown>)
        : {};

    switch (normalizedType) {
      case 'MULTIPLE_CHOICE':
      case 'SINGLE_CHOICE':
        if (correctAnswerMap.choice) {
          return String(correctAnswerMap.choice);
        }
        return '\u2014';

      case 'MULTIPLE_RESPONSE':
      case 'MULTI_SELECT':
        return readStringArray(correctAnswerMap.choices ?? correctAnswerMap.values).join(', ') || '\u2014';

      case 'TRUE_FALSE':
        return String(correctAnswerMap.choice ?? correctAnswerMap.value ?? '\u2014');

      case 'SHORT_ANSWER':
        if (readStringArray(correctAnswerMap.answers).length > 0) {
          return readStringArray(correctAnswerMap.answers).join(', ');
        }
        return t('quiz.manuallyGraded');

      case 'NUMERIC':
      case 'NUMERICAL':
        return String(correctAnswerMap.value ?? '\u2014');

      case 'ORDERING':
        return readStringArray(correctAnswerMap.order).join(' → ') || '\u2014';

      case 'MATCHING':
        return JSON.stringify(correctAnswerMap.pairs || {});

      case 'ESSAY':
        return t('quiz.manuallyGraded');

      default:
        return '\u2014';
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!result) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardBody>
              <p className="text-center" style={{ color: 'var(--fn-error)' }}>
                {error || t('quiz.errors.resultNotFound')}
              </p>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  const totalPoints = result.questions.reduce((sum, q) => sum + q.question.points, 0);
  const percentage = totalPoints > 0 ? (result.final_score / totalPoints) * 100 : 0;
  const passed = percentage >= result.quiz.pass_percentage;
  const needsManualGrading = result.manual_score === null &&
    result.questions.some(q => ['SHORT_ANSWER', 'ESSAY'].includes(q.question.question_type.toUpperCase()));

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <Card className="mb-6">
            <CardBody>
              <div className="text-center py-8">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                  style={{
                    background: passed
                      ? 'rgba(34, 197, 94, 0.08)'
                      : 'rgba(239, 68, 68, 0.08)',
                  }}
                >
                  {passed ? (
                    <TrophyIcon className="h-10 w-10" style={{ color: 'var(--fn-success)' }} />
                  ) : (
                    <XCircleIcon className="h-10 w-10" style={{ color: 'var(--fn-error)' }} />
                  )}
                </div>

                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {needsManualGrading ? t('quiz.pendingGrading') : passed ? t('quiz.passed') : t('quiz.failed')}
                </h1>

                <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
                  {result.quiz.title}
                </p>

                {/* Score Display */}
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div>
                    <div className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {result.final_score.toFixed(1)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('quiz.outOf')} {totalPoints}
                    </div>
                  </div>

                  <div className="w-px h-12" style={{ background: 'var(--border-default)' }} />

                  <div>
                    <div
                      className="text-4xl font-bold"
                      style={{ color: passed ? 'var(--fn-success)' : 'var(--fn-error)' }}
                    >
                      {percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('quiz.percentage')}
                    </div>
                  </div>
                </div>

                {needsManualGrading && (
                  <div
                    className="rounded-md p-4 mb-6"
                    style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--fn-warning)' }}>
                      {t('quiz.awaitingManualGrading')}
                    </p>
                  </div>
                )}

                {/* Time Info */}
                <div className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    <span>
                      {t('quiz.timeTaken')}: {formatDuration(result.started_at, result.submitted_at)}
                    </span>
                  </div>
                  <div>
                    {t('quiz.attemptNumber')} {result.attempt_number}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Instructor Feedback */}
          {result.feedback && (
            <Card className="mb-6">
              <CardHeader>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {t('quiz.instructorFeedback')}
                </h2>
              </CardHeader>
              <CardBody>
                <p style={{ color: 'var(--text-secondary)' }}>{result.feedback}</p>
              </CardBody>
            </Card>
          )}

          {/* Questions Review */}
          <Card>
            <CardHeader>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {t('quiz.questionsReview')}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {result.questions.map((item, index) => {
                  const isExpanded = expandedQuestions.has(item.question.id);
                  const showCorrectAnswer = result.quiz.show_correct_answers;
                  const isHovered = hoveredQuestion === item.question.id;

                  return (
                    <div
                      key={item.question.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--border-default)' }}
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => toggleQuestion(item.question.id)}
                        onMouseEnter={() => setHoveredQuestion(item.question.id)}
                        onMouseLeave={() => setHoveredQuestion(null)}
                        className="w-full p-4 flex items-center justify-between transition-colors"
                        style={{ background: isHovered ? 'var(--bg-hover)' : 'transparent' }}
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          {item.is_correct === true ? (
                            <CheckCircleIcon className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--fn-success)' }} />
                          ) : item.is_correct === false ? (
                            <XCircleIcon className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--fn-error)' }} />
                          ) : (
                            <ClockIcon className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--fn-warning)' }} />
                          )}

                          <div className="flex-1">
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {t('quiz.question')} {index + 1}
                            </span>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                              {item.question.stem.length > 100
                                ? item.question.stem.substring(0, 100) + '...'
                                : item.question.stem
                              }
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className="text-sm font-medium"
                              style={{
                                color: item.is_correct === true
                                  ? 'var(--fn-success)'
                                  : item.is_correct === false
                                    ? 'var(--fn-error)'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {item.points_earned.toFixed(1)} / {item.question.points}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Question Details */}
                      {isExpanded && (
                        <div
                          className="p-4"
                          style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)' }}
                        >
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                {item.question.stem}
                              </h4>
                              <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                                {item.question.question_type.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label
                                  className="block text-sm font-medium mb-1"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {t('quiz.yourAnswer')}:
                                </label>
                                <div
                                  className="p-3 rounded"
                                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)' }}
                                >
                                  {getAnswerDisplay(item.question, item.student_answer)}
                                </div>
                              </div>

                              {showCorrectAnswer && (
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {t('quiz.correctAnswer')}:
                                  </label>
                                  <div
                                    className="p-3 rounded"
                                    style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
                                  >
                                    {getCorrectAnswerDisplay(item.question)}
                                  </div>
                                </div>
                              )}
                            </div>

                            {item.question.explanation && showCorrectAnswer && (
                              <div>
                                <label
                                  className="block text-sm font-medium mb-1"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {t('quiz.explanation')}:
                                </label>
                                <div
                                  className="p-3 rounded text-sm"
                                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                                >
                                  {item.question.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex justify-center gap-4">
            <Button variant="secondary" onClick={() => navigate(`/courses/${result.quiz.courseId}`)}>
              {t('quiz.backToCourse')}
            </Button>
            <Button onClick={() => navigate('/assignments')}>
              {t('quiz.viewAllAssignments')}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuizResults;
