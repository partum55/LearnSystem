import React from 'react';
import { useTranslation } from 'react-i18next';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'NUMERICAL'
  | 'FORMULA'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'CODE'
  | 'FILE_UPLOAD'
  | 'ORDERING'
  | 'HOTSPOT'
  | 'DRAG_DROP';

interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  disabled?: boolean;
}

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const questionTypes: { value: QuestionType; label: string; icon: string; description: string }[] = [
    {
      value: 'MULTIPLE_CHOICE',
      label: t('question_types.multiple_choice'),
      icon: '☑️',
      description: t('question_types.multiple_choice_desc'),
    },
    {
      value: 'TRUE_FALSE',
      label: t('question_types.true_false'),
      icon: '✓✗',
      description: t('question_types.true_false_desc'),
    },
    {
      value: 'FILL_BLANK',
      label: t('question_types.fill_blank'),
      icon: '___',
      description: t('question_types.fill_blank_desc'),
    },
    {
      value: 'MATCHING',
      label: t('question_types.matching'),
      icon: '⟷',
      description: t('question_types.matching_desc'),
    },
    {
      value: 'NUMERICAL',
      label: t('question_types.numerical'),
      icon: '123',
      description: t('question_types.numerical_desc'),
    },
    {
      value: 'FORMULA',
      label: t('question_types.formula'),
      icon: '∑',
      description: t('question_types.formula_desc'),
    },
    {
      value: 'SHORT_ANSWER',
      label: t('question_types.short_answer'),
      icon: '📝',
      description: t('question_types.short_answer_desc'),
    },
    {
      value: 'ESSAY',
      label: t('question_types.essay'),
      icon: '📄',
      description: t('question_types.essay_desc'),
    },
    {
      value: 'CODE',
      label: t('question_types.code'),
      icon: '</>',
      description: t('question_types.code_desc'),
    },
    {
      value: 'FILE_UPLOAD',
      label: t('question_types.file_upload'),
      icon: '📎',
      description: t('question_types.file_upload_desc'),
    },
    {
      value: 'ORDERING',
      label: t('question_types.ordering'),
      icon: '↕️',
      description: t('question_types.ordering_desc'),
    },
    {
      value: 'HOTSPOT',
      label: t('question_types.hotspot'),
      icon: '🎯',
      description: t('question_types.hotspot_desc'),
    },
    {
      value: 'DRAG_DROP',
      label: t('question_types.drag_drop'),
      icon: '🖱️',
      description: t('question_types.drag_drop_desc'),
    },
  ];

  return (
    <div className="question-type-selector">
      <label className="form-label">{t('question_types.select_type')}</label>
      <div className="question-types-grid">
        {questionTypes.map((type) => (
          <div
            key={type.value}
            className={`question-type-card ${value === type.value ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange(type.value)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyPress={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                onChange(type.value);
              }
            }}
          >
            <div className="question-type-icon">{type.icon}</div>
            <div className="question-type-label">{type.label}</div>
            <div className="question-type-description">{type.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionTypeSelector;
