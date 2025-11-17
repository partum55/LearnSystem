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
} from '@heroicons/react/24/outline';
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
    { name: t('nav.assignments'), href: '/assignments', icon: DocumentTextIcon },
    { name: t('nav.grades'), href: '/grades', icon: ChartBarIcon },
    { name: t('nav.profile'), href: '/profile', icon: UserIcon },
  ];

  // Add teacher and admin-specific links
  if (user?.role === 'TEACHER' || user?.role === 'SUPERADMIN') {
    navigation.splice(3, 0,
      { name: t('nav.questionBank', 'Question Bank'), href: '/question-bank', icon: ClipboardDocumentListIcon },
      { name: t('nav.quizBuilder', 'Quiz Builder'), href: '/quiz-builder', icon: BeakerIcon }
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-5 px-2 space-y-1 flex-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive
                        ? 'text-blue-700 dark:text-blue-200'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {user?.display_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
