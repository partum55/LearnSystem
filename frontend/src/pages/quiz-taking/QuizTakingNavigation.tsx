import React from 'react';
import { TFunction } from 'i18next';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components';
import { Quiz, StudentAnswer } from './quizTakingModel';

interface QuizTakingNavigationProps {
  questions: Quiz['questions'];
  currentQuestionIndex: number;
  answers: Record<string, StudentAnswer>;
  submitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToQuestion: (index: number) => void;
  onSubmit: () => void;
  t: TFunction;
}

export const QuizTakingNavigation: React.FC<QuizTakingNavigationProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  submitting,
  onPrevious,
  onNext,
  onJumpToQuestion,
  onSubmit,
  t,
}) => {
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="flex items-center justify-between">
      <Button variant="secondary" onClick={onPrevious} disabled={currentQuestionIndex === 0}>
        {t('common.previous')}
      </Button>

      <div className="flex gap-2">
        {questions.map((quizQuestion, index) => (
          <button
            key={quizQuestion.id}
            type="button"
            onClick={() => onJumpToQuestion(index)}
            className="h-8 w-8 rounded-full text-sm font-medium transition-colors"
            style={
              index === currentQuestionIndex
                ? { background: 'var(--text-primary)', color: 'var(--bg-base)' }
                : answers[quizQuestion.question.id]
                  ? { background: 'rgba(34, 197, 94, 0.15)', color: 'var(--fn-success)' }
                  : { background: 'var(--bg-overlay)', color: 'var(--text-muted)' }
            }
          >
            {index + 1}
          </button>
        ))}
      </div>

      {isLastQuestion ? (
        <Button onClick={onSubmit} isLoading={submitting} style={{ background: 'var(--fn-success)', color: '#fff' }}>
          <CheckCircleIcon className="mr-2 h-5 w-5" />
          {t('quiz.submitQuiz')}
        </Button>
      ) : (
        <Button onClick={onNext}>{t('common.next')}</Button>
      )}
    </div>
  );
};
