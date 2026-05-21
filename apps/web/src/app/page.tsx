import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">LearnSystem</p>
        <h1 className="mt-3 text-4xl font-semibold">Canonical LMS frontend</h1>
        <p className="mt-4 text-lg text-slate-600">
          The active app now talks only to the canonical learning-service /api/v1 surface.
        </p>
        <div className="mt-8 flex gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/dashboard">
            Open dashboard
          </Link>
          <Link className="rounded-md border border-slate-300 px-4 py-2" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
