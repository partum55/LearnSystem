import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../../api/ai';
import { RubricDraft, RubricCriterion } from '../../../features/authoring/types';

interface AIRubricGeneratorProps {
  title: string;
  description: string;
  maxPoints: number;
  onApply: (rubric: RubricDraft) => void;
  onClose: () => void;
}

const AIRubricGenerator: React.FC<AIRubricGeneratorProps> = ({
  title,
  description,
  maxPoints,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RubricDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      // editContent returns a string directly
      const content = await aiApi.editContent({
        entity_type: 'ASSIGNMENT',
        entity_id: '',
        current_content: '',
        prompt: `Generate a detailed rubric for an assignment titled "${title}". Description: ${description}. Total points: ${maxPoints}. Return JSON with criteria array where each has: title, description, weight (points), explanation.`,
        language: 'en',
      });

      if (typeof content === 'string' && content.trim()) {
        try {
          const parsed = JSON.parse(content);
          const criteria: RubricCriterion[] = (parsed.criteria || parsed).map(
            (c: Record<string, unknown>, i: number) => ({
              id: `ai-criterion-${Date.now()}-${i}`,
              title: String(c.title || `Criterion ${i + 1}`),
              description: String(c.description || ''),
              weight: Number(c.weight || c.points || 0),
              explanation: String(c.explanation || ''),
              format: 'MARKDOWN' as const,
            })
          );
          setResult({ criteria, totalPoints: maxPoints });
        } catch {
          setResult({
            criteria: [{
              id: `ai-criterion-${Date.now()}`,
              title: 'AI Generated Rubric',
              description: content,
              weight: maxPoints,
              explanation: '',
              format: 'MARKDOWN',
            }],
            totalPoints: maxPoints,
          });
        }
      }
    } catch {
      setError(t('ai.generationFailed', 'Failed to generate rubric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {t('ai.rubric.title', 'AI Rubric Generator')}
          </h2>

          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('ai.rubric.desc', 'Generate a rubric based on your assignment details')}
          </p>

          {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          {result && (
            <div className="rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              {result.criteria.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.title}</span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({c.weight} pts)</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              {t('common.cancel', 'Cancel')}
            </button>
            {result ? (
              <button
                type="button"
                onClick={() => { onApply(result); onClose(); }}
                className="btn btn-primary flex-1 py-2"
              >
                {t('ai.rubric.apply', 'Apply Rubric')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={loading}
                className="btn btn-primary flex-1 py-2"
              >
                {loading ? t('ai.generating', 'Generating...') : t('ai.rubric.generate', 'Generate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AIRubricGenerator;
