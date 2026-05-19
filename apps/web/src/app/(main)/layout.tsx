'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Courses', path: '/courses' },
    { name: 'Assignments', path: '/assignments' },
    { name: 'Grades', path: '/grades' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Top Header */}
      <header className="h-14 border-b px-4 flex items-center justify-between sticky top-0 z-50" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
            <span className="font-semibold hidden sm:inline" style={{ fontFamily: 'var(--font-display)' }}>LearnSystem</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: pathname === item.path ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: pathname === item.path ? 'var(--bg-active)' : 'transparent',
                }}
              >
                {item.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="text-xs font-medium px-3 py-1.5 rounded border transition-all"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
