import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, LanguageIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { user, logout, updateUserPreferences } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const changeLanguage = (lang: 'uk' | 'en') => {
    i18n.changeLanguage(lang);
    updateUserPreferences(lang, undefined);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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
        {/* Left: menu + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Toggle menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
              }}
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

        {/* Right: actions */}
        <div className="flex items-center gap-0.5">
          {/* Language */}
          <Menu as="div" className="relative hidden sm:block">
            <Menu.Button
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <LanguageIcon className="h-4 w-4" />
            </Menu.Button>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Menu.Items
                className="absolute right-0 mt-1 w-40 rounded-lg overflow-hidden focus:outline-none z-10 animate-slide-down"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="py-0.5">
                  {([['uk', '🇺🇦 Українська'], ['en', '🇬🇧 English']] as const).map(([code, label]) => (
                    <Menu.Item key={code}>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={() => changeLanguage(code)}
                          className="block w-full text-left px-3 py-2 text-sm transition-colors"
                          style={{
                            background: active ? 'var(--bg-active)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {label}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <BellIcon className="h-4 w-4" />
            {unreadCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--text-primary)' }}
              />
            )}
          </Link>

          {/* User */}
          <Menu as="div" className="relative ml-1">
            <Menu.Button className="flex items-center gap-2 py-1 px-1.5 rounded-md transition-colors hover:bg-white/[0.04]">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span
                className="text-sm hidden md:block"
                style={{ color: 'var(--text-secondary)' }}
              >
                {user?.display_name}
              </span>
            </Menu.Button>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Menu.Items
                className="absolute right-0 mt-1 w-48 rounded-lg overflow-hidden focus:outline-none z-10 animate-slide-down"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user?.display_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="py-0.5">
                  {[
                    { to: '/profile', label: t('nav.profile') },
                    { to: '/settings', label: t('nav.settings') },
                  ].map((item) => (
                    <Menu.Item key={item.to}>
                      {({ active }: { active: boolean }) => (
                        <Link
                          to={item.to}
                          className="block px-3 py-2 text-sm transition-colors"
                          style={{
                            background: active ? 'var(--bg-active)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {item.label}
                        </Link>
                      )}
                    </Menu.Item>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm transition-colors"
                        style={{
                          background: active ? 'var(--bg-active)' : 'transparent',
                          color: 'var(--text-muted)',
                        }}
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
    </header>
  );
};
