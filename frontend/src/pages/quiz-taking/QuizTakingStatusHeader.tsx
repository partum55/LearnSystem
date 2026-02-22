import React from 'react';
import { TFunction } from 'i18next';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader } from '../../components';
import { Quiz, QuizAttempt } from './quizTakingModel';
import { formatTime } from './quizTakingModel';

interface QuizTakingStatusHeaderProps {
  showTimeWarning: boolean;
  quiz: Quiz;
  attempt: QuizAttempt;
  timeRemaining: number | null;
  lastSaved: Date | null;
  isSaving: boolean;
  t: TFunction;
}

export const QuizTakingStatusHeader: React.FC<QuizTakingStatusHeaderProps> = ({
  showTimeWarning,
  quiz,
  attempt,
  timeRemaining,
  lastSaved,
  isSaving,
  t,
}) => (
  <>
    {showTimeWarning && (
      <div
        className="mb-4 flex animate-pulse items-center gap-3 rounded-lg p-4"
        style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
      >
        <ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--fn-error)' }} />
        <div>
          <p className="font-semibold" style={{ color: 'var(--fn-error)' }}>
            {t('quiz.timeWarning', '⚠️ Only 5 minutes remaining!')}
          </p>
          <p className="text-sm" style={{ color: 'var(--fn-error)', opacity: 0.8 }}>
            {t('quiz.timeWarningHint', 'Please review your answers and submit soon.')}
          </p>
        </div>
      </div>
    )}

    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{quiz.title}</h1>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('quiz.attemptNumber')} {attempt.attempt_number}
              </p>
              {lastSaved && (
                <span className="flex items-center gap-1 text-xs" style={{ color: isSaving ? 'var(--fn-warning)' : 'var(--fn-success)' }}>
                  {isSaving ? (
                    <>
                      <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--fn-warning)' }}></span>
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
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-2 ${timeRemaining < 300 ? 'animate-pulse' : ''}`}
              style={{
                background: timeRemaining < 300
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--bg-elevated)',
              }}
            >
              <ClockIcon
                className="h-5 w-5"
                style={{ color: timeRemaining < 300 ? 'var(--fn-error)' : 'var(--text-secondary)' }}
              />
              <span
                className="text-lg font-semibold"
                style={{ color: timeRemaining < 300 ? 'var(--fn-error)' : 'var(--text-secondary)' }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  </>
);
