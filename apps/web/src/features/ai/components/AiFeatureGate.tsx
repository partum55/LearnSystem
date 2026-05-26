import type { ReactNode } from 'react';
import { Loading } from '@/components/Loading';
import { useAiSettings } from '../hooks/useAiSettings';
import { AiDisabledState } from './AiDisabledState';
import { AiKeyRequiredState } from './AiKeyRequiredState';

interface AiFeatureGateProps {
  children: ReactNode;
  compact?: boolean;
  placeholder?: ReactNode;
}

export function AiFeatureGate({ children, compact = false, placeholder }: AiFeatureGateProps) {
  const { data: settings, isLoading, error } = useAiSettings();

  if (isLoading) {
    return compact ? (
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Checking AI settings...</div>
    ) : (
      <Loading label="Checking AI settings..." />
    );
  }

  if (error || !settings) {
    return placeholder ?? <AiKeyRequiredState compact={compact} />;
  }

  if (!settings.aiEnabled) {
    return <AiDisabledState compact={compact} />;
  }

  if (settings.effectiveKeySource === 'NONE') {
    return <AiKeyRequiredState compact={compact} />;
  }

  return (
    <div className="space-y-3">
      {settings.effectiveKeySource === 'SYSTEM_KEY' && (
        <div
          className="rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-muted)' }}
        >
          Using system Gemini key
        </div>
      )}
      {children}
    </div>
  );
}
