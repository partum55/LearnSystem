'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function RootInitializer({ children }: { children: React.ReactNode }) {
  const { fetchCurrentUser } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Wait for Zustand persist hydration to complete
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }
      await fetchCurrentUser();
      setIsInitialized(true);
    };
    initializeAuth();
  }, [fetchCurrentUser]);

  // Apply theme from localStorage on mount (preserving legacy logic)
  useEffect(() => {
    const raw = localStorage.getItem('theme') || 'obsidian';
    const theme = raw === 'dark' ? 'obsidian' : raw === 'light' ? 'parchment' : raw;
    const lang = (localStorage.getItem('language') || 'uk') as 'en' | 'uk';

    if (theme === 'parchment') {
      document.documentElement.setAttribute('data-theme', 'parchment');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add('dark');
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--text-muted)' }}></div>
      </div>
    );
  }

  return <>{children}</>;
}
