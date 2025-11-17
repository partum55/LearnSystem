import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardHeader, CardBody, Button, Loading } from '../components';
import apiClient from '../api/client';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  options?: { choices: string[] };
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  questions: Array<{ id: string; question: Question; position: number }>;
}

interface QuizAttempt {
  id: string;
  attempt_number: number;
  started_at: string;
  answers: Record<string, any>;
}

export const QuizTaking: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');


  const startQuiz = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      // Fetch quiz details
      const quizResponse = await apiClient.get(`/assessments/quizzes/${quizId}/`);
      const quizData = quizResponse.data as any;
      setQuiz(quizData);

      // Start attempt
      const attemptResponse = await apiClient.post(`/assessments/quizzes/${quizId}/start_attempt/`);
      const attemptData = attemptResponse.data as any;
      setAttempt(attemptData);

      // Initialize timer
      if (quizData.time_limit) {
        setTimeRemaining(quizData.time_limit * 60); // Convert minutes to seconds
      }

      // Shuffle questions if needed
      if (quizData.shuffle_questions) {
        const shuffled = [...quizData.questions].sort(() => Math.random() - 0.5);
        setQuiz({ ...quizData, questions: shuffled });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('quiz.errors.startFailed'));
    } finally {
      setLoading(false);
    }
  }, [quizId, t]);

  useEffect(() => {
    if (quizId) {
      startQuiz();
    }
  }, [quizId, startQuiz]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting) return;

    const unansweredCount = (quiz?.questions.length || 0) - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        t('quiz.confirmSubmitWithUnanswered', { count: unansweredCount })
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/assessments/attempts/${attempt.id}/submit/`, {
        answers,
      });

      // Navigate to results page
      navigate(`/quiz/${quizId}/attempt/${attempt.id}/results`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('quiz.errors.submitFailed'));
      setSubmitting(false);
    }
  }, [attempt, submitting, quiz?.questions.length, answers, t, navigate, quizId]);

  // Timer countdown
  useEffect(() => {
    if (!quiz?.time_limit || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeRemaining]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !submitting && attempt) {
      handleSubmit();
    }
  }, [timeRemaining, submitting, attempt, handleSubmit]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (quizQuestion: any) => {
    const question = quizQuestion.question;
    const questionId = question.id;
    const currentAnswer = answers[questionId];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {question.stem}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {question.points} {t('quiz.points')}
          </span>
        </div>

        {question.question_type === 'MULTIPLE_CHOICE' && question.options?.choices && (
          <div className="space-y-2">
            {question.options.choices.map((choice: string, index: number) => (
              <label
                key={index}
                className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="radio"
                  name={questionId}
                  checked={currentAnswer?.selected_index === index}
                  onChange={() => handleAnswerChange(questionId, { selected_index: index })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-900 dark:text-white">{choice}</span>
              </label>
            ))}
          </div>
        )}

        {question.question_type === 'TRUE_FALSE' && (
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="radio"
                name={questionId}
                checked={currentAnswer?.value === true}
                onChange={() => handleAnswerChange(questionId, { value: true })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 dark:text-white">{t('question.true')}</span>
            </label>
            <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="radio"
                name={questionId}
                checked={currentAnswer?.value === false}
                onChange={() => handleAnswerChange(questionId, { value: false })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 dark:text-white">{t('question.false')}</span>
            </label>
          </div>
        )}

        {question.question_type === 'FILL_BLANK' && (
          <input
            type="text"
            value={currentAnswer?.text || ''}
            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('question.enterAnswer')}
          />
        )}

        {question.question_type === 'SHORT_ANSWER' && (
          <textarea
            value={currentAnswer?.text || ''}
            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('question.enterAnswer')}
          />
        )}

        {question.question_type === 'ESSAY' && (
          <textarea
            value={currentAnswer?.text || ''}
            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
            rows={10}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('question.enterEssay')}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!quiz || !attempt) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardBody>
              <p className="text-center text-red-600 dark:text-red-400">{error || t('quiz.errors.notFound')}</p>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            {/* Quiz Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {quiz.title}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('quiz.attemptNumber')} {attempt.attempt_number}
                    </p>
                  </div>
                  {timeRemaining !== null && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className={`text-lg font-semibold ${
                        timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>
                  {t('quiz.question')} {currentQuestionIndex + 1} {t('quiz.of')} {quiz.questions.length}
                </span>
                <span>
                  {t('quiz.answered')}: {answeredCount} / {quiz.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Question */}
            <Card className="mb-6">
              <CardBody>
                {renderQuestion(currentQuestion)}
              </CardBody>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                {t('common.previous')}
              </Button>

              <div className="flex gap-2">
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-blue-600 text-white'
                        : answers[quiz.questions[index].question.id]
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  isLoading={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {t('quiz.submitQuiz')}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                >
                  {t('common.next')}
                </Button>
              )}
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuizTaking;

