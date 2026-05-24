'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useActiveQuizAttempt,
  useQuizAttemptReview,
  useSubmitQuizAttempt,
} from '../hooks/useQuizAttemptQueries';
import { Loading } from '@/components/Loading';
import {
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { RichContentEditor } from '@/features/rich-content/components/RichContentEditor';
import { RichContentRenderer } from '@/features/rich-content/components/RichContentRenderer';
import { markdownToRichContent } from '@/features/rich-content/markdown-parser';
import type { RichContentDocument } from '@/features/rich-content/rich-content.types';

interface QuizAttemptPageProps {
  attemptId: string;
}

interface Choice {
  key: string;
  text: string;
}

const getChoices = (options: Record<string, unknown> | undefined): Choice[] => {
  if (!options) return [];
  const rawChoices = (options.choices || options.options || options.answers || []) as unknown[];
  if (Array.isArray(rawChoices)) {
    return rawChoices.map((c, index) => {
      if (typeof c === 'string') {
        return { key: c, text: c };
      }
      if (c && typeof c === 'object') {
        const o = c as Record<string, unknown>;
        const key = String(o.id || o.key || o.value || o.code || index);
        const text = String(o.text || o.label || o.value || key);
        return { key, text };
      }
      return { key: String(index), text: String(c) };
    });
  }
  if (typeof rawChoices === 'object' && rawChoices !== null) {
    return Object.entries(rawChoices).map(([k, v]) => ({
      key: k,
      text: String(v),
    }));
  }
  return [];
};

export function QuizAttemptPage({ attemptId }: QuizAttemptPageProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Queries
  const {
    data: activeAttempt,
    isLoading: activeLoading,
    error: activeError,
    refetch: refetchActive,
  } = useActiveQuizAttempt(attemptId);

  const isSubmitted = activeAttempt?.status?.toLowerCase() === 'submitted';

  const {
    data: reviewAttempt,
    isLoading: reviewLoading,
    error: reviewError,
  } = useQuizAttemptReview(isSubmitted ? attemptId : undefined);

  const submitAttempt = useSubmitQuizAttempt();

  const handleAnswerChange = useCallback((questionId: string, answerValue: unknown) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: answerValue };
      localStorage.setItem(`quiz_attempt_${attemptId}`, JSON.stringify(updated));
      return updated;
    });
  }, [attemptId]);

  const handleAutoSubmit = useCallback(async () => {
    try {
      setSubmitError(null);
      const payloadAnswers: Record<string, unknown> = {};
      
      activeAttempt?.questions.forEach((q) => {
        payloadAnswers[q.questionId] = answers[q.questionId] ?? null;
      });

      await submitAttempt.mutateAsync({
        attemptId,
        request: { answers: payloadAnswers },
      });
      localStorage.removeItem(`quiz_attempt_${attemptId}`);
      void refetchActive();
    } catch (err) {
      console.error('Auto-submit failed', err);
    }
  }, [activeAttempt, answers, attemptId, refetchActive, submitAttempt]);

  const handleSubmit = useCallback(async () => {
    if (!activeAttempt) return;
    try {
      setSubmitError(null);
      const payloadAnswers: Record<string, unknown> = {};
      
      activeAttempt.questions.forEach((q) => {
        payloadAnswers[q.questionId] = answers[q.questionId] ?? null;
      });

      await submitAttempt.mutateAsync({
        attemptId,
        request: { answers: payloadAnswers },
      });
      localStorage.removeItem(`quiz_attempt_${attemptId}`);
      setShowConfirm(false);
      void refetchActive();
    } catch (err) {
      const error = err as { message?: string };
      setSubmitError(error.message || 'Failed to submit quiz attempt. Please try again.');
    }
  }, [activeAttempt, answers, attemptId, refetchActive, submitAttempt]);

  // Load drafts and synchronize state
  useEffect(() => {
    if (activeAttempt && !isSubmitted) {
      const initialAnswers: Record<string, unknown> = {};
      activeAttempt.questions.forEach((q) => {
        if (q.studentAnswer !== undefined && q.studentAnswer !== null) {
          initialAnswers[q.questionId] = q.studentAnswer;
        }
      });

      const savedDraft = localStorage.getItem(`quiz_attempt_${attemptId}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as Record<string, unknown>;
          Object.assign(initialAnswers, parsed);
        } catch (e) {
          console.error('Failed to parse draft answers', e);
        }
      }
      setAnswers(initialAnswers);
    }
  }, [activeAttempt, attemptId, isSubmitted]);

  // Timer effect
  useEffect(() => {
    if (activeAttempt && !isSubmitted && activeAttempt.remainingSeconds !== undefined && activeAttempt.remainingSeconds !== null) {
      setTimeLeft(activeAttempt.remainingSeconds);
    }
  }, [activeAttempt, isSubmitted]);

  const hasTriggeredAutoSubmit = useRef(false);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasTriggeredAutoSubmit.current) {
            hasTriggeredAutoSubmit.current = true;
            void handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, handleAutoSubmit]);

  if (activeLoading || (isSubmitted && reviewLoading)) {
    return <Loading label="Loading quiz details..." />;
  }

  if (activeError || (isSubmitted && reviewError)) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] shadow-sm mt-8">
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--fn-error)' }} />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Error Loading Quiz</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              There was an issue loading the quiz attempt details. It might have expired or you may not have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // REVIEW VIEW
  // ----------------------------------------------------
  if (isSubmitted && reviewAttempt) {
    const totalPoints = activeAttempt?.questions.reduce((sum, q) => sum + q.points, 0) || 10;
    const finalScore = reviewAttempt.finalScore;
    const showScore = finalScore !== undefined && finalScore !== null;

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Scorecard Header */}
        <div className="card">
          <div className="card-body flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <span className="badge badge-success inline-flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4" /> Submitted
              </span>
              <h1 className="text-2xl font-semibold md:text-3xl">
                {activeAttempt?.quizTitle || 'Quiz Review'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Attempt #{reviewAttempt.attemptNumber} completed.
              </p>
            </div>

            {showScore ? (
              <div className="flex shrink-0 items-center gap-4 rounded-md border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                <div className="text-right">
                  <span className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Your Grade</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-semibold">{finalScore.toFixed(2)}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/ {totalPoints.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-10 w-px" style={{ background: 'var(--border-subtle)' }} />
                <div className="rounded-md border px-3 py-1.5 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <span className="block text-2xl font-semibold" style={{ color: 'var(--fn-success)' }}>
                    {Math.round((finalScore / totalPoints) * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex max-w-sm shrink-0 items-center gap-3 rounded-md border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                <InformationCircleIcon className="h-6 w-6 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Quiz attempt submitted! Grades will be released by the instructor.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Questions Review */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Quiz Question Summary</h2>
            <span className="text-sm text-[var(--text-muted)] font-medium">
              {activeAttempt?.questions.length} Questions
            </span>
          </div>

          {!reviewAttempt.correctAnswersVisible && (
            <div className="flex gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-[var(--text-secondary)]">
              <InformationCircleIcon className="h-5 w-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <p className="text-sm">
                Correct answers and question scoring details are currently hidden by the instructor.
              </p>
            </div>
          )}

          {activeAttempt?.questions.map((question, idx) => {
            const studentAns = reviewAttempt.answers[question.questionId] ?? reviewAttempt.answers[question.questionId];
            const choices = getChoices(question.options);
            
            return (
              <div
                key={question.questionId}
                className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm transition hover:shadow-md"
              >
                <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">
                    Question {idx + 1}
                  </span>
                  <span className="rounded-md bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {question.points} Points
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-base text-[var(--text-primary)] font-medium whitespace-pre-wrap">
                    {question.text}
                  </p>

                  {/* Render Options */}
                  {choices.length > 0 ? (
                    <div className="grid gap-2.5">
                      {choices.map((choice) => {
                        const isStudentSelected = Array.isArray(studentAns)
                          ? studentAns.includes(choice.key)
                          : String(studentAns) === String(choice.key);

                        let optionStyle = 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]';
                        if (isStudentSelected) {
                          optionStyle = 'border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--text-primary)] font-medium';
                        }

                        return (
                          <div
                            key={choice.key}
                            className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm transition ${optionStyle}`}
                          >
                            <span className={`h-4 w-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center text-[10px] ${
                              isStudentSelected ? 'border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--text-primary)]' : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                            }`}>
                              {isStudentSelected && '✓'}
                            </span>
                            <span>{choice.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Free Text Essay Display */
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                      <RichContentRenderer document={studentAns as RichContentDocument | string | null} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ACTIVE QUIZ-TAKING VIEW
  // ----------------------------------------------------
  if (!activeAttempt || activeAttempt.questions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-[var(--text-muted)]">
        No questions found for this quiz attempt.
      </div>
    );
  }

  const currentQuestion = activeAttempt.questions[currentIdx];
  const choices = getChoices(currentQuestion.options);
  const currentAnswer = answers[currentQuestion.questionId];

  const answeredCount = activeAttempt.questions.filter((q) => answers[q.questionId] !== undefined && answers[q.questionId] !== null && answers[q.questionId] !== '').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Sticky Active Taking Header */}
      <div className="sticky top-0 z-20 mb-6 rounded-lg border p-5 shadow-lg" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--fn-error)' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--fn-error)' }}></span>
              </span>
              {activeAttempt.quizTitle}
            </h1>
            <p className="text-xs text-[var(--text-faint)] mt-0.5">
              Attempt #{activeAttempt.attemptNumber} • Active Session
            </p>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border font-mono font-bold shrink-0 ${
              timeLeft < 60 ? 'animate-pulse bg-[var(--bg-elevated)] border-[var(--fn-error)] text-[var(--fn-error)]' : 'bg-[var(--bg-surface)]/5 border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}>
              <ClockIcon className="h-5 w-5 shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Map Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3.5">
              Quiz Navigation
            </h3>
            
            <div className="grid grid-cols-5 gap-2">
              {activeAttempt.questions.map((q, idx) => {
                const isSelected = idx === currentIdx;
                const isAnswered = answers[q.questionId] !== undefined && answers[q.questionId] !== null && answers[q.questionId] !== '';
                
                let btnStyle = 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]';
                if (isSelected) {
                  btnStyle = 'border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--text-primary)] font-bold';
                } else if (isAnswered) {
                  btnStyle = 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold';
                }

                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIdx(idx)}
                    className={`aspect-square w-full rounded-lg border text-xs flex items-center justify-center transition cursor-pointer relative ${btnStyle}`}
                  >
                    {idx + 1}
                    {isAnswered && !isSelected && (
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--fn-success)' }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4 flex flex-col gap-3">
              <div className="flex justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Progress</span>
                <span>{answeredCount} of {activeAttempt.questions.length} answered</span>
              </div>
              
              <button
                onClick={() => setShowConfirm(true)}
                className="btn btn-primary w-full justify-center"
              >
                Submit Quiz Attempt
              </button>
            </div>
          </div>
        </div>

        {/* Question Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Question {currentIdx + 1} of {activeAttempt.questions.length}
              </span>
              <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                {currentQuestion.points} points
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-base text-[var(--text-primary)] font-medium whitespace-pre-wrap leading-relaxed">
                {currentQuestion.text}
              </p>

              {/* Rendering inputs depending on types */}
              {choices.length > 0 ? (
                <div className="grid gap-2.5">
                  {choices.map((choice) => {
                    const isChecked = Array.isArray(currentAnswer)
                      ? currentAnswer.includes(choice.key)
                      : String(currentAnswer) === String(choice.key);

                    const isMultiSelect = currentQuestion.type.toLowerCase().includes('multi');

                    const handleSelectOption = () => {
                      if (isMultiSelect) {
                        const currentList = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                        if (currentList.includes(choice.key)) {
                          handleAnswerChange(currentQuestion.questionId, currentList.filter(k => k !== choice.key));
                        } else {
                          handleAnswerChange(currentQuestion.questionId, [...currentList, choice.key]);
                        }
                      } else {
                        handleAnswerChange(currentQuestion.questionId, choice.key);
                      }
                    };

                    let boxStyle = 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-base)]';
                    if (isChecked) {
                      boxStyle = 'border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--text-primary)] font-medium';
                    }

                    return (
                      <button
                        key={choice.key}
                        onClick={handleSelectOption}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-sm text-left transition cursor-pointer w-full ${boxStyle}`}
                      >
                        <span className={`h-4.5 w-4.5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center text-[10px] ${
                          isChecked ? 'border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                        }`}>
                          {isChecked && '✓'}
                        </span>
                        <span>{choice.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Text Input Panel */
                <div style={{ paddingTop: '4px' }}>
                  <RichContentEditor
                    value={
                      currentAnswer && typeof currentAnswer === 'object'
                        ? (currentAnswer as RichContentDocument)
                        : currentAnswer
                        ? markdownToRichContent(String(currentAnswer))
                        : { version: 1, blocks: [] }
                    }
                    onChange={(doc) => handleAnswerChange(currentQuestion.questionId, doc)}
                    placeholder="Start writing your response… or type / to insert a block"
                  />
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => prev - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeftIcon className="h-4.5 w-4.5" /> Previous
              </button>

              <button
                disabled={currentIdx === activeAttempt.questions.length - 1}
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                className="btn btn-secondary btn-sm"
              >
                Next <ChevronRightIcon className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Overlay Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'color-mix(in srgb, var(--bg-base) 78%, transparent)' }}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <InformationCircleIcon className="h-6 w-6 text-[var(--text-primary)] shrink-0" /> Submit Quiz Attempt?
            </h3>
            
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to submit your quiz answers? You have answered <strong>{answeredCount}</strong> of <strong>{activeAttempt.questions.length}</strong> questions.
            </p>

            {submitError && (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--fn-error)]">
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSubmitError(null);
                }}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] cursor-pointer"
              >
                Go Back
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitAttempt.isPending}
                className="btn btn-primary"
              >
                {submitAttempt.isPending ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
