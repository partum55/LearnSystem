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
}) => (
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

        {(question.question_type === 'multiple_choice' || question.question_type === 'multiple_select') && (
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
                    type={question.question_type === 'multiple_select' ? 'checkbox' : 'radio'}
                    checked={
                      question.question_type === 'multiple_select'
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
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {question.question_type === 'multiple_select'
                ? t('quiz.selectMultipleHint', 'Check all correct answers')
                : t('quiz.selectOneHint', 'Select the correct answer')}
            </p>
          </div>
        )}

        {question.question_type === 'true_false' && (
          <div>
            <label className="label">
              {t('quiz.correctAnswer', 'Correct Answer')}
            </label>
            <div className="flex gap-4">
              {question.choices?.map((choice) => (
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

        {(question.question_type === 'short_answer' || question.question_type === 'fill_blank') && (
          <div>
            <label className="label">
              {t('quiz.correctAnswer', 'Correct Answer')} (optional)
            </label>
            <input
              type="text"
              value={(question.correct_answer as string) || ''}
              onChange={(event) => updateQuestion(index, 'correct_answer', event.target.value)}
              className="input w-full"
              placeholder={t('quiz.correctAnswerPlaceholder', 'Enter the correct answer')}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('quiz.manualGradingNote', 'This question will require manual grading')}
            </p>
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
            placeholder={t('quiz.explanationPlaceholder', 'Provide an explanation for the correct answer')}
          />
        </div>
      </div>
    </CardBody>
  </Card>
);
