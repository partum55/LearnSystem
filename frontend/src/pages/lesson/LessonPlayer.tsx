import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLesson, useLessonProgress, useCompleteStep } from '../../queries/useLessonQueries';
import { DocumentRenderer } from '../../features/editor-core/DocumentRenderer';
import { parseCanonicalDocument } from '../../features/editor-core';
import { Layout } from '../../components';
import { Loading } from '../../components';
import { LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const LessonPlayer: React.FC = () => {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: progress, refetch: refetchProgress } = useLessonProgress(lessonId);
  const completeStep = useCompleteStep();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  if (isLoading) return <Layout><Loading /></Layout>;
  if (!lesson) return <Layout><div style={{ color: 'var(--text-muted)' }}>{t('lesson.notFound', 'Lesson not found')}</div></Layout>;

  const steps = lesson.steps || [];
  const activeStep = steps[activeStepIndex];
  const progressSteps = progress?.steps || [];

  const isStepUnlocked = (index: number) => {
    if (index === 0) return true;
    const ps = progressSteps[index];
    return ps?.unlocked ?? false;
  };

  const isStepCompleted = (index: number) => {
    const ps = progressSteps[index];
    return ps?.completed ?? false;
  };

  const handleCompleteAndNext = async () => {
    if (!activeStep || !lessonId) return;
    try {
      await completeStep.mutateAsync({ lessonId, stepId: activeStep.id });
      await refetchProgress();
      if (activeStepIndex < steps.length - 1) {
        setActiveStepIndex(activeStepIndex + 1);
      }
    } catch (err) {
      console.error('Failed to complete step', err);
    }
  };

  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizChecked, setQuizChecked] = useState(false);

  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setQuizChecked(false);
  };

  const renderStepContent = () => {
    if (!activeStep) return null;

    if (activeStep.blockType === 'TEXT') {
      let doc;
      try {
        doc = parseCanonicalDocument(activeStep.content);
      } catch {
        doc = null;
      }
      return doc ? (
        <DocumentRenderer document={doc} />
      ) : (
        <div className="prose" style={{ color: 'var(--text-primary)' }}>
          {activeStep.content}
        </div>
      );
    }

    if (activeStep.blockType === 'QUIZ') {
      const questions = activeStep.questions || [];
      return (
        <div className="space-y-6">
          {questions.map((q: Record<string, unknown>, qIndex: number) => {
            const qId = String(q.id || qIndex);
            const qType = String(q.type || 'MCQ');
            const prompt = String(q.prompt || q.stem || '');
            const options = (q.options as Array<Record<string, unknown>>) || [];
            const correctAnswer = q.correctAnswer ?? q.correct_answer;
            const userAnswer = quizAnswers[qId];
            const isCorrect = quizChecked && userAnswer === String(correctAnswer);
            const isWrong = quizChecked && userAnswer !== undefined && !isCorrect;

            return (
              <div
                key={qId}
                className="rounded-lg p-4"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isCorrect ? 'var(--fn-success)' : isWrong ? 'var(--fn-error)' : 'var(--border-default)'}`,
                }}
              >
                <p className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  {qIndex + 1}. {prompt}
                </p>
                {(qType === 'MCQ' || qType === 'TRUE_FALSE') && (
                  <div className="space-y-2">
                    {options.map((opt, oIndex) => {
                      const optText = String(opt.text || opt);
                      const optId = String(opt.id || oIndex);
                      return (
                        <label
                          key={optId}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <input
                            type="radio"
                            name={`q-${qId}`}
                            value={optId}
                            checked={userAnswer === optId}
                            onChange={() => handleQuizAnswer(qId, optId)}
                            disabled={quizChecked}
                          />
                          {optText}
                        </label>
                      );
                    })}
                  </div>
                )}
                {qType === 'FILL_BLANK' && (
                  <input
                    type="text"
                    className="input w-full"
                    value={userAnswer || ''}
                    onChange={(e) => handleQuizAnswer(qId, e.target.value)}
                    disabled={quizChecked}
                    placeholder={t('lesson.typeAnswer', 'Type your answer...')}
                  />
                )}
                {quizChecked && (
                  <div className="mt-2 text-sm" style={{ color: isCorrect ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                    {isCorrect
                      ? t('lesson.correct', 'Correct!')
                      : t('lesson.incorrect', 'Incorrect')}
                    {Boolean(q.explanation) && (
                      <span style={{ color: 'var(--text-muted)' }}> — {String(q.explanation)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!quizChecked && questions.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => setQuizChecked(true)}>
              {t('lesson.checkAnswers', 'Check Answers')}
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {lesson.title}
        </h1>
        {lesson.summary && (
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {lesson.summary}
          </p>
        )}

        {/* Step tabs */}
        <div
          className="flex gap-1 mb-6 overflow-x-auto pb-2"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          {steps.map((step, index) => {
            const unlocked = isStepUnlocked(index);
            const completed = isStepCompleted(index);
            const active = index === activeStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    setActiveStepIndex(index);
                    setQuizAnswers({});
                    setQuizChecked(false);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors"
                style={{
                  color: active ? 'var(--text-primary)' : unlocked ? 'var(--text-secondary)' : 'var(--text-muted)',
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                  opacity: unlocked ? 1 : 0.5,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                }}
              >
                {completed && <CheckCircleIcon className="w-4 h-4" style={{ color: 'var(--fn-success)' }} />}
                {!unlocked && <LockClosedIcon className="w-4 h-4" />}
                <span>{step.title || `${t('lesson.step', 'Step')} ${index + 1}`}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
                >
                  {step.blockType}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="card p-6 min-h-[300px]">{renderStepContent()}</div>

        {/* Complete & Next */}
        {activeStep && !isStepCompleted(activeStepIndex) && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCompleteAndNext}
              disabled={completeStep.isPending || (activeStep.blockType === 'QUIZ' && !quizChecked)}
            >
              {activeStepIndex < steps.length - 1
                ? t('lesson.completeAndNext', 'Complete & Next')
                : t('lesson.completeLesson', 'Complete Lesson')}
            </button>
          </div>
        )}

        {/* Progress summary */}
        {progress && (
          <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('lesson.progressSummary', '{{completed}}/{{total}} steps completed', {
              completed: progress.completedSteps,
              total: progress.totalSteps,
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LessonPlayer;
