import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, UserCircleIcon, SunIcon, MoonIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, updateUserPreferences } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    return savedTheme || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Also update user preferences on backend
    updateUserPreferences(undefined, newTheme);
  };

  const changeLanguage = (lang: 'uk' | 'en') => {
    i18n.changeLanguage(lang);
    updateUserPreferences(lang, undefined);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              LMS
            </div>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* Language toggle */}
            <Menu as="div" className="relative">
              <Menu.Button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <LanguageIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Menu.Button>
              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={() => changeLanguage('uk')}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                        >
                          Українська
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={() => changeLanguage('en')}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                        >
                          English
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <UserCircleIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">
                  {user?.display_name}
                </span>
              </Menu.Button>
              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <Link
                          to="/profile"
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                        >
                          {t('nav.profile')}
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <Link
                          to="/settings"
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                        >
                          {t('nav.settings')}
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                        >
                          {t('auth.logout')}
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
};
