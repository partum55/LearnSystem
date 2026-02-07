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
  options?: { choices: string[] };
  correct_answer: Record<string, unknown> | string | number | boolean;
  explanation?: string;
  points: number;
}

interface StudentAnswer {
  selected_index?: number;
  value?: boolean;
  text?: string;
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

export const QuizResults: React.FC = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const evaluateAnswer = (
    questionType: string,
    answerValue: unknown,
    correctAnswer: Record<string, unknown> | undefined
  ): { isCorrect: boolean | null; pointsMultiplier: number } => {
    if (!correctAnswer) return { isCorrect: null, pointsMultiplier: 0 };

    const type = questionType.toUpperCase();
    if (type === 'MULTIPLE_CHOICE') {
      const expected = String(correctAnswer.choice ?? '');
      const actual = String(answerValue ?? '');
      const correct = expected.length > 0 && actual === expected;
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'TRUE_FALSE') {
      const expected = Boolean(correctAnswer.value);
      const actual = Boolean(answerValue);
      const correct = actual === expected;
      return { isCorrect: correct, pointsMultiplier: correct ? 1 : 0 };
    }
    if (type === 'FILL_BLANK') {
      const expectedAnswers = Array.isArray(correctAnswer.answers) ? correctAnswer.answers.map(String) : [];
      const provided = answerValue as { answers?: unknown[] } | undefined;
      const actualAnswers = Array.isArray(provided?.answers) ? provided!.answers!.map(String) : [];
      if (!expectedAnswers.length || !actualAnswers.length) return { isCorrect: false, pointsMultiplier: 0 };
      const correctCount = expectedAnswers.filter((ans, idx) => (actualAnswers[idx] || '').trim().toLowerCase() === ans.trim().toLowerCase()).length;
      return { isCorrect: correctCount === expectedAnswers.length, pointsMultiplier: correctCount / expectedAnswers.length };
    }
    // Short answer / essay / code are manually graded in backend
    return { isCorrect: null, pointsMultiplier: 0 };
  };

  const mapAnswerForDisplay = (question: Question, rawAnswer: unknown): StudentAnswer => {
    if (question.question_type === 'MULTIPLE_CHOICE') {
      const choices = question.options?.choices || [];
      const selectedIndex = choices.findIndex((choice) => choice === rawAnswer);
      return selectedIndex >= 0 ? { selected_index: selectedIndex } : { text: String(rawAnswer ?? '') };
    }
    if (question.question_type === 'TRUE_FALSE') {
      return { value: Boolean(rawAnswer) };
    }
    if (question.question_type === 'FILL_BLANK' && typeof rawAnswer === 'object' && rawAnswer !== null) {
      const answers = (rawAnswer as { answers?: string[] }).answers || [];
      return { text: answers[0] || '' };
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

      const questions = (quizData.questions || []).map((quizQuestion) => {
        const apiQuestion = quizQuestion.question;
        const questionId = apiQuestion?.id || quizQuestion.questionId || '';
        const points = Number(quizQuestion.effectivePoints ?? apiQuestion?.points ?? 0);
        const question: Question = {
          id: questionId,
          question_type: apiQuestion?.questionType || 'SHORT_ANSWER',
          stem: apiQuestion?.stem || '',
          options: apiQuestion?.options?.choices ? { choices: apiQuestion.options.choices } : undefined,
          correct_answer: apiQuestion?.correctAnswer || {},
          explanation: apiQuestion?.explanation,
          points,
        };

        const rawAnswer = answersMap[questionId];
        const studentAnswer = mapAnswerForDisplay(question, rawAnswer);
        const evaluation = evaluateAnswer(question.question_type, rawAnswer, apiQuestion?.correctAnswer);
        const pointsEarned = evaluation.isCorrect === null ? 0 : points * evaluation.pointsMultiplier;

        return {
          id: quizQuestion.id,
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

    switch (question.question_type) {
      case 'MULTIPLE_CHOICE':
        if (question.options?.choices && answer.selected_index !== undefined) {
          return question.options.choices[answer.selected_index];
        }
        return t('quiz.noAnswer');

      case 'TRUE_FALSE':
        return answer.value ? t('question.true') : t('question.false');

      case 'FILL_BLANK':
      case 'SHORT_ANSWER':
      case 'ESSAY':
        return answer.text || t('quiz.noAnswer');

      default:
        return JSON.stringify(answer);
    }
  };

  const getCorrectAnswerDisplay = (question: Question) => {
    switch (question.question_type) {
      case 'MULTIPLE_CHOICE':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (question.options?.choices && (question.correct_answer as any)?.index !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return question.options.choices[(question.correct_answer as any).index];
        }
        return '—';

      case 'TRUE_FALSE':
        return (question.correct_answer as { value?: boolean })?.value ? t('question.true') : t('question.false');

      case 'FILL_BLANK':
        if ((question.correct_answer as { answers?: string[] })?.answers) {
          return (question.correct_answer as { answers: string[] }).answers.join(', ');
        }
        return '—';

      case 'SHORT_ANSWER':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((question.correct_answer as any)?.keywords) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return t('quiz.keywordsUsed') + ': ' + (question.correct_answer as any).keywords.join(', ');
        }
        return t('quiz.manuallyGraded');

      case 'ESSAY':
        return t('quiz.manuallyGraded');

      default:
        return '—';
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
              <p className="text-center text-red-600 dark:text-red-400">
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
    result.questions.some(q => ['SHORT_ANSWER', 'ESSAY'].includes(q.question.question_type));

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <Card className="mb-6">
            <CardBody>
              <div className="text-center py-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                  {passed ? (
                    <TrophyIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
                  )}
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {needsManualGrading ? t('quiz.pendingGrading') : passed ? t('quiz.passed') : t('quiz.failed')}
                </h1>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {result.quiz.title}
                </p>

                {/* Score Display */}
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      {result.final_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('quiz.outOf')} {totalPoints}
                    </div>
                  </div>

                  <div className="w-px h-12 bg-gray-300 dark:bg-gray-600" />

                  <div>
                    <div className={`text-4xl font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('quiz.percentage')}
                    </div>
                  </div>
                </div>

                {needsManualGrading && (
                  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {t('quiz.awaitingManualGrading')}
                    </p>
                  </div>
                )}

                {/* Time Info */}
                <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('quiz.instructorFeedback')}
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-gray-700 dark:text-gray-300">{result.feedback}</p>
              </CardBody>
            </Card>
          )}

          {/* Questions Review */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('quiz.questionsReview')}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {result.questions.map((item, index) => {
                  const isExpanded = expandedQuestions.has(item.question.id);
                  const showCorrectAnswer = result.quiz.show_correct_answers;

                  return (
                    <div
                      key={item.question.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => toggleQuestion(item.question.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          {item.is_correct === true ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : item.is_correct === false ? (
                            <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                          ) : (
                            <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                          )}

                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {t('quiz.question')} {index + 1}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.question.stem.length > 100
                                ? item.question.stem.substring(0, 100) + '...'
                                : item.question.stem
                              }
                            </p>
                          </div>

                          <div className="text-right">
                            <span className={`text-sm font-medium ${item.is_correct === true
                              ? 'text-green-600 dark:text-green-400'
                              : item.is_correct === false
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400'
                              }`}>
                              {item.points_earned.toFixed(1)} / {item.question.points}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Question Details */}
                      {isExpanded && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                {item.question.stem}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                {item.question.question_type.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('quiz.yourAnswer')}:
                                </label>
                                <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                                  {getAnswerDisplay(item.question, item.student_answer)}
                                </div>
                              </div>

                              {showCorrectAnswer && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('quiz.correctAnswer')}:
                                  </label>
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                    {getCorrectAnswerDisplay(item.question)}
                                  </div>
                                </div>
                              )}
                            </div>

                            {item.question.explanation && showCorrectAnswer && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('quiz.explanation')}:
                                </label>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
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
