'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { Input, Button } from '../../../components';
import { PasswordInput } from '../../../components/PasswordInput';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      router.push('/login?message=Check your email to confirm your registration');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
        <div className="relative z-10 text-center px-12 max-w-md">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Join LearnSystem</h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>Start your learning journey today</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
              <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>LearnSystem</span>
            </div>
            <div className="ml-auto"><LanguageSwitcher /></div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Create account</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in the details below</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}>{error}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Full Name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
            <Button type="submit" fullWidth isLoading={isLoading}>Register</Button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account? <a href="/login" className="font-medium" style={{ color: 'var(--text-primary)' }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
