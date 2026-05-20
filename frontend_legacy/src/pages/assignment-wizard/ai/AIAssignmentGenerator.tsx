import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, GeneratedAssignment } from '../../../api/ai';
import { WizardFormData } from '../wizardTypes';

interface AIAssignmentGeneratorProps {
  courseId: string;
  onApply: (partial: Partial<WizardFormData>) => void;
  onClose: () => void;
}

const AIAssignmentGenerator: React.FC<AIAssignmentGeneratorProps> = ({
  courseId,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // generateAssignments expects moduleId + moduleTopic
      const response = await aiApi.generateAssignments({
        moduleId: courseId,
        moduleTopic: prompt,
        language: 'en',
      });

      // response is { moduleId, assignments: GeneratedAssignment[] }
      const assignments = response.assignments || [];
      if (assignments.length > 0) {
        setResult(assignments[0]);
      }
    } catch {
      setError(t('ai.generationFailed', 'Failed to generate assignment'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply({
      title: result.title || '',
      description: result.description || '',
      instructions: result.instructions || '',
      max_points: result.maxPoints || 100,
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-lg p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('ai.assignment.generate', 'AI Assignment Generator')}
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-active)]">
              <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <label className="label text-sm">{t('ai.assignment.prompt', 'Describe the assignment')}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('ai.assignment.promptPlaceholder', 'e.g., Create a Python data structures assignment about linked lists with 3 exercises')}
              className="input w-full text-sm"
              rows={4}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
          )}

          {result && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {result.title || 'Generated Assignment'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {(result.description || '').slice(0, 200)}...
              </p>
              <button
                type="button"
                onClick={handleApply}
                className="btn btn-primary text-sm px-4 py-1.5 mt-2"
              >
                {t('ai.assignment.apply', 'Apply to wizard')}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary flex-1 py-2"
            >
              {loading ? t('ai.generating', 'Generating...') : t('ai.assignment.generateBtn', 'Generate')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssignmentGenerator;
