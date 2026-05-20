import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../api/ai';
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ExplainButtonProps {
  contentType: 'RESOURCE' | 'ASSIGNMENT' | 'QUIZ_QUESTION' | 'MODULE';
  contentText: string;
}

export const ExplainButton: React.FC<ExplainButtonProps> = ({ contentType, contentText }) => {
  const { t, i18n } = useTranslation();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (explanation) {
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.explain(contentType, contentText, i18n.language);
      setExplanation(response.explanation);
      setExpanded(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate explanation';
      if (message.includes('API key required')) {
        setError(t('apiKeys.required', 'Please add your Groq API key in Settings to use AI features.'));
      } else {
        setError(t('ai.explainError', 'Failed to generate explanation. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleExplain}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <SparklesIcon className="h-4 w-4" />
        )}
        {loading
          ? t('ai.explaining', 'Explaining...')
          : explanation
            ? (expanded ? t('ai.hideExplanation', 'Hide Explanation') : t('ai.showExplanation', 'Show Explanation'))
            : t('ai.explainThis', 'Explain This')
        }
        {explanation && !loading && (expanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />)}
      </button>

      {error && (
        <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--fn-error)' }}>
          {error}
        </div>
      )}

      {explanation && expanded && (
        <div
          className="mt-3 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {explanation}
        </div>
      )}
    </div>
  );
};

export default ExplainButton;
