import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, type PlagiarismCheckResponse } from '../api/ai';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

interface PlagiarismCheckPanelProps {
  submissionId: string;
}

const riskColors: Record<string, string> = {
  LOW: 'var(--fn-success)',
  MEDIUM: 'var(--fn-warning)',
  HIGH: 'var(--fn-error)',
};

export const PlagiarismCheckPanel: React.FC<PlagiarismCheckPanelProps> = ({ submissionId }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<PlagiarismCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.plagiarismCheck(submissionId);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check plagiarism');
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="mt-3">
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldExclamationIcon className="h-4 w-4" />
          )}
          {loading ? t('ai.checking', 'Checking...') : t('ai.checkPlagiarism', 'Check Plagiarism')}
        </button>
        {error && <p className="mt-2 text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}
      </div>
    );
  }

  const riskColor = riskColors[result.riskLevel] || 'var(--text-secondary)';

  return (
    <div className="mt-3 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ShieldExclamationIcon className="h-4 w-4" />
          {t('ai.plagiarismHints', 'Plagiarism Hints')}
        </h4>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: `${riskColor}20`, color: riskColor }}
        >
          {result.riskLevel}
        </span>
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{result.summary}</p>

      {result.indicators.length > 0 && (
        <ul className="space-y-1 mb-3">
          {result.indicators.map((ind, i) => (
            <li key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
              &bull; {ind}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>
        {t('ai.plagiarismDisclaimer', 'This is an AI-based analysis, not a definitive plagiarism check.')}
      </p>
    </div>
  );
};

export default PlagiarismCheckPanel;
