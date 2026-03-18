import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  Cog6ToothIcon,
  ClipboardIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { pluginRegistry } from '../plugins/pluginRegistry';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('nav.courses'), href: '/courses', icon: AcademicCapIcon },
    { name: t('nav.calendar'), href: '/calendar', icon: CalendarIcon },
    { name: t('nav.today', 'Due today'), href: '/today', icon: ClockIcon },
    { name: t('nav.assignments'), href: '/assignments', icon: DocumentTextIcon },
    { name: t('nav.grades'), href: '/grades', icon: ChartBarIcon },
    { name: t('nav.profile'), href: '/profile', icon: UserIcon },
  ];

  if (user?.role === 'TEACHER' || user?.role === 'TA' || user?.role === 'SUPERADMIN') {
    navigation.splice(3, 0,
      { name: t('nav.questionBank', 'Question Bank'), href: '/question-bank', icon: ClipboardDocumentListIcon },
      { name: t('nav.teacherTodo', 'Teacher To-do'), href: '/teacher/todo', icon: ClipboardIcon }
    );
  }

  navigation.push(
    { name: t('nav.marketplace', 'Marketplace'), href: '/marketplace', icon: PuzzlePieceIcon }
  );

  // Add plugin-registered nav items
  if (user?.role) {
    const pluginNavItems = pluginRegistry.getNavItems(user.role);
    pluginNavItems.forEach(item => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.push({ name: item.label, href: item.href, icon: item.icon as any });
    });
  }

  if (user?.role === 'SUPERADMIN') {
    navigation.push(
      { name: t('nav.admin', 'Admin Panel'), href: '/admin', icon: Cog6ToothIcon },
      { name: t('nav.designSystem', 'Design System'), href: '/design-system', icon: BeakerIcon }
    );
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

      {/* Sidebar */}
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
        {/* Mobile close */}
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
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className="group flex items-center px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-100"
              style={({ isActive }) => ({
                background: isActive ? 'var(--bg-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className="mr-2.5 h-4 w-4 flex-shrink-0"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-faint)',
                    }}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User at bottom */}
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
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.display_name}
              </p>
              <p className="text-[11px] capitalize truncate" style={{ color: 'var(--text-faint)' }}>
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
