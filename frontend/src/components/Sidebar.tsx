import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('nav.courses'), href: '/courses', icon: AcademicCapIcon },
    { name: t('nav.assignments'), href: '/assignments', icon: DocumentTextIcon },
    { name: t('nav.grades'), href: '/grades', icon: ChartBarIcon },
    { name: t('nav.profile'), href: '/profile', icon: UserIcon },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <nav className="mt-5 px-2 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
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
                    'mr-3 h-5 w-5',
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
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.display_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
