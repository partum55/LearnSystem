import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, type GradeSuggestionResponse } from '../api/ai';
import { Button } from './index';
import { SparklesIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GradingSuggestionPanelProps {
  assignmentId: string;
  submissionId: string;
  onAccept: (grade: number, feedback: string) => void;
}

export const GradingSuggestionPanel: React.FC<GradingSuggestionPanelProps> = ({
  assignmentId, submissionId, onAccept,
}) => {
  const { t } = useTranslation();
  const [suggestion, setSuggestion] = useState<GradeSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.gradeSuggestion(assignmentId, submissionId);
      setSuggestion(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get grade suggestion');
    } finally {
      setLoading(false);
    }
  };

  if (!suggestion) {
    return (
      <div className="mt-4">
        <button
          onClick={handleGetSuggestion}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <SparklesIcon className="h-4 w-4" />
          )}
          {loading ? t('ai.analyzing', 'Analyzing...') : t('ai.getGradeSuggestion', 'Get AI Suggestion')}
        </button>
        {error && (
          <p className="mt-2 text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <SparklesIcon className="h-4 w-4" />
          {t('ai.gradeSuggestion', 'AI Grade Suggestion')}
        </h4>
        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {suggestion.suggestedGrade}/{suggestion.maxPoints}
        </span>
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{suggestion.feedback}</p>

      {suggestion.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--fn-success)' }}>
            {t('ai.strengths', 'Strengths')}
          </p>
          <ul className="space-y-1">
            {suggestion.strengths.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--fn-success)' }}>+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestion.improvements.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--fn-warning)' }}>
            {t('ai.improvements', 'Areas for Improvement')}
          </p>
          <ul className="space-y-1">
            {suggestion.improvements.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--fn-warning)' }}>-</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button onClick={() => onAccept(suggestion.suggestedGrade, suggestion.feedback)}>
          <CheckIcon className="h-4 w-4 mr-1" />
          {t('ai.accept', 'Accept')}
        </Button>
        <Button variant="secondary" onClick={() => setSuggestion(null)}>
          <XMarkIcon className="h-4 w-4 mr-1" />
          {t('ai.reject', 'Reject')}
        </Button>
      </div>
    </div>
  );
};

export default GradingSuggestionPanel;
