import React from 'react';
import { TFunction } from 'i18next';
import {
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '../../components';
import { Question, QUIZ_QUESTION_TYPE_OPTIONS } from './quizBuilderModel';

interface QuizQuestionEditorProps {
  question: Question;
  index: number;
  totalQuestions: number;
  t: TFunction;
  moveQuestion: (index: number, direction: 'up' | 'down') => void;
  duplicateQuestion: (index: number) => void;
  removeQuestion: (index: number) => void;
  updateQuestion: (index: number, field: keyof Question, value: unknown) => void;
  addChoice: (questionIndex: number) => void;
  updateChoice: (questionIndex: number, choiceIndex: number, value: string) => void;
  removeChoice: (questionIndex: number, choiceIndex: number) => void;
  toggleCorrectAnswer: (questionIndex: number, choice: string) => void;
}

export const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({
  question,
  index,
  totalQuestions,
  t,
  moveQuestion,
  duplicateQuestion,
  removeQuestion,
  updateQuestion,
  addChoice,
  updateChoice,
  removeChoice,
  toggleCorrectAnswer,
}) => {
  const matchingPairs = question.matching_pairs || [];
  const orderingItems = question.ordering_items || [];

  const updateMatchingPair = (pairIndex: number, field: 'left' | 'right', value: string) => {
    const nextPairs = matchingPairs.map((pair, idx) =>
      idx === pairIndex ? { ...pair, [field]: value } : pair
    );
    updateQuestion(index, 'matching_pairs', nextPairs);
  };

  const addMatchingPair = () => {
    updateQuestion(index, 'matching_pairs', [...matchingPairs, { left: '', right: '' }]);
  };

  const removeMatchingPair = (pairIndex: number) => {
    if (matchingPairs.length <= 1) return;
    updateQuestion(
      index,
      'matching_pairs',
      matchingPairs.filter((_, idx) => idx !== pairIndex)
    );
  };

  const updateOrderingItem = (itemIndex: number, value: string) => {
    const nextItems = orderingItems.map((item, idx) => (idx === itemIndex ? value : item));
    updateQuestion(index, 'ordering_items', nextItems);
  };

  const addOrderingItem = () => {
    updateQuestion(index, 'ordering_items', [...orderingItems, '']);
  };

  const removeOrderingItem = (itemIndex: number) => {
    if (orderingItems.length <= 2) return;
    updateQuestion(
      index,
      'ordering_items',
      orderingItems.filter((_, idx) => idx !== itemIndex)
    );
  };

  const moveOrderingItem = (itemIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderingItems.length) return;

    const nextItems = [...orderingItems];
    [nextItems[itemIndex], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[itemIndex]];
    updateQuestion(index, 'ordering_items', nextItems);
  };

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold" style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}>
              {index + 1}
            </span>
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('quiz.questionNum', { num: index + 1 })}
            </h3>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ({question.points} {t('quiz.points', 'points')})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveQuestion(index, 'up')}
              disabled={index === 0}
              className="p-1 disabled:opacity-30"
              style={{ color: 'var(--text-faint)' }}
              title={t('common.moveUp', 'Move up')}
            >
              <ArrowUpIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => moveQuestion(index, 'down')}
              disabled={index === totalQuestions - 1}
              className="p-1 disabled:opacity-30"
              style={{ color: 'var(--text-faint)' }}
              title={t('common.moveDown', 'Move down')}
            >
              <ArrowDownIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => duplicateQuestion(index)}
              className="p-1"
              style={{ color: 'var(--text-secondary)' }}
              title={t('quiz.duplicateQuestion', 'Duplicate question')}
            >
              <DocumentDuplicateIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-1"
              style={{ color: 'var(--fn-error)' }}
              title={t('common.delete', 'Delete')}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">
                {t('quiz.questionType', 'Question Type')}
              </label>
              <select
                value={question.question_type}
                onChange={(event) => updateQuestion(index, 'question_type', event.target.value)}
                className="input w-full"
              >
                {QUIZ_QUESTION_TYPE_OPTIONS.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {t(typeOption.labelKey, typeOption.defaultLabel)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                {t('quiz.points', 'Points')}
              </label>
              <input
                type="number"
                min="0"
                value={question.points}
                onChange={(event) => updateQuestion(index, 'points', parseInt(event.target.value, 10) || 0)}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">
              {t('quiz.questionText', 'Question Text')} *
            </label>
            <textarea
              value={question.question_text}
              onChange={(event) => updateQuestion(index, 'question_text', event.target.value)}
              rows={3}
              className="input w-full"
              placeholder={t('quiz.questionTextPlaceholder', 'Enter your question')}
              required
            />
          </div>

          {(question.question_type === 'single_choice' || question.question_type === 'multiple_response') && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label">
                  {t('quiz.answerChoices', 'Answer Choices')}
                </label>
                <button
                  type="button"
                  onClick={() => addChoice(index)}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  + {t('quiz.addChoice', 'Add Choice')}
                </button>
              </div>
              <div className="space-y-2">
                {question.choices?.map((choice, choiceIndex) => (
                  <div key={choiceIndex} className="flex items-center gap-2">
                    <input
                      type={question.question_type === 'multiple_response' ? 'checkbox' : 'radio'}
                      checked={
                        question.question_type === 'multiple_response'
                          ? ((question.correct_answer as string[]) || []).includes(choice)
                          : question.correct_answer === choice
                      }
                      onChange={() => toggleCorrectAnswer(index, choice)}
                      className="h-4 w-4"
                      style={{ accentColor: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      value={choice}
                      onChange={(event) => updateChoice(index, choiceIndex, event.target.value)}
                      className="input flex-1"
                      placeholder={t('quiz.choicePlaceholder', { num: choiceIndex + 1 })}
                    />
                    {(question.choices?.length || 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoice(index, choiceIndex)}
                        className="p-2"
                        style={{ color: 'var(--fn-error)' }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.question_type === 'true_false' && (
            <div>
              <label className="label">
                {t('quiz.correctAnswer', 'Correct Answer')}
              </label>
              <div className="flex gap-4">
                {(question.choices || ['True', 'False']).map((choice) => (
                  <label key={choice} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={question.correct_answer === choice}
                      onChange={() => updateQuestion(index, 'correct_answer', choice)}
                      className="h-4 w-4"
                      style={{ accentColor: 'var(--text-primary)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{choice}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {question.question_type === 'short_answer' && (
            <div>
              <label className="label">
                {t('quiz.correctAnswer', 'Accepted Answer')} (optional)
              </label>
              <input
                type="text"
                value={(question.correct_answer as string) || ''}
                onChange={(event) => updateQuestion(index, 'correct_answer', event.target.value)}
                className="input w-full"
                placeholder={t('quiz.correctAnswerPlaceholder', 'Enter an accepted answer')}
              />
            </div>
          )}

          {question.question_type === 'numeric' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  {t('quiz.correctValue', 'Correct Value')}
                </label>
                <input
                  type="number"
                  value={typeof question.correct_answer === 'number' ? question.correct_answer : ''}
                  onChange={(event) =>
                    updateQuestion(index, 'correct_answer', parseFloat(event.target.value) || 0)
                  }
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">
                  {t('quiz.tolerance', 'Tolerance')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={question.numeric_tolerance ?? 0.01}
                  onChange={(event) =>
                    updateQuestion(index, 'numeric_tolerance', parseFloat(event.target.value) || 0)
                  }
                  className="input w-full"
                />
              </div>
            </div>
          )}

          {question.question_type === 'matching' && (
            <div className="space-y-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="label">
                  {t('quiz.matchingPairs', 'Matching Pairs')}
                </label>
                <button
                  type="button"
                  onClick={addMatchingPair}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  + {t('quiz.addPair', 'Add Pair')}
                </button>
              </div>
              {matchingPairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(event) => updateMatchingPair(pairIndex, 'left', event.target.value)}
                    className="input"
                    placeholder={t('quiz.matchLeft', 'Left value')}
                  />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(event) => updateMatchingPair(pairIndex, 'right', event.target.value)}
                    className="input"
                    placeholder={t('quiz.matchRight', 'Right value')}
                  />
                  <button
                    type="button"
                    onClick={() => removeMatchingPair(pairIndex)}
                    className="p-2"
                    style={{ color: 'var(--fn-error)' }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {question.question_type === 'ordering' && (
            <div className="space-y-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="label">
                  {t('quiz.orderItems', 'Correct Order Items')}
                </label>
                <button
                  type="button"
                  onClick={addOrderingItem}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  + {t('quiz.addItem', 'Add Item')}
                </button>
              </div>
              {orderingItems.map((item, itemIndex) => (
                <div key={itemIndex} className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(event) => updateOrderingItem(itemIndex, event.target.value)}
                    className="input"
                    placeholder={t('quiz.orderItem', { num: itemIndex + 1 })}
                  />
                  <button
                    type="button"
                    onClick={() => moveOrderingItem(itemIndex, 'up')}
                    disabled={itemIndex === 0}
                    className="p-2 disabled:opacity-30"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrderingItem(itemIndex, 'down')}
                    disabled={itemIndex === orderingItems.length - 1}
                    className="p-2 disabled:opacity-30"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOrderingItem(itemIndex)}
                    className="p-2"
                    style={{ color: 'var(--fn-error)' }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="label">
              {t('quiz.explanation', 'Explanation')} (optional)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(event) => updateQuestion(index, 'explanation', event.target.value)}
              rows={2}
              className="input w-full"
              placeholder={t('quiz.explanationPlaceholder', 'Provide an explanation for the answer')}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
