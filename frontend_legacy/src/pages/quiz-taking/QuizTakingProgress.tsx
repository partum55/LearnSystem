import React from 'react';
import { TFunction } from 'i18next';

interface QuizTakingProgressProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  t: TFunction;
}

export const QuizTakingProgress: React.FC<QuizTakingProgressProps> = ({
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  t,
}) => {
  const progress = totalQuestions === 0 ? 0 : ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>
          {t('quiz.question')} {currentQuestionIndex + 1} {t('quiz.of')} {totalQuestions}
        </span>
        <span>
          {t('quiz.answered')}: {answeredCount} / {totalQuestions}
        </span>
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: 'var(--bg-overlay)' }}>
        <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--text-primary)' }} />
      </div>
    </div>
  );
};
