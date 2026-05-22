'use client';

import Link from 'next/link';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 h-12 flex items-center px-4 sm:px-5"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex justify-between items-center w-full">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Toggle menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
            >
              LS
            </div>
            <span
              className="text-sm font-semibold hidden sm:block"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              LearnSystem
            </span>
          </Link>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-0.5">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Notifications"
          >
            <BellIcon className="h-4 w-4" />
          </button>

          <Menu as="div" className="relative ml-1">
            <MenuButton className="flex items-center gap-2 py-1 px-1.5 rounded-md transition-colors hover:bg-white/[0.04]">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span
                className="text-sm hidden md:block"
                style={{ color: 'var(--text-secondary)' }}
              >
                {user?.displayName ?? user?.email}
              </span>
            </MenuButton>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <MenuItems
                className="absolute right-0 mt-1 w-48 rounded-lg overflow-hidden focus:outline-none z-10"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.displayName ?? user?.email}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="py-0.5">
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <Link
                        href="/profile"
                        className="block px-3 py-2 text-sm transition-colors"
                        style={{
                          background: focus ? 'var(--bg-active)' : 'transparent',
                          color: focus ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        Profile
                      </Link>
                    )}
                  </MenuItem>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm transition-colors"
                        style={{
                          background: focus ? 'var(--bg-active)' : 'transparent',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Sign out
                      </button>
                    )}
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
