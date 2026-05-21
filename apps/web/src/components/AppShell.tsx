'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/courses', label: 'Courses' },
  { href: '/gradebook', label: 'Gradebook' },
  { href: '/profile', label: 'Profile' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const globalRole = currentUser?.role ?? currentUser?.globalRole;
  const navItems = [
    ...baseNavItems,
    ...(globalRole === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            LearnSystem
          </Link>
          {currentUser && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {globalRole}
            </span>
          )}
          <nav className="flex flex-wrap gap-2 text-sm">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
