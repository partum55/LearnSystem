import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '../components';
import apiClient, { extractErrorMessage } from '../api/client';

type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_RESPONSE'
  | 'SHORT_ANSWER'
  | 'NUMERIC'
  | 'MATCHING'
  | 'ORDERING'
  | 'ESSAY'
  | 'TRUE_FALSE';

interface MatchingPair {
  left: string;
  right: string;
}

interface CreateQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  onQuestionCreated: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_RESPONSE', label: 'Multiple Response' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'MATCHING', label: 'Matching' },
  { value: 'ORDERING', label: 'Ordering' },
  { value: 'ESSAY', label: 'Essay' },
  { value: 'TRUE_FALSE', label: 'True/False' },
];

const createDefaultForm = () => ({
  question_type: 'SINGLE_CHOICE' as QuestionType,
  stem: '',
  image_url: '',
  points: '1',
  explanation: '',
  choices: ['', '', '', ''],
  single_choice_answer: '',
  multi_response_answers: [] as string[],
  short_answer: '',
  numeric_value: '0',
  numeric_tolerance: '0.01',
  matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }] as MatchingPair[],
  ordering_items: ['', '', ''],
  true_false_answer: 'True',
});

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onQuestionCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(createDefaultForm());

  const resetForm = () => {
    setFormData(createDefaultForm());
    setError('');
  };

  const validChoices = formData.choices.map((choice) => choice.trim()).filter((choice) => choice.length > 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        ...(courseId ? { courseId } : {}),
        questionType: formData.question_type,
        stem: formData.stem,
        imageUrl: formData.image_url || undefined,
        points: parseFloat(formData.points),
        explanation: formData.explanation,
        metadata: {},
      };

      if (formData.question_type === 'SINGLE_CHOICE') {
        if (validChoices.length < 2) {
          throw new Error('At least 2 choices are required');
        }
        payload.options = { choices: validChoices };
        payload.correctAnswer = { choice: formData.single_choice_answer || validChoices[0] };
      } else if (formData.question_type === 'MULTIPLE_RESPONSE') {
        if (validChoices.length < 2) {
          throw new Error('At least 2 choices are required');
        }
        payload.options = { choices: validChoices };
        payload.correctAnswer = { choices: formData.multi_response_answers };
      } else if (formData.question_type === 'TRUE_FALSE') {
        payload.options = { choices: ['True', 'False'] };
        payload.correctAnswer = { choice: formData.true_false_answer };
      } else if (formData.question_type === 'SHORT_ANSWER') {
        const answer = formData.short_answer.trim();
        payload.correctAnswer = answer.length > 0 ? { answers: [answer] } : {};
      } else if (formData.question_type === 'NUMERIC') {
        payload.correctAnswer = {
          value: parseFloat(formData.numeric_value) || 0,
          tolerance: parseFloat(formData.numeric_tolerance) || 0.01,
        };
      } else if (formData.question_type === 'MATCHING') {
        const pairs = formData.matching_pairs
          .map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() }))
          .filter((pair) => pair.left.length > 0 || pair.right.length > 0);
        payload.options = { pairs };
        payload.correctAnswer = {
          pairs: Object.fromEntries(
            pairs.filter((pair) => pair.left.length > 0).map((pair) => [pair.left, pair.right])
          ),
        };
      } else if (formData.question_type === 'ORDERING') {
        const items = formData.ordering_items.map((item) => item.trim()).filter((item) => item.length > 0);
        payload.options = { choices: items };
        payload.correctAnswer = { order: items };
      } else if (formData.question_type === 'ESSAY') {
        payload.correctAnswer = {};
      }

      const response = await apiClient.post('/assessments/questions', payload);
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Failed to create question');
      }

      resetForm();
      onQuestionCreated();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateChoice = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.choices];
      next[index] = value;
      return { ...prev, choices: next };
    });
  };

  const addChoice = () => {
    setFormData((prev) => ({ ...prev, choices: [...prev.choices, ''] }));
  };

  const removeChoice = (index: number) => {
    if (formData.choices.length <= 2) return;
    setFormData((prev) => ({ ...prev, choices: prev.choices.filter((_, idx) => idx !== index) }));
  };

  const toggleMultiResponseAnswer = (choice: string) => {
    setFormData((prev) => {
      const exists = prev.multi_response_answers.includes(choice);
      return {
        ...prev,
        multi_response_answers: exists
          ? prev.multi_response_answers.filter((item) => item !== choice)
          : [...prev.multi_response_answers, choice],
      };
    });
  };

  const updateMatchingPair = (index: number, field: 'left' | 'right', value: string) => {
    setFormData((prev) => {
      const next = prev.matching_pairs.map((pair, idx) =>
        idx === index ? { ...pair, [field]: value } : pair
      );
      return { ...prev, matching_pairs: next };
    });
  };

  const addMatchingPair = () => {
    setFormData((prev) => ({
      ...prev,
      matching_pairs: [...prev.matching_pairs, { left: '', right: '' }],
    }));
  };

  const removeMatchingPair = (index: number) => {
    if (formData.matching_pairs.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      matching_pairs: prev.matching_pairs.filter((_, idx) => idx !== index),
    }));
  };

  const updateOrderingItem = (index: number, value: string) => {
    setFormData((prev) => {
      const next = prev.ordering_items.map((item, idx) => (idx === index ? value : item));
      return { ...prev, ordering_items: next };
    });
  };

  const addOrderingItem = () => {
    setFormData((prev) => ({ ...prev, ordering_items: [...prev.ordering_items, ''] }));
  };

  const removeOrderingItem = (index: number) => {
    if (formData.ordering_items.length <= 2) return;
    setFormData((prev) => ({
      ...prev,
      ordering_items: prev.ordering_items.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title={t('question.createQuestion')} size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        <div>
          <label className="label block mb-2">
            {t('question.type')} *
          </label>
          <select
            value={formData.question_type}
            onChange={(event) => setFormData((prev) => ({ ...prev, question_type: event.target.value as QuestionType }))}
            className="input w-full"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label block mb-1">
            {t('question.stem')} *
          </label>
          <textarea
            value={formData.stem}
            onChange={(event) => setFormData((prev) => ({ ...prev, stem: event.target.value }))}
            rows={4}
            required
            className="input w-full"
            placeholder={t('question.stemPlaceholder')}
          />
        </div>

        <Input
          label={t('question.imageUrl', 'Question image URL')}
          value={formData.image_url}
          onChange={(event) => setFormData((prev) => ({ ...prev, image_url: event.target.value }))}
          placeholder="https://example.edu/image.png"
        />

        {(formData.question_type === 'SINGLE_CHOICE' || formData.question_type === 'MULTIPLE_RESPONSE') && (
          <div className="space-y-3">
            <label className="label block">
              {t('question.options')} *
            </label>
            {formData.choices.map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type={formData.question_type === 'MULTIPLE_RESPONSE' ? 'checkbox' : 'radio'}
                  name={formData.question_type === 'MULTIPLE_RESPONSE' ? `multi-${index}` : 'single-answer'}
                  checked={
                    formData.question_type === 'MULTIPLE_RESPONSE'
                      ? formData.multi_response_answers.includes(option)
                      : formData.single_choice_answer === option
                  }
                  onChange={() => {
                    if (formData.question_type === 'MULTIPLE_RESPONSE') {
                      toggleMultiResponseAnswer(option);
                    } else {
                      setFormData((prev) => ({ ...prev, single_choice_answer: option }));
                    }
                  }}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--text-primary)' }}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(event) => updateChoice(index, event.target.value)}
                  placeholder={`${t('question.option')} ${index + 1}`}
                  className="input flex-1"
                />
                {formData.choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    style={{ color: 'var(--fn-error)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addChoice}
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              + {t('question.addOption')}
            </button>
          </div>
        )}

        {formData.question_type === 'TRUE_FALSE' && (
          <div>
            <label className="label block mb-2">
              {t('question.correctAnswer')} *
            </label>
            <div className="flex gap-4">
              {['True', 'False'].map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.true_false_answer === option}
                    onChange={() => setFormData((prev) => ({ ...prev, true_false_answer: option }))}
                    className="h-4 w-4"
                    style={{ accentColor: 'var(--text-primary)' }}
                  />
                  <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {formData.question_type === 'SHORT_ANSWER' && (
          <Input
            label={t('question.correctAnswer')}
            value={formData.short_answer}
            onChange={(event) => setFormData((prev) => ({ ...prev, short_answer: event.target.value }))}
            placeholder={t('question.enterAnswer')}
          />
        )}

        {formData.question_type === 'NUMERIC' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('quiz.correctValue', 'Correct Value')}
              type="number"
              value={formData.numeric_value}
              onChange={(event) => setFormData((prev) => ({ ...prev, numeric_value: event.target.value }))}
            />
            <Input
              label={t('quiz.tolerance', 'Tolerance')}
              type="number"
              step="0.0001"
              min="0"
              value={formData.numeric_tolerance}
              onChange={(event) => setFormData((prev) => ({ ...prev, numeric_tolerance: event.target.value }))}
            />
          </div>
        )}

        {formData.question_type === 'MATCHING' && (
          <div className="space-y-2">
            <label className="label block">
              {t('quiz.matchingPairs', 'Matching Pairs')}
            </label>
            {formData.matching_pairs.map((pair, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  className="input"
                  value={pair.left}
                  onChange={(event) => updateMatchingPair(index, 'left', event.target.value)}
                  placeholder={t('quiz.matchLeft', 'Left value')}
                />
                <input
                  className="input"
                  value={pair.right}
                  onChange={(event) => updateMatchingPair(index, 'right', event.target.value)}
                  placeholder={t('quiz.matchRight', 'Right value')}
                />
                <button type="button" onClick={() => removeMatchingPair(index)} style={{ color: 'var(--fn-error)' }}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addMatchingPair} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              + {t('quiz.addPair', 'Add Pair')}
            </button>
          </div>
        )}

        {formData.question_type === 'ORDERING' && (
          <div className="space-y-2">
            <label className="label block">
              {t('quiz.orderItems', 'Order Items')}
            </label>
            {formData.ordering_items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <input
                  className="input"
                  value={item}
                  onChange={(event) => updateOrderingItem(index, event.target.value)}
                  placeholder={`${t('quiz.orderItem', 'Item')} ${index + 1}`}
                />
                <button type="button" onClick={() => removeOrderingItem(index)} style={{ color: 'var(--fn-error)' }}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addOrderingItem} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              + {t('quiz.addItem', 'Add Item')}
            </button>
          </div>
        )}

        <Input
          label={t('question.points')}
          name="points"
          type="number"
          value={formData.points}
          onChange={(event) => setFormData((prev) => ({ ...prev, points: event.target.value }))}
          required
          min="0"
          step="0.5"
        />

        <div>
          <label className="label block mb-1">
            {t('question.explanation')}
          </label>
          <textarea
            value={formData.explanation}
            onChange={(event) => setFormData((prev) => ({ ...prev, explanation: event.target.value }))}
            rows={3}
            className="input w-full"
            placeholder={t('question.explanationPlaceholder')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose(); }} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={loading}>
            {t('question.createQuestion')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
