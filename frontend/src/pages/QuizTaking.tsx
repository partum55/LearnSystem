import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Layout, Loading } from '../components';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import apiClient, { extractErrorMessage } from '../api/client';
import { QuizQuestionContent } from './quiz-taking/QuizQuestionContent';
import { QuizTakingNavigation } from './quiz-taking/QuizTakingNavigation';
import { QuizTakingProgress } from './quiz-taking/QuizTakingProgress';
import { QuizTakingStatusHeader } from './quiz-taking/QuizTakingStatusHeader';
import {
  ApiAttemptQuestion,
  ApiQuiz,
  ApiQuizAttempt,
  Quiz,
  QuizAttempt,
  StudentAnswer,
  buildQuizSubmitPayload,
  mapAttemptAnswersFromApi,
  mapAttemptQuestions,
  mapQuizMeta,
} from './quiz-taking/quizTakingModel';

const isMobileBrowser = (): boolean =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

export const QuizTaking: React.FC = () => {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedWarningRef = useRef(false);
  const violationThrottleRef = useRef<Record<string, number>>({});

  const hasUnsavedAnswers = attempt !== null && Object.keys(answers).length > 0 && !submitting;

  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedAnswers,
    message: t(
      'quiz.unsavedWarning',
      'You have a quiz in progress. Leaving will not submit your answers automatically. Are you sure you want to leave?'
    ),
  });

  const getStorageKey = useCallback(
    () => `quiz_answers_${quizId}_${attempt?.id}`,
    [attempt?.id, quizId]
  );

  const saveAnswersToStorage = useCallback(
    (answersToSave: Record<string, StudentAnswer>) => {
      if (!quizId || !attempt?.id) {
        return;
      }

      try {
        localStorage.setItem(
          getStorageKey(),
          JSON.stringify({
            answers: answersToSave,
            savedAt: new Date().toISOString(),
            attemptId: attempt.id,
          })
        );
        setLastSaved(new Date());
      } catch (storageError) {
        console.error('Failed to save answers to storage:', storageError);
      }
    },
    [attempt?.id, getStorageKey, quizId]
  );

  const loadAnswersFromStorage = useCallback(() => {
    if (!quizId || !attempt?.id) {
      return null;
    }

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored) as {
          answers?: Record<string, StudentAnswer>;
          attemptId?: string;
        };
        if (parsed.attemptId === attempt.id) {
          return parsed.answers || null;
        }
      }
    } catch (storageError) {
      console.error('Failed to load answers from storage:', storageError);
    }

    return null;
  }, [attempt?.id, getStorageKey, quizId]);

  const clearStoredAnswers = useCallback(() => {
    if (!quizId || !attempt?.id) {
      return;
    }

    try {
      localStorage.removeItem(getStorageKey());
    } catch (storageError) {
      console.error('Failed to clear stored answers:', storageError);
    }
  }, [attempt?.id, getStorageKey, quizId]);

  const recordViolation = useCallback(
    async (type: string, details?: Record<string, unknown>) => {
      if (!attempt?.id || !quiz?.secure_session_enabled) {
        return;
      }

      const now = Date.now();
      const lastSentAt = violationThrottleRef.current[type] || 0;
      if (now - lastSentAt < 3000) {
        return;
      }
      violationThrottleRef.current[type] = now;

      try {
        await apiClient.post(`/assessments/quiz-attempts/${attempt.id}/violations`, {
          type,
          details: details || {},
        });
      } catch {
        // Ignore telemetry errors.
      }
    },
    [attempt?.id, quiz?.secure_session_enabled]
  );

  useEffect(() => {
    if (!attempt || Object.keys(answers).length === 0) {
      return;
    }

    const saveInterval = setInterval(() => {
      setIsSaving(true);
      saveAnswersToStorage(answers);
      void apiClient
        .post<ApiQuizAttempt>(
          `/assessments/quiz-attempts/${attempt.id}/save`,
          buildQuizSubmitPayload(quiz?.questions || [], answers)
        )
        .then((response) => {
          if (response.data?.submittedAt) {
            clearStoredAnswers();
            navigate(`/quiz/${quizId}/results`);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          setTimeout(() => setIsSaving(false), 500);
        });
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [answers, attempt, clearStoredAnswers, navigate, quiz?.questions, quizId, saveAnswersToStorage]);

  useEffect(() => {
    if (!attempt?.id) {
      return;
    }

    const storedAnswers = loadAnswersFromStorage();
    if (storedAnswers && Object.keys(storedAnswers).length > 0) {
      setAnswers(storedAnswers);
    }
  }, [attempt?.id, loadAnswersFromStorage]);

  const startQuiz = useCallback(async () => {
    if (!quizId) {
      return;
    }

    setLoading(true);
    try {
      const quizResponse = await apiClient.get<ApiQuiz>(`/assessments/quizzes/${quizId}`);
      const quizData = mapQuizMeta(quizResponse.data);

      const inProgressResponse = await apiClient.get<ApiQuizAttempt>(
        `/assessments/quiz-attempts/quiz/${quizId}/user/in-progress`,
        {
          validateStatus: (status: number) => (status >= 200 && status < 300) || status === 204,
        }
      );

      let attemptData: ApiQuizAttempt;
      if (inProgressResponse.status === 200 && inProgressResponse.data?.id) {
        attemptData = inProgressResponse.data;
      } else {
        let startPayload: {
          secureConsent?: boolean;
          startedInFullscreen?: boolean;
          reducedSecurityMode?: boolean;
        } = {};

        if (quizData.secure_session_enabled) {
          const consent = window.confirm(
            t(
              'quiz.secureConsentPrompt',
              'This quiz uses secure-session monitoring (tab/focus/fullscreen checks). Continue?'
            )
          );
          if (!consent) {
            setError(t('quiz.secureConsentRequired', 'Secure-session consent is required to start this quiz.'));
            setLoading(false);
            return;
          }

          const mobile = isMobileBrowser();
          let startedInFullscreen = false;
          if (quizData.secure_require_fullscreen && !mobile) {
            try {
              await document.documentElement.requestFullscreen();
              startedInFullscreen = Boolean(document.fullscreenElement);
            } catch {
              startedInFullscreen = false;
            }
            if (!startedInFullscreen) {
              setError(
                t(
                  'quiz.fullscreenRequired',
                  'Fullscreen is required for this secure quiz. Please enable fullscreen and try again.'
                )
              );
              setLoading(false);
              return;
            }
          }

          startPayload = {
            secureConsent: true,
            startedInFullscreen,
            reducedSecurityMode: mobile,
          };
        }

        const startedAttempt = await apiClient.post<ApiQuizAttempt>(
          `/assessments/quiz-attempts/quiz/${quizId}/start`,
          startPayload
        );
        attemptData = startedAttempt.data;
      }

      if (attemptData.submittedAt) {
        navigate(`/quiz/${quizId}/results`);
        return;
      }

      const attemptQuestionsResponse = await apiClient.get<ApiAttemptQuestion[]>(
        `/assessments/quiz-attempts/${attemptData.id}/questions`
      );
      const mappedAttemptQuestions = mapAttemptQuestions(
        Array.isArray(attemptQuestionsResponse.data) ? attemptQuestionsResponse.data : []
      );

      const completeQuiz: Quiz = {
        ...quizData,
        questions: mappedAttemptQuestions,
      };

      setQuiz(completeQuiz);
      setAttempt({
        id: attemptData.id,
        attempt_number: attemptData.attemptNumber,
        started_at: attemptData.startedAt,
        submitted_at: attemptData.submittedAt,
        expires_at: attemptData.expiresAt,
        remaining_seconds: attemptData.remainingSeconds,
        timed_out: attemptData.timedOut,
        proctoring_data: attemptData.proctoringData,
        answers: {},
      });

      if (typeof attemptData.remainingSeconds === 'number') {
        setTimeRemaining(Math.max(0, Math.floor(attemptData.remainingSeconds)));
      } else if (completeQuiz.timer_enabled && completeQuiz.time_limit) {
        setTimeRemaining(completeQuiz.time_limit * 60);
      } else {
        setTimeRemaining(null);
      }

      const restoredAnswers = mapAttemptAnswersFromApi(completeQuiz, attemptData.answers);
      if (Object.keys(restoredAnswers).length > 0) {
        setAnswers(restoredAnswers);
      }
    } catch (startError) {
      setError(extractErrorMessage(startError) || t('quiz.errors.startFailed'));
    } finally {
      setLoading(false);
    }
  }, [navigate, quizId, t]);

  useEffect(() => {
    if (quizId) {
      void startQuiz();
    }
  }, [quizId, startQuiz]);

  useEffect(() => {
    if (!quiz?.secure_session_enabled || !attempt?.id) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void recordViolation('tab_hidden', { visibilityState: document.visibilityState });
      }
    };

    const onWindowBlur = () => {
      void recordViolation('focus_lost', { hasFocus: document.hasFocus() });
    };

    const onFullscreenChange = () => {
      if (quiz.secure_require_fullscreen && !isMobileBrowser() && !document.fullscreenElement) {
        void recordViolation('fullscreen_exit', { fullscreenElement: false });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [attempt?.id, quiz?.secure_require_fullscreen, quiz?.secure_session_enabled, recordViolation]);

  const handleAnswerChange = (questionId: string, answer: StudentAnswer) => {
    const nextAnswers = {
      ...answers,
      [questionId]: answer,
    };
    setAnswers(nextAnswers);
    saveAnswersToStorage(nextAnswers);
  };

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting) {
      return;
    }

    const unansweredCount = (quiz?.questions.length || 0) - Object.keys(answers).length;
    if (unansweredCount > 0 && timeRemaining !== 0) {
      const confirmSubmit = window.confirm(t('quiz.confirmSubmitWithUnanswered', { count: unansweredCount }));
      if (!confirmSubmit) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const answerPayload = buildQuizSubmitPayload(quiz?.questions || [], answers);
      await apiClient.post(`/assessments/quiz-attempts/${attempt.id}/submit`, answerPayload);

      clearStoredAnswers();
      navigate(`/quiz/${quizId}/results`);
    } catch (submitError) {
      setError(extractErrorMessage(submitError) || t('quiz.errors.submitFailed'));
      setSubmitting(false);
    }
  }, [answers, attempt, clearStoredAnswers, navigate, quiz?.questions, quizId, submitting, t, timeRemaining]);

  useEffect(() => {
    if (!quiz?.timer_enabled || timeRemaining === null) {
      return;
    }

    if (timeRemaining === 300 && !hasPlayedWarningRef.current) {
      setShowTimeWarning(true);
      hasPlayedWarningRef.current = true;
      try {
        audioRef.current = new Audio(
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JjYuGfnV1e4OKjYyHf3Z0eYKKjYyIgHh2eoOKjYyJgXl3e4OLjYyJgXl4e4OLjYyJgXl4e4OLjIyJgHl4eoKLjIyJgHl4eoKLjIyKgHl4eoKLjIyKgHp5eoKLjIyKgHp5eoKKjIyKgHp5eoKKjIyKgHp5eoKKjIyKgHp5eoKKi4uKf3p5eoKKi4uKf3p5eoKKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKi4uKf3p5eoGKioqKf3p5eoGKioqKf3p5eoGKioqKf3p5eoGKioqKf3p5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYGKioqKfnp5eYCKioqKfnp5eYCJioqJfnp5eYCJioqJfnp5eYCJioqJfnp4eYCJioqJfXp4eYCJioqJfXp4eICJioqJfXp4eICJioqJfXp4eICJioqJfXp4eICJiomJfXp4d4CJiomJfXl4d4CJiomJfXl4d4CJiomIfXl4d4CJiomIfXl3d4CJiomIfXl3d3+JiomIfXl3d3+JiYmIfXl3d3+JiYmIfXl3d3+JiYmIfXl3dn+JiYmIfHl3dn+JiYmIfHl2dn+JiYmHfHl2dn+IiYmHfHl2dn+IiYmHfHh2dn+IiYmHfHh2dn+IiYiHfHh2dn6IiYiHe3h2dn6IiYiHe3h2dn6IiYiHe3h1dn6IiYiHe3h1dn6IiIiHe3h1dX6IiIiHe3h1dX6IiIiGe3h1dX6IiIiGe3h1dX6IiIiGe3d1dX6IiIiGend1dX2HiIiGend1dX2HiIiFend0dX2HiIiFend0dX2HiIiFend0dH2HiIiFend0dH2HiIiFend0dH2Hh4iFend0dH2Hh4iFend0dH2Hh4iEendzdH2Hh4iEeXdzdH2Gh4iEeXdzdHyGh4iEeXdzdHyGh4iEeXdzdHyGh4eDOA=='
        );
        void audioRef.current.play().catch(() => undefined);
      } catch {
        // Ignore audio errors
      }
      setTimeout(() => setShowTimeWarning(false), 5000);
    }

    const timer = setInterval(() => {
      setTimeRemaining((previous) => {
        if (previous === null || previous <= 0) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz?.timer_enabled, timeRemaining]);

  useEffect(() => {
    if (timeRemaining === 0 && !submitting && attempt) {
      void handleSubmit();
    }
  }, [attempt, handleSubmit, submitting, timeRemaining]);

  if (loading) {
    return <Loading />;
  }

  if (!quiz || !attempt) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardBody>
              <p className="text-center" style={{ color: 'var(--fn-error)' }}>
                {error || t('quiz.errors.notFound')}
              </p>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <Layout>
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        title={t('quiz.leaveQuiz', 'Leave Quiz?')}
        message={t(
          'quiz.unsavedWarning',
          'You have a quiz in progress. Your answers are saved locally, but leaving without submitting may affect your score. Are you sure you want to leave?'
        )}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <QuizTakingStatusHeader
            showTimeWarning={showTimeWarning}
            quiz={quiz}
            attempt={attempt}
            timeRemaining={timeRemaining}
            lastSaved={lastSaved}
            isSaving={isSaving}
            t={t}
          />

          {quiz.secure_session_enabled && (
            <div
              className="mb-4 rounded-md p-3 text-sm"
              style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: 'var(--text-secondary)' }}
            >
              {t(
                'quiz.secureSessionActive',
                'Secure session is active: tab changes and focus/fullscreen exits are logged for instructors.'
              )}
            </div>
          )}

          <QuizTakingProgress
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            answeredCount={answeredCount}
            t={t}
          />

          {error && (
            <div className="mb-6 rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
            </div>
          )}

          <Card className="mb-6">
            <CardBody>
              {currentQuestion ? (
                <QuizQuestionContent
                  question={currentQuestion.question}
                  currentAnswer={answers[currentQuestion.id]}
                  onAnswerChange={handleAnswerChange}
                  t={t}
                />
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('quiz.noQuestions', 'No questions available for this attempt.')}
                </p>
              )}
            </CardBody>
          </Card>

          <QuizTakingNavigation
            questions={quiz.questions}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            submitting={submitting}
            onPrevious={() => setCurrentQuestionIndex((previous) => Math.max(0, previous - 1))}
            onNext={() =>
              setCurrentQuestionIndex((previous) =>
                Math.min(quiz.questions.length - 1, previous + 1)
              )
            }
            onJumpToQuestion={setCurrentQuestionIndex}
            onSubmit={() => void handleSubmit()}
            t={t}
          />
        </div>
      </div>
    </Layout>
  );
};

export default QuizTaking;
