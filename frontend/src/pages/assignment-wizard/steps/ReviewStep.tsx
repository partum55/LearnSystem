import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { WizardFormData } from '../wizardTypes';

interface ReviewStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  onChange,
  onSaveDraft,
  onPublish,
  saving,
}) => {
  const { t } = useTranslation();

  const fieldSummary = [
    { label: t('assignment.type', 'Type'), value: formData.assignment_type },
    { label: t('assignment.title', 'Title'), value: formData.title },
    { label: t('assignment.max_points', 'Max points'), value: String(formData.max_points) },
    { label: t('assignment.due_date', 'Due date'), value: formData.due_date ? new Date(formData.due_date).toLocaleString() : t('assignments.noDueDate', 'No due date') },
    { label: t('assignment.available_from', 'Available from'), value: formData.available_from ? new Date(formData.available_from).toLocaleString() : '-' },
    { label: t('assignment.programming_language', 'Language'), value: formData.assignment_type === 'CODE' ? formData.programming_language : '-' },
    { label: t('assignment.resources', 'Resources'), value: `${formData.resources.length} attached` },
    { label: t('assignment.allow_late_submission', 'Late submission'), value: formData.allow_late_submission ? `${t('common.yes', 'Yes')} (${formData.late_penalty_percent}%)` : t('common.no', 'No') },
    { label: t('assignment.tags', 'Tags'), value: formData.tags.length > 0 ? formData.tags.join(', ') : '-' },
    { label: t('assignment.enable_auto_grading', 'Auto-grading'), value: formData.auto_grading_enabled ? `${t('common.yes', 'Yes')} (${formData.test_cases.length} tests)` : t('common.no', 'No') },
  ];

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.reviewTitle', 'Review & publish')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Field summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('wizard.summary', 'Summary')}
          </h3>
          <div
            className="rounded-lg divide-y"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}
          >
            {fieldSummary.map((field, index) => (
              <div key={index} className="flex justify-between px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{field.label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{field.value}</span>
              </div>
            ))}
          </div>

          {/* Publish toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => onChange({ is_published: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('assignments.publishImmediately', 'Publish immediately')}
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('wizard.publishHint', 'Students will be able to see this assignment right away')}
              </p>
            </div>
          </label>

          {/* Template toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <input
              type="checkbox"
              checked={formData.is_template}
              onChange={(e) => onChange({ is_template: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('assignment.save_as_template', 'Save as template')}
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('wizard.templateHint', 'Reuse this assignment as a template for future assignments')}
              </p>
            </div>
          </label>
        </div>

        {/* Right: Live preview */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('wizard.preview', 'Student preview')}
          </h3>
          <div
            className="rounded-lg p-5 overflow-y-auto max-h-[600px]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <h1
              className="text-2xl font-bold mb-3"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {formData.title || t('wizard.untitled', 'Untitled Assignment')}
            </h1>

            <div className="flex gap-3 mb-4 flex-wrap">
              <span className="badge">{formData.assignment_type}</span>
              <span className="badge">{formData.max_points} {t('assignments.points', 'pts')}</span>
              {formData.due_date && (
                <span className="badge">{t('assignment.due', 'Due')}: {new Date(formData.due_date).toLocaleDateString()}</span>
              )}
            </div>

            {formData.description && (
              <div className="prose prose-sm max-w-none mb-4" style={{ color: 'var(--text-primary)' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                  {formData.description}
                </ReactMarkdown>
              </div>
            )}

            {formData.instructions && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('assignment.instructions', 'Instructions')}
                </h3>
                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  >
                    {formData.instructions}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {formData.resources.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('assignment.resources', 'Resources')}
                </h3>
                <ul className="space-y-1">
                  {formData.resources.map((r, i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {r.name || r.url || `Resource ${i + 1}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="btn btn-secondary flex-1 py-3"
        >
          {saving ? t('common.saving', 'Saving...') : t('wizard.saveDraft', 'Save Draft')}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={saving}
          className="btn btn-primary flex-1 py-3"
        >
          {saving ? t('common.saving', 'Saving...') : t('wizard.publish', 'Save & Publish')}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
