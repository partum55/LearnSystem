'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const result = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push('/dashboard');
  };

  const signInWithGoogle = async () => {
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    // signInWithOAuth redirects the user, so we don't need to push
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <label className="mt-6 block text-sm font-medium">
          Email
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-white" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button
          onClick={signInWithGoogle}
          className="w-full rounded-md border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
