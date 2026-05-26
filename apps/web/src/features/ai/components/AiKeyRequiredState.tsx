import Link from 'next/link';

export function AiKeyRequiredState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? 'rounded-lg border px-3 py-2 text-xs' : 'rounded-lg border p-4 text-sm'}
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}
    >
      <p style={{ color: 'var(--text-secondary)' }}>
        AI features are unavailable. Add your Gemini API key in Profile - AI Settings.
      </p>
      <Link href="/profile#ai-settings" className="btn btn-secondary btn-sm mt-3 inline-flex">
        Go to AI Settings
      </Link>
    </div>
  );
}
