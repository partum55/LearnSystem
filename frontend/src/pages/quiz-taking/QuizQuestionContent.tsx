import React from 'react';
import { TFunction } from 'i18next';
import { Question, StudentAnswer } from './quizTakingModel';

interface QuizQuestionContentProps {
  question: Question;
  currentAnswer?: StudentAnswer;
  onAnswerChange: (questionId: string, answer: StudentAnswer) => void;
  t: TFunction;
}

export const QuizQuestionContent: React.FC<QuizQuestionContentProps> = ({
  question,
  currentAnswer,
  onAnswerChange,
  t,
}) => {
  const questionId = question.id;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{question.stem}</h3>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {question.points} {t('quiz.points')}
        </span>
      </div>

      {question.question_type === 'MULTIPLE_CHOICE' && question.options?.choices && (
        <div className="space-y-2">
          {question.options.choices.map((choice, index) => (
            <label
              key={index}
              className="flex cursor-pointer items-center rounded-lg p-3 transition-colors"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <input
                type="radio"
                name={questionId}
                checked={currentAnswer?.selected_index === index}
                onChange={() => onAnswerChange(questionId, { selected_index: index })}
                className="h-4 w-4"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              <span className="ml-3" style={{ color: 'var(--text-primary)' }}>{choice}</span>
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'TRUE_FALSE' && (
        <div className="space-y-2">
          <label
            className="flex cursor-pointer items-center rounded-lg p-3 transition-colors"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <input
              type="radio"
              name={questionId}
              checked={currentAnswer?.value === true}
              onChange={() => onAnswerChange(questionId, { value: true })}
              className="h-4 w-4"
              style={{ accentColor: 'var(--text-primary)' }}
            />
            <span className="ml-3" style={{ color: 'var(--text-primary)' }}>{t('question.true')}</span>
          </label>
          <label
            className="flex cursor-pointer items-center rounded-lg p-3 transition-colors"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <input
              type="radio"
              name={questionId}
              checked={currentAnswer?.value === false}
              onChange={() => onAnswerChange(questionId, { value: false })}
              className="h-4 w-4"
              style={{ accentColor: 'var(--text-primary)' }}
            />
            <span className="ml-3" style={{ color: 'var(--text-primary)' }}>{t('question.false')}</span>
          </label>
        </div>
      )}

      {question.question_type === 'FILL_BLANK' && (
        <input
          type="text"
          value={currentAnswer?.text || ''}
          onChange={(event) => onAnswerChange(questionId, { text: event.target.value })}
          className="input block w-full"
          placeholder={t('question.enterAnswer')}
        />
      )}

      {question.question_type === 'SHORT_ANSWER' && (
        <textarea
          value={currentAnswer?.text || ''}
          onChange={(event) => onAnswerChange(questionId, { text: event.target.value })}
          rows={4}
          className="input block w-full"
          placeholder={t('question.enterAnswer')}
        />
      )}

      {question.question_type === 'ESSAY' && (
        <textarea
          value={currentAnswer?.text || ''}
          onChange={(event) => onAnswerChange(questionId, { text: event.target.value })}
          rows={10}
          className="input block w-full"
          placeholder={t('question.enterEssay')}
        />
      )}
    </div>
  );
};
