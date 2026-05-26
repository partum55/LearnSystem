export function AiDisabledState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? 'rounded-lg border px-3 py-2 text-xs' : 'rounded-lg border p-4 text-sm'}
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-muted)' }}
    >
      AI features are disabled.
    </div>
  );
}
