'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import clsx from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type NavItem = { name: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const globalRole = String(user?.globalRole ?? user?.role ?? '').toUpperCase();

  const isTeacher = globalRole === 'TEACHER' || globalRole === 'ADMIN';
  const isAdmin = globalRole === 'ADMIN';

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Courses', href: '/courses', icon: AcademicCapIcon },
    { name: 'Assignments', href: '/assignments', icon: DocumentTextIcon },
    { name: 'Gradebook', href: '/gradebook', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  if (isTeacher) {
    navigation.splice(3, 0,
      { name: 'Question Bank', href: '/question-bank', icon: ClipboardDocumentListIcon },
      { name: 'Teacher To-do', href: '/teacher/todo', icon: ClipboardIcon },
    );
  }

  if (isAdmin) {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: Cog6ToothIcon });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-56 transform transition-transform duration-200 lg:relative lg:inset-auto lg:translate-x-0 flex flex-col flex-shrink-0 self-stretch',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-3">
          <button
            onClick={onClose}
            className="p-1 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-1 lg:mt-3 px-2 space-y-0.5 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="group flex items-center px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-100"
                style={{
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <item.icon
                  className="mr-2.5 h-4 w-4 flex-shrink-0"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-faint)' }}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{
                background: 'var(--bg-overlay)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.displayName ?? user?.email}
              </p>
              <p className="text-[11px] capitalize truncate" style={{ color: 'var(--text-faint)' }}>
                {(globalRole ?? 'user').toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
