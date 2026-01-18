import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardHeader, CardBody, Button, Loading } from '../components';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import apiClient from '../api/client';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedWarningRef = useRef(false);

  // Track if user has unsaved answers (quiz in progress)
  const hasUnsavedAnswers = attempt !== null && Object.keys(answers).length > 0 && !submitting;

  // Unsaved changes warning for navigation
  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedAnswers,
    message: t('quiz.unsavedWarning', 'You have a quiz in progress. Leaving will not submit your answers automatically. Are you sure you want to leave?'),
  });

  // Storage key for answer persistence
  const getStorageKey = () => `quiz_answers_${quizId}_${attempt?.id}`;

  // Save answers to localStorage
  const saveAnswersToStorage = useCallback((answersToSave: Record<string, any>) => {
    if (!quizId || !attempt?.id) return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify({
        answers: answersToSave,
        savedAt: new Date().toISOString(),
        attemptId: attempt.id,
      }));
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save answers to storage:', e);
    }
  }, [quizId, attempt?.id]);

  // Load answers from localStorage on mount
  const loadAnswersFromStorage = useCallback(() => {
    if (!quizId || !attempt?.id) return null;
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.attemptId === attempt.id) {
          return parsed.answers;
        }
      }
    } catch (e) {
      console.error('Failed to load answers from storage:', e);
    }
    return null;
  }, [quizId, attempt?.id]);

  // Clear stored answers
  const clearStoredAnswers = useCallback(() => {
    if (!quizId || !attempt?.id) return;
    try {
      localStorage.removeItem(getStorageKey());
    } catch (e) {
      console.error('Failed to clear stored answers:', e);
    }
  }, [quizId, attempt?.id]);

  // Auto-save answers periodically
  useEffect(() => {
    if (!attempt || Object.keys(answers).length === 0) return;

    const saveInterval = setInterval(() => {
      setIsSaving(true);
      saveAnswersToStorage(answers);
      setTimeout(() => setIsSaving(false), 500);
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [answers, attempt, saveAnswersToStorage]);

  // Load stored answers when attempt is ready
  useEffect(() => {
    if (attempt?.id) {
      const storedAnswers = loadAnswersFromStorage();
      if (storedAnswers && Object.keys(storedAnswers).length > 0) {
        setAnswers(storedAnswers);
      }
    }
  }, [attempt?.id, loadAnswersFromStorage]);

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
    const newAnswers = {
      ...answers,
      [questionId]: answer,
    };
    setAnswers(newAnswers);
    // Save immediately on answer change
    saveAnswersToStorage(newAnswers);
  };

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting) return;

    const unansweredCount = (quiz?.questions.length || 0) - Object.keys(answers).length;
    if (unansweredCount > 0 && timeRemaining !== 0) {
      // Don't show confirm on auto-submit (time = 0)
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

      // Clear stored answers on successful submit
      clearStoredAnswers();

      // Navigate to results page
      navigate(`/quiz/${quizId}/attempt/${attempt.id}/results`);
    } catch (err: any) {
      setError(err.response?.data?.error || t('quiz.errors.submitFailed'));
      setSubmitting(false);
    }
  }, [attempt, submitting, quiz?.questions.length, answers, t, navigate, quizId, timeRemaining, clearStoredAnswers]);

  // Timer countdown with warning
  useEffect(() => {
    if (!quiz?.time_limit || timeRemaining === null) return;

    // Show warning at 5 minutes and play sound
    if (timeRemaining === 300 && !hasPlayedWarningRef.current) {
      setShowTimeWarning(true);
      hasPlayedWarningRef.current = true;
      // Play warning sound
      try {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JjYuGfnV1e4OKjYyHf3Z0eYKKjYyIgHh2eoOKjYyJgXl3e4OLjYyJgXl4e4OLjYyJgXl4e4OLjIyJgHl4eoKLjIyJgHl4eoKLjIyKgHl4eoKLjIyKgHp5eoKLjIyKgHp5eoKKjIyKgHp5eoKKjIyKgHp5eoKKjIyKgHp5eoKKi4uKf3p5eoKKi4uKf3p5eoKKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKioqKf3p5eoGKioqKf3p5eoGKioqKf3p5eoGKioqKf3p5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYCKioqKfnp5eYCJioqJfnp5eYCJioqJfnp5eYCJioqJfnp4eYCJioqJfXp4eYCJioqJfXp4eICJioqJfXp4eICJioqJfXp4eICJioqJfXp4eICJiomJfXp4d4CJiomJfXl4d4CJiomJfXl4d4CJiomIfXl4d4CJiomIfXl3d4CJiomIfXl3d3+JiomIfXl3d3+JiomIfXl3d3+JiYmIfXl3d3+JiYmIfXl3d3+JiYmIfXl3dn+JiYmIfHl3dn+JiYmIfHl2dn+JiYmHfHl2dn+IiYmHfHl2dn+IiYmHfHh2dn+IiYmHfHh2dn+IiYiHfHh2dn6IiYiHe3h2dn6IiYiHe3h2dn6IiYiHe3h1dn6IiYiHe3h1dn6IiIiHe3h1dX6IiIiHe3h1dX6IiIiGe3h1dX6IiIiGe3h1dX6IiIiGe3d1dX6IiIiGend1dX6HiIiGend1dX2HiIiGend1dX2HiIiFend0dX2HiIiFend0dX2HiIiFend0dH2HiIiFend0dH2HiIiFend0dH2Hh4iFend0dH2Hh4iFend0dH2Hh4iEendzdH2Hh4iEeXdzdH2Gh4iEeXdzdHyGh4iEeXdzdHyGh4iEeXdzdHyGh4eDOA==');
        audioRef.current.play().catch(() => {}); // Ignore if autoplay blocked
      } catch (e) {}
      // Hide warning after 5 seconds
      setTimeout(() => setShowTimeWarning(false), 5000);
    }

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
      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        title={t('quiz.leaveQuiz', 'Leave Quiz?')}
        message={t('quiz.unsavedWarning', 'You have a quiz in progress. Your answers are saved locally, but leaving without submitting may affect your score. Are you sure you want to leave?')}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            {/* Time Warning Banner */}
            {showTimeWarning && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-3 animate-pulse">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    {t('quiz.timeWarning', '⚠️ Only 5 minutes remaining!')}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {t('quiz.timeWarningHint', 'Please review your answers and submit soon.')}
                  </p>
                </div>
              </div>
            )}

            {/* Quiz Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {quiz.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('quiz.attemptNumber')} {attempt.attempt_number}
                      </p>
                      {/* Auto-save indicator */}
                      {lastSaved && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          {isSaving ? (
                            <>
                              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                              {t('quiz.saving', 'Saving...')}
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-3 w-3" />
                              {t('quiz.answersSaved', 'Answers saved')}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {timeRemaining !== null && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      timeRemaining < 300 
                        ? 'bg-red-100 dark:bg-red-900/30 animate-pulse' 
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      <ClockIcon className={`h-5 w-5 ${
                        timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`} />
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

