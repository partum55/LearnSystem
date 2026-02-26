import React from 'react';
import { useTranslation } from 'react-i18next';
import { AssignmentType } from '../../../types';

interface TypeStepProps {
  value: AssignmentType;
  onChange: (type: AssignmentType) => void;
}

interface TypeOption {
  type: AssignmentType;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}

const typeOptions: TypeOption[] = [
  {
    type: 'FILE_UPLOAD',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    labelKey: 'assignment.types.file_upload',
    descKey: 'wizard.typeDesc.file_upload',
  },
  {
    type: 'TEXT',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    labelKey: 'assignment.types.text',
    descKey: 'wizard.typeDesc.text',
  },
  {
    type: 'CODE',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    labelKey: 'assignment.types.code',
    descKey: 'wizard.typeDesc.code',
  },
  {
    type: 'QUIZ',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
    labelKey: 'assignment.types.quiz',
    descKey: 'wizard.typeDesc.quiz',
  },
  {
    type: 'URL',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.832a4.5 4.5 0 00-6.364-6.364L6.257 5.37a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    labelKey: 'assignment.types.url',
    descKey: 'wizard.typeDesc.url',
  },
  {
    type: 'VIRTUAL_LAB',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    labelKey: 'assignment.types.virtual_lab',
    descKey: 'wizard.typeDesc.virtual_lab',
  },
];

const TypeStep: React.FC<TypeStepProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.typeTitle', 'Choose assignment type')}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {t('wizard.typeSubtitle', 'Select the type of assignment you want to create')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {typeOptions.map((option) => {
          const isSelected = value === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onChange(option.type)}
              className="card p-5 text-left transition-all"
              style={{
                border: isSelected
                  ? '2px solid var(--text-primary)'
                  : '1px solid var(--border-default)',
                background: isSelected ? 'var(--bg-active)' : 'var(--bg-elevated)',
                transform: isSelected ? 'scale(1.02)' : undefined,
              }}
            >
              <div
                className="mb-3"
                style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {option.icon}
              </div>
              <h3
                className="font-semibold text-sm mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {t(option.labelKey, option.type)}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t(option.descKey, `Create a ${option.type.toLowerCase().replace('_', ' ')} assignment`)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TypeStep;
