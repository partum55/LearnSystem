import React from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import CodeEditor from '../../../components/CodeEditor';
import {
  BlockEditor,
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../../../features/editor-core';
import { editorMediaApi } from '../../../api/pages';
import { CanonicalDocument } from '../../../types';

interface ContentStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  validationErrors: Record<string, string>;
  templateDocument: CanonicalDocument;
  onTemplateChange: (document: CanonicalDocument) => void;
}

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'cpp', 'c',
  'csharp', 'go', 'rust', 'ruby', 'php', 'kotlin', 'swift', 'sql',
];

const ContentStep: React.FC<ContentStepProps> = ({
  formData,
  onChange,
  validationErrors,
  templateDocument,
  onTemplateChange,
}) => {
  const { t } = useTranslation();
  const isCode = formData.assignment_type === 'CODE' || formData.assignment_type === 'VIRTUAL_LAB';
  const isQuiz = formData.assignment_type === 'QUIZ';

  const descriptionDocument = parseCanonicalDocument(formData.description, '');
  const instructionsDocument = parseCanonicalDocument(formData.instructions, '');

  const handleUploadMedia = async (file: File) => {
    const response = await editorMediaApi.upload(file);
    return { url: response.data.url, contentType: response.data.contentType };
  };

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
        <label className="label mb-2 block">
          {t('assignment.description', 'Description')} *
        </label>
        <BlockEditor
          value={descriptionDocument}
          onChange={(doc) =>
            onChange({
              description: serializeCanonicalDocument(doc),
              description_format: 'RICH',
            })
          }
          mode="full"
          placeholder={t('assignment.description_placeholder', 'Enter assignment description')}
          onUploadMedia={handleUploadMedia}
        />
        {validationErrors.description && (
          <p className="error-text mt-1">{t(`validation.${validationErrors.description}`, validationErrors.description)}</p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <label className="label mb-2 block">
          {t('assignment.instructions', 'Instructions')}
        </label>
        <BlockEditor
          value={instructionsDocument}
          onChange={(doc) =>
            onChange({
              instructions: serializeCanonicalDocument(doc),
              instructions_format: 'RICH',
            })
          }
          mode="full"
          placeholder={t('assignment.instructions_placeholder', 'Enter instructions for students')}
          onUploadMedia={handleUploadMedia}
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

      {!isQuiz && (
        <div>
          <label className="label mb-2 block">
            {t('assignment.answer_template', 'Student answer template (optional)')}
          </label>
          <BlockEditor
            value={templateDocument}
            onChange={onTemplateChange}
            mode="lite"
            placeholder={t('assignment.answer_template_placeholder', 'Prefill starter worksheet content for students')}
            onUploadMedia={handleUploadMedia}
          />
        </div>
      )}

      {isQuiz && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{ background: 'rgba(161, 161, 170, 0.06)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
        >
          {t('wizard.quizContentHint', 'Quiz questions are configured in the Grading step. Add description and instructions above.')}
        </div>
      )}
    </div>
  );
};

export default ContentStep;
