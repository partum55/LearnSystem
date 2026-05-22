export function Loading({ label = 'Loading' }: { label?: string }) {
  return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}...</p>;
}
