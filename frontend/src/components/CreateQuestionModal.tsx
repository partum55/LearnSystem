import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '../components';
import apiClient, { extractErrorMessage } from '../api/client';

type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'SHORT_ANSWER'
  | 'ESSAY';

interface CreateQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  onQuestionCreated: () => void;
}

const QUESTION_TYPES: { value: QuestionType; labelKey: string }[] = [
  { value: 'MULTIPLE_CHOICE', labelKey: 'question.types.multipleChoice' },
  { value: 'TRUE_FALSE', labelKey: 'question.types.trueFalse' },
  { value: 'FILL_BLANK', labelKey: 'question.types.fillBlank' },
  { value: 'SHORT_ANSWER', labelKey: 'question.types.shortAnswer' },
  { value: 'ESSAY', labelKey: 'question.types.essay' },
];

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onQuestionCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    question_type: 'MULTIPLE_CHOICE' as QuestionType,
    stem: '',
    points: '1',
    explanation: '',
    // Multiple choice options
    options: ['', '', '', ''],
    correct_answer_index: 0,
    // True/False
    true_false_answer: true,
    // Fill blank
    fill_blank_answers: [''],
    // Short answer (keywords for auto-check)
    short_answer_keywords: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        // Only include course when provided. The Question Bank can hold global questions without a course.
        ...(courseId ? { courseId } : {}),
        questionType: formData.question_type,
        stem: formData.stem,
        points: parseFloat(formData.points),
        explanation: formData.explanation,
        metadata: {},
      };

      // Build options and correct_answer based on type
      if (formData.question_type === 'MULTIPLE_CHOICE') {
        const validOptions = formData.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          setError(t('question.errors.minOptions'));
          setLoading(false);
          return;
        }
        payload.options = { choices: validOptions };
        payload.correctAnswer = { index: formData.correct_answer_index };
      } else if (formData.question_type === 'TRUE_FALSE') {
        payload.options = { choices: ['True', 'False'] };
        payload.correctAnswer = { value: formData.true_false_answer };
      } else if (formData.question_type === 'FILL_BLANK') {
        const validAnswers = formData.fill_blank_answers.filter(a => a.trim() !== '');
        if (validAnswers.length === 0) {
          setError(t('question.errors.noAnswer'));
          setLoading(false);
          return;
        }
        payload.correctAnswer = { blanks: validAnswers };
      } else if (formData.question_type === 'SHORT_ANSWER') {
        const keywords = formData.short_answer_keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k !== '');
        payload.correctAnswer = { keywords };
        payload.metadata = { requires_manual_grading: true };
      } else if (formData.question_type === 'ESSAY') {
        payload.correctAnswer = {};
        payload.metadata = { requires_manual_grading: true };
      }

      const response = await apiClient.post('/assessments/questions', payload);

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Failed to create question');
      }

      // Reset form
      setFormData({
        question_type: 'MULTIPLE_CHOICE',
        stem: '',
        points: '1',
        explanation: '',
        options: ['', '', '', ''],
        correct_answer_index: 0,
        true_false_answer: true,
        fill_blank_answers: [''],
        short_answer_keywords: '',
      });

      onQuestionCreated();
      onClose();
    } catch (err: unknown) {
      // Try to extract a useful error message from the server response
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      options: newOptions,
      correct_answer_index: prev.correct_answer_index >= newOptions.length ? 0 : prev.correct_answer_index,
    }));
  };

  const addBlank = () => {
    setFormData(prev => ({ ...prev, fill_blank_answers: [...prev.fill_blank_answers, ''] }));
  };

  const handleBlankChange = (index: number, value: string) => {
    const newBlanks = [...formData.fill_blank_answers];
    newBlanks[index] = value;
    setFormData(prev => ({ ...prev, fill_blank_answers: newBlanks }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('question.createQuestion')} size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        {/* Question Type */}
        <div>
          <label className="label block mb-2">
            {t('question.type')} *
          </label>
          <select
            value={formData.question_type}
            onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as QuestionType }))}
            className="input w-full"
          >
            {QUESTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {t(type.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Question Text */}
        <div>
          <label className="label block mb-1">
            {t('question.stem')} *
          </label>
          <textarea
            value={formData.stem}
            onChange={(e) => setFormData(prev => ({ ...prev, stem: e.target.value }))}
            rows={4}
            required
            className="input w-full"
            placeholder={t('question.stemPlaceholder')}
          />
        </div>

        {/* Type-specific fields */}
        {formData.question_type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-3">
            <label className="label block">
              {t('question.options')} *
            </label>
            {formData.options.map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={formData.correct_answer_index === index}
                  onChange={() => setFormData(prev => ({ ...prev, correct_answer_index: index }))}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--text-primary)' }}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`${t('question.option')} ${index + 1}`}
                  className="input flex-1"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    style={{ color: 'var(--fn-error)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
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
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.true_false_answer === true}
                  onChange={() => setFormData(prev => ({ ...prev, true_false_answer: true }))}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--text-primary)' }}
                />
                <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{t('question.true')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.true_false_answer === false}
                  onChange={() => setFormData(prev => ({ ...prev, true_false_answer: false }))}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--text-primary)' }}
                />
                <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{t('question.false')}</span>
              </label>
            </div>
          </div>
        )}

        {formData.question_type === 'FILL_BLANK' && (
          <div className="space-y-3">
            <label className="label block">
              {t('question.correctAnswers')} *
            </label>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('question.fillBlankHint')}</p>
            {formData.fill_blank_answers.map((answer, index) => (
              <Input
                key={index}
                label={`${t('question.blank')} ${index + 1}`}
                value={answer}
                onChange={(e) => handleBlankChange(index, e.target.value)}
                placeholder={t('question.enterAnswer')}
              />
            ))}
            <button
              type="button"
              onClick={addBlank}
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              + {t('question.addBlank')}
            </button>
          </div>
        )}

        {formData.question_type === 'SHORT_ANSWER' && (
          <div>
            <label className="label block mb-1">
              {t('question.keywords')}
            </label>
            <input
              type="text"
              value={formData.short_answer_keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, short_answer_keywords: e.target.value }))}
              placeholder="keyword1, keyword2, keyword3"
              className="input w-full"
            />
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('question.keywordsHint')}
            </p>
          </div>
        )}

        {formData.question_type === 'ESSAY' && (
          <div className="rounded-md p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('question.manualGradingNote')}
            </p>
          </div>
        )}

        {/* Points */}
        <Input
          label={t('question.points')}
          name="points"
          type="number"
          value={formData.points}
          onChange={(e) => setFormData(prev => ({ ...prev, points: e.target.value }))}
          required
          min="0"
          step="0.5"
        />

        {/* Explanation */}
        <div>
          <label className="label block mb-1">
            {t('question.explanation')}
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
            rows={3}
            className="input w-full"
            placeholder={t('question.explanationPlaceholder')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
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
