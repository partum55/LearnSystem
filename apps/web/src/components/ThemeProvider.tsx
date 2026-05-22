'use client';

import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/store/uiStore';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const applyStoredPreferences = useUIStore((state) => state.applyStoredPreferences);

  useEffect(() => {
    applyStoredPreferences();
  }, [applyStoredPreferences]);

  return <>{children}</>;
}
