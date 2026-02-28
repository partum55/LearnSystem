import React from 'react';
import { TFunction } from 'i18next';
import { Question, StudentAnswer } from './quizTakingModel';
import { BlockEditor } from '../../features/editor-core';
import { CanonicalDocument } from '../../types';

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
  const choices = question.options?.choices || [];
  const pairs = question.options?.pairs || [];

  const toggleMultiResponse = (choiceIndex: number) => {
    const current = currentAnswer?.selected_indices || [];
    const exists = current.includes(choiceIndex);
    const next = exists
      ? current.filter((idx) => idx !== choiceIndex)
      : [...current, choiceIndex];
    onAnswerChange(questionId, { selected_indices: next });
  };

  const updatePair = (left: string, right: string) => {
    onAnswerChange(questionId, {
      pairs: {
        ...(currentAnswer?.pairs || {}),
        [left]: right,
      },
    });
  };

  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= choices.length) return;
    const current = currentAnswer?.order && currentAnswer.order.length > 0
      ? [...currentAnswer.order]
      : [...choices];
    [current[fromIndex], current[toIndex]] = [current[toIndex], current[fromIndex]];
    onAnswerChange(questionId, { order: current });
  };

  const orderItems = currentAnswer?.order && currentAnswer.order.length > 0
    ? currentAnswer.order
    : choices;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {question.promptDocument && Array.isArray(question.promptDocument.content) && question.promptDocument.content.length > 0 ? (
            <BlockEditor
              value={question.promptDocument as CanonicalDocument}
              onChange={() => {}}
              readOnly
              mode="lite"
            />
          ) : (
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{question.stem}</h3>
          )}
        </div>
        <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
          {question.points} {t('quiz.points')}
        </span>
      </div>

      {question.question_type === 'SINGLE_CHOICE' && choices.length > 0 && (
        <div className="space-y-2">
          {choices.map((choice, index) => (
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

      {question.question_type === 'MULTIPLE_RESPONSE' && choices.length > 0 && (
        <div className="space-y-2">
          {choices.map((choice, index) => (
            <label
              key={index}
              className="flex cursor-pointer items-center rounded-lg p-3 transition-colors"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <input
                type="checkbox"
                checked={(currentAnswer?.selected_indices || []).includes(index)}
                onChange={() => toggleMultiResponse(index)}
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

      {question.question_type === 'NUMERIC' && (
        <input
          type="number"
          value={typeof currentAnswer?.value === 'number' ? currentAnswer?.value : ''}
          onChange={(event) => onAnswerChange(questionId, { value: Number(event.target.value) })}
          className="input block w-full"
          placeholder={t('question.enterAnswer')}
        />
      )}

      {question.question_type === 'MATCHING' && (
        <div className="space-y-2">
          {pairs.map((pair, index) => (
            <div key={index} className="grid grid-cols-2 gap-3 items-center">
              <div className="rounded p-2" style={{ border: '1px solid var(--border-default)' }}>
                {pair.left}
              </div>
              <input
                type="text"
                className="input"
                value={(currentAnswer?.pairs || {})[pair.left] || ''}
                onChange={(event) => updatePair(pair.left, event.target.value)}
                placeholder={t('question.enterAnswer')}
              />
            </div>
          ))}
        </div>
      )}

      {question.question_type === 'ORDERING' && (
        <div className="space-y-2">
          {orderItems.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="grid grid-cols-[1fr_auto_auto] gap-2 items-center rounded-lg p-3"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <span style={{ color: 'var(--text-primary)' }}>{item}</span>
              <button
                type="button"
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: 'var(--border-default)' }}
                disabled={index === 0}
                onClick={() => moveOrderItem(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: 'var(--border-default)' }}
                disabled={index === orderItems.length - 1}
                onClick={() => moveOrderItem(index, index + 1)}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      )}

      {(question.question_type === 'SHORT_ANSWER' || question.question_type === 'ESSAY') && (
        <textarea
          value={currentAnswer?.text || ''}
          onChange={(event) => onAnswerChange(questionId, { text: event.target.value })}
          rows={question.question_type === 'ESSAY' ? 10 : 4}
          className="input block w-full"
          placeholder={t('question.enterAnswer')}
        />
      )}
    </div>
  );
};
