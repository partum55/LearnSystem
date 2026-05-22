export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="card">
      <div className="card-body">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
        This section is currently under development.
      </p>
      </div>
    </section>
  );
}
