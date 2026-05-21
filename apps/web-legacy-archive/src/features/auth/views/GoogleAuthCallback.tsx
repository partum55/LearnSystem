"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export const GoogleAuthCallback: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const finalizeLogin = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.error('Google OAuth session recovery failed', error);
        router.push('/login', {
          replace: true,
          state: { message: t('auth.googleLoginFailed', 'Google login failed. Please try again.') },
        });
        return;
      }

      await fetchCurrentUser();
      router.push('/dashboard', { replace: true });
    };

    void finalizeLogin();
  }, [fetchCurrentUser, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <p style={{ color: 'var(--text-muted)' }}>
        {t('auth.processingGoogleLogin', 'Completing Google login...')}
      </p>
    </div>
  );
};

export default GoogleAuthCallback;
