export function Loading({ label = 'Loading' }: { label?: string }) {
  return <p className="text-sm text-slate-500">{label}...</p>;
}
