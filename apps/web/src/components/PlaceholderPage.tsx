export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        This section is being rebuilt for the canonical /api/v1 API.
      </p>
    </section>
  );
}
