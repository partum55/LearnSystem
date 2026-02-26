import React from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import ObsidianMDXEditor from '../../../components/editors/ObsidianMDXEditor';
import AIToolbarPlugin from '../../../components/editors/AIToolbarPlugin';
import CodeEditor from '../../../components/CodeEditor';

interface ContentStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  validationErrors: Record<string, string>;
}

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'cpp', 'c',
  'csharp', 'go', 'rust', 'ruby', 'php', 'kotlin', 'swift', 'sql',
];

const ContentStep: React.FC<ContentStepProps> = ({ formData, onChange, validationErrors }) => {
  const { t } = useTranslation();
  const isCode = formData.assignment_type === 'CODE' || formData.assignment_type === 'VIRTUAL_LAB';

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.contentTitle', 'Assignment content')}
      </h2>

      {/* Title */}
      <div>
        <label className="label" htmlFor="wizard-title">
          {t('assignment.title', 'Title')} *
        </label>
        <input
          id="wizard-title"
          type="text"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t('assignments.titlePlaceholder', 'Enter assignment title')}
          className={`input w-full ${validationErrors.title ? 'input-error' : ''}`}
        />
        {validationErrors.title && (
          <p className="error-text mt-1">{t(`validation.${validationErrors.title}`, validationErrors.title)}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            {t('assignment.description', 'Description')} *
          </label>
          <AIToolbarPlugin
            currentContent={formData.description}
            onContentUpdate={(content) => onChange({ description: content })}
          />
        </div>
        <ObsidianMDXEditor
          value={formData.description}
          onChange={(val) => onChange({ description: val })}
          placeholder={t('assignment.description_placeholder', 'Enter assignment description')}
        />
        {validationErrors.description && (
          <p className="error-text mt-1">{t(`validation.${validationErrors.description}`, validationErrors.description)}</p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            {t('assignment.instructions', 'Instructions')}
          </label>
          <AIToolbarPlugin
            currentContent={formData.instructions}
            onContentUpdate={(content) => onChange({ instructions: content })}
          />
        </div>
        <ObsidianMDXEditor
          value={formData.instructions}
          onChange={(val) => onChange({ instructions: val })}
          placeholder={t('assignment.instructions_placeholder', 'Enter instructions for students')}
        />
      </div>

      {/* Code-specific fields */}
      {isCode && (
        <>
          {/* Programming Language */}
          <div>
            <label className="label" htmlFor="wizard-language">
              {t('assignment.programming_language', 'Programming language')}
            </label>
            <select
              id="wizard-language"
              value={formData.programming_language}
              onChange={(e) => onChange({ programming_language: e.target.value })}
              className="input w-full"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Starter Code */}
          <div>
            <label className="label">{t('assignment.starter_code', 'Starter code')}</label>
            <CodeEditor
              value={formData.starter_code}
              onChange={(val) => onChange({ starter_code: val })}
              language={formData.programming_language}
              height="250px"
            />
          </div>

          {/* Solution Code */}
          <div>
            <label className="label">{t('assignment.solution_code', 'Solution code')}</label>
            <CodeEditor
              value={formData.solution_code}
              onChange={(val) => onChange({ solution_code: val })}
              language={formData.programming_language}
              height="250px"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ContentStep;
