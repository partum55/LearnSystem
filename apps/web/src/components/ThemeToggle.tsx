'use client';

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useUIStore } from '@/store/uiStore';

interface ThemeToggleProps {
  onChange?: (theme: 'dark' | 'light') => void;
}

export function ThemeToggle({ onChange }: ThemeToggleProps) {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';
  const handleClick = () => {
    const nextTheme = toggleTheme();
    onChange?.(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
      style={{ color: 'var(--text-muted)' }}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
