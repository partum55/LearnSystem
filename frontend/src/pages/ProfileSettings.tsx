import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardHeader, CardBody, Button } from '../components';
import { useAuthStore } from '../store/authStore';
import { useUIStore, type ThemeMode } from '../store/uiStore';
import apiClient, { extractErrorMessage } from '../api/client';
import {
  UserCircleIcon,
  EnvelopeIcon,
  LanguageIcon,
  KeyIcon,
  ShieldCheckIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

export const ProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user, fetchCurrentUser, updateUserPreferences } = useAuthStore();
  const { theme, language, setTheme, setLanguage } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    displayName: user?.display_name || '',
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    bio: user?.bio || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.display_name || '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.put('/users/me', profileData);
      await fetchCurrentUser();
      setMessage({ type: 'success', text: t('settings.profileUpdated', 'Profile updated successfully!') });
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordMismatch', 'Passwords do not match') });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort', 'Password must be at least 8 characters') });
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/users/me/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: t('settings.passwordChanged', 'Password changed successfully!') });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      setMessage({ type: 'error', text: extractErrorMessage(err) || t('settings.passwordChangeFailed', 'Failed to change password') });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    await updateUserPreferences(undefined, newTheme);
  };

  const handleLanguageChange = async (newLanguage: 'uk' | 'en') => {
    setLanguage(newLanguage);
    await updateUserPreferences(newLanguage, undefined);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('settings.title', 'Settings')}
            </h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              {t('settings.description', 'Manage your account settings and preferences')}
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className="mb-6 p-4 rounded-lg text-sm"
              style={message.type === 'success'
                ? { background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: 'var(--fn-success)' }
                : { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }
              }
            >
              {message.text}
            </div>
          )}

          {/* Profile Information */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircleIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('settings.profileInfo', 'Profile Information')}
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="input-group">
                  <label className="label">
                    {t('settings.email', 'Email')}
                  </label>
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                  >
                    <EnvelopeIcon className="h-5 w-5" style={{ color: 'var(--text-faint)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('settings.emailCannotChange', 'Cannot be changed')}
                    </span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="label">
                    {t('settings.displayName', 'Display Name')}
                  </label>
                  <input
                    type="text"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                    className="input"
                    placeholder={t('settings.displayNamePlaceholder', 'Your display name')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="label">
                      {t('settings.firstName', 'First Name')}
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="input"
                      placeholder={t('settings.firstNamePlaceholder', 'First name')}
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">
                      {t('settings.lastName', 'Last Name')}
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="input"
                      placeholder={t('settings.lastNamePlaceholder', 'Last name')}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="label">
                    {t('settings.bio', 'Bio')}
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                    className="input"
                    style={{ resize: 'vertical' }}
                    placeholder={t('settings.bioPlaceholder', 'Tell us about yourself...')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Appearance */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <SwatchIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('settings.appearance', 'Appearance')}
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="label mb-3 block">
                    {t('settings.theme', 'Theme')}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Obsidian card */}
                    <button
                      onClick={() => handleThemeChange('obsidian')}
                      className="rounded-lg border-2 transition-all overflow-hidden text-left"
                      style={theme === 'obsidian'
                        ? { borderColor: 'var(--text-primary)', background: 'var(--bg-active)' }
                        : { borderColor: 'var(--border-default)', background: 'transparent' }
                      }
                    >
                      {/* Mini preview */}
                      <div className="p-3 rounded-t" style={{ background: '#09090b' }}>
                        <div className="flex gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: '#52525b' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#52525b' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#52525b' }} />
                        </div>
                        <div className="rounded" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 8px' }}>
                          <div className="h-1.5 rounded" style={{ background: '#27272a', width: '60%', marginBottom: '4px' }} />
                          <div className="h-1.5 rounded" style={{ background: '#27272a', width: '40%' }} />
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t('settings.obsidian', 'Obsidian')}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t('settings.obsidianDesc', 'Dark, focused, sharp')}
                        </div>
                      </div>
                    </button>

                    {/* Parchment card */}
                    <button
                      onClick={() => handleThemeChange('parchment')}
                      className="rounded-lg border-2 transition-all overflow-hidden text-left"
                      style={theme === 'parchment'
                        ? { borderColor: 'var(--text-primary)', background: 'var(--bg-active)' }
                        : { borderColor: 'var(--border-default)', background: 'transparent' }
                      }
                    >
                      {/* Mini preview */}
                      <div className="p-3 rounded-t" style={{ background: '#FDFAF5' }}>
                        <div className="flex gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: '#A89C8C' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#A89C8C' }} />
                          <div className="w-2 h-2 rounded-full" style={{ background: '#A89C8C' }} />
                        </div>
                        <div className="rounded" style={{ background: '#F7F3EC', border: '1px solid rgba(120,100,70,0.15)', padding: '6px 8px' }}>
                          <div className="h-1.5 rounded" style={{ background: '#EDE8DF', width: '60%', marginBottom: '4px' }} />
                          <div className="h-1.5 rounded" style={{ background: '#EDE8DF', width: '40%' }} />
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t('settings.parchment', 'Parchment')}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t('settings.parchmentDesc', 'Warm, literary, comfortable')}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="label mb-3 block">
                    {t('settings.language', 'Language')}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all"
                      style={language === 'en'
                        ? { borderColor: 'var(--text-primary)', background: 'var(--bg-active)' }
                        : { borderColor: 'var(--border-default)', background: 'transparent' }
                      }
                    >
                      <LanguageIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                      <div className="text-left">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t('settings.lang_en', 'English')}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>EN</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleLanguageChange('uk')}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all"
                      style={language === 'uk'
                        ? { borderColor: 'var(--text-primary)', background: 'var(--bg-active)' }
                        : { borderColor: 'var(--border-default)', background: 'transparent' }
                      }
                    >
                      <LanguageIcon className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
                      <div className="text-left">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t('settings.lang_uk', 'Українська')}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>UK</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyIcon className="h-6 w-6" style={{ color: 'var(--fn-error)' }} />
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('settings.security', 'Security')}
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="input-group">
                  <label className="label">
                    {t('settings.currentPassword', 'Current Password')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div className="input-group">
                  <label className="label">
                    {t('settings.newPassword', 'New Password')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div className="input-group">
                  <label className="label">
                    {t('settings.confirmNewPassword', 'Confirm New Password')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} variant="secondary">
                    {loading ? t('common.saving', 'Saving...') : t('settings.changePassword', 'Change Password')}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6" style={{ color: 'var(--fn-success)' }} />
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('settings.accountInfo', 'Account Information')}
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 text-sm">
                <div
                  className="flex justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{t('settings.role', 'Role')}</span>
                  <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
                <div
                  className="flex justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{t('settings.accountCreated', 'Account Created')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span style={{ color: 'var(--text-muted)' }}>{t('settings.studentId', 'Student ID')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user?.student_id || 'N/A'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
