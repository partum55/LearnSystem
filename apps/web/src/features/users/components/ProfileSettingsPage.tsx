'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  EnvelopeIcon,
  LanguageIcon,
  ShieldCheckIcon,
  SwatchIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import { useCurrentUser, useUpdateCurrentUser } from '../hooks/useUserQueries';
import { normalizeTheme, themeToApi, useUIStore, type ThemeMode, type UILang, type UISize } from '@/store/uiStore';
import { extractErrorMessage } from '@/api/client';
import { AiSettingsPanel } from './AiSettingsPanel';

type Message = { type: 'success' | 'error'; text: string } | null;

const localeToUi = (locale?: string | null): UILang => {
  const normalized = locale?.toLowerCase();
  return normalized === 'en' ? 'en' : 'uk';
};

const localeToApi = (locale: UILang): 'UK' | 'EN' => (locale === 'en' ? 'EN' : 'UK');

export function ProfileSettingsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const updateCurrentUser = useUpdateCurrentUser();
  const theme = useUIStore((state) => state.theme);
  const language = useUIStore((state) => state.language);
  const size = useUIStore((state) => state.size);
  const setTheme = useUIStore((state) => state.setTheme);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const setSize = useUIStore((state) => state.setSize);

  const [message, setMessage] = useState<Message>(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    if (!user) return;
    setProfileData({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
    if (user.theme) {
      setTheme(normalizeTheme(user.theme));
    }
    if (user.locale) {
      setLanguage(localeToUi(user.locale));
    }
  }, [setLanguage, setTheme, user]);

  const fullName = useMemo(() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user?.displayName || 'Profile';
  }, [user]);

  const savePreferences = async (next: { theme?: ThemeMode; language?: UILang }) => {
    setMessage(null);
    try {
      await updateCurrentUser.mutateAsync({
        theme: next.theme ? themeToApi(next.theme) : undefined,
        locale: next.language ? localeToApi(next.language) : undefined,
      });
      setMessage({ type: 'success', text: 'Preferences saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: extractErrorMessage(error) });
    }
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    void savePreferences({ theme: nextTheme });
  };

  const handleLanguageChange = (nextLanguage: UILang) => {
    setLanguage(nextLanguage);
    void savePreferences({ language: nextLanguage });
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await updateCurrentUser.mutateAsync({
        firstName: profileData.firstName.trim() || null,
        lastName: profileData.lastName.trim() || null,
        locale: localeToApi(language),
        theme: themeToApi(theme),
      });
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: extractErrorMessage(error) });
    }
  };

  if (isLoading) {
    return <Loading label="Loading profile settings..." />;
  }

  if (!user) {
    return (
      <section className="card">
        <div className="card-body">
          <h1 className="text-xl font-semibold">Profile unavailable</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in again to manage your account settings.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Account
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Profile settings</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage identity, appearance, and language.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}
          >
            {(user.displayName || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fullName}</p>
            <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          </div>
        </div>
      </header>

      {message && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            color: message.type === 'success' ? 'var(--fn-success)' : 'var(--fn-error)',
          }}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <form onSubmit={handleProfileSubmit} className="card">
            <div className="card-header flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="text-base font-semibold">Profile information</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="input-group">
                <label className="label">Email</label>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
                  <EnvelopeIcon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                  <span>{user.email}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>Read-only</span>
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  className="input"
                  value={profileData.firstName}
                  onChange={(event) => setProfileData((current) => ({ ...current, firstName: event.target.value }))}
                  maxLength={150}
                />
              </div>

              <div className="input-group">
                <label className="label" htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  className="input"
                  value={profileData.lastName}
                  onChange={(event) => setProfileData((current) => ({ ...current, lastName: event.target.value }))}
                  maxLength={150}
                />
              </div>
            </div>
            <div className="card-footer flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={updateCurrentUser.isPending}>
                {updateCurrentUser.isPending ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>

          <AiSettingsPanel />
        </div>

        <aside className="space-y-6">
          <section className="card">
            <div className="card-header flex items-center gap-2">
              <SwatchIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="text-base font-semibold">Appearance</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ThemeOption
                  label="Dark"
                  description="Obsidian"
                  active={theme === 'dark'}
                  onClick={() => handleThemeChange('dark')}
                  preview="dark"
                />
                <ThemeOption
                  label="Light"
                  description="Parchment"
                  active={theme === 'light'}
                  onClick={() => handleThemeChange('light')}
                  preview="light"
                />
              </div>

              <div className="input-group">
                <label className="label" htmlFor="ui-size">Interface size</label>
                <select
                  id="ui-size"
                  className="input"
                  value={size}
                  onChange={(event) => setSize(event.target.value as UISize)}
                >
                  <option value="sm">Compact</option>
                  <option value="md">Comfortable</option>
                  <option value="lg">Large</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header flex items-center gap-2">
              <LanguageIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="text-base font-semibold">Language</h2>
            </div>
            <div className="card-body grid grid-cols-2 gap-3">
              <PreferenceButton active={language === 'uk'} onClick={() => handleLanguageChange('uk')} label="Українська" hint="UK" />
              <PreferenceButton active={language === 'en'} onClick={() => handleLanguageChange('en')} label="English" hint="EN" />
            </div>
          </section>

          <section className="card">
            <div className="card-header flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" style={{ color: 'var(--fn-success)' }} />
              <h2 className="text-base font-semibold">Account</h2>
            </div>
            <div className="card-body space-y-3 text-sm">
              <MetaRow label="Role" value={user.role.toLowerCase()} />
              <MetaRow label="Status" value={user.isActive ? 'active' : 'inactive'} />
              <MetaRow label="Student ID" value={user.studentId || 'N/A'} />
              <MetaRow label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ThemeOption({
  label,
  description,
  active,
  onClick,
  preview,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  preview: ThemeMode;
}) {
  const isLight = preview === 'light';
  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-lg border-2 text-left transition-colors"
      style={{
        borderColor: active ? 'var(--text-primary)' : 'var(--border-default)',
        background: active ? 'var(--bg-active)' : 'transparent',
      }}
    >
      <div className="p-3" style={{ background: isLight ? '#FDFAF5' : '#09090b' }}>
        <div className="mb-2 flex gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: isLight ? '#A89C8C' : '#52525b' }} />
          <span className="h-2 w-2 rounded-full" style={{ background: isLight ? '#A89C8C' : '#52525b' }} />
          <span className="h-2 w-2 rounded-full" style={{ background: isLight ? '#A89C8C' : '#52525b' }} />
        </div>
        <div className="rounded border p-2" style={{ background: isLight ? '#F7F3EC' : '#18181b', borderColor: isLight ? 'rgba(120,100,70,0.15)' : 'rgba(255,255,255,0.08)' }}>
          <div className="mb-1 h-1.5 w-2/3 rounded" style={{ background: isLight ? '#E5DFD3' : '#27272a' }} />
          <div className="h-1.5 w-1/2 rounded" style={{ background: isLight ? '#E5DFD3' : '#27272a' }} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 text-sm font-medium">
          <span>{label}</span>
          {active && <CheckCircleIcon className="h-4 w-4" style={{ color: 'var(--fn-success)' }} />}
        </div>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </button>
  );
}

function PreferenceButton({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-2 text-left transition-colors"
      style={{
        borderColor: active ? 'var(--text-primary)' : 'var(--border-default)',
        background: active ? 'var(--bg-active)' : 'transparent',
      }}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-right font-medium capitalize">{value}</span>
    </div>
  );
}
