import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Header, Sidebar, Card, CardHeader, CardBody, Button } from '../components';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import apiClient from '../api/client';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  LanguageIcon,
  MoonIcon,
  SunIcon,
  KeyIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export const ProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user, fetchCurrentUser, updateUserPreferences } = useAuthStore();
  const { theme, language, setTheme, setLanguage } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile form
  const [profileData, setProfileData] = useState({
    display_name: user?.display_name || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
  });
  
  // Password form
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  
  useEffect(() => {
    if (user) {
      setProfileData({
        display_name: user.display_name || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.patch('/auth/me/', profileData);
      await fetchCurrentUser();
      setMessage({ type: 'success', text: t('settings.profileUpdated', 'Profile updated successfully!') });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: t('settings.profileUpdateFailed', 'Failed to update profile') });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setMessage({ type: 'error', text: t('settings.passwordMismatch', 'Passwords do not match') });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort', 'Password must be at least 8 characters') });
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/change-password/', passwordData);
      setMessage({ type: 'success', text: t('settings.passwordChanged', 'Password changed successfully!') });
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMsg = error.response?.data?.old_password?.[0] || 
                       error.response?.data?.error || 
                       t('settings.passwordChangeFailed', 'Failed to change password');
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    await updateUserPreferences(undefined, newTheme);
  };

  const handleLanguageChange = async (newLanguage: 'uk' | 'en') => {
    setLanguage(newLanguage);
    await updateUserPreferences(newLanguage, undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('settings.title', 'Settings')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('settings.description', 'Manage your account settings and preferences')}
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Information */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('settings.profileInfo', 'Profile Information')}
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.email', 'Email')}
                    </label>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user?.email}</span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.emailCannotChange', 'Cannot be changed')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.displayName', 'Display Name')}
                    </label>
                    <input
                      type="text"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder={t('settings.displayNamePlaceholder', 'Your display name')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('settings.firstName', 'First Name')}
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={t('settings.firstNamePlaceholder', 'First name')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('settings.lastName', 'Last Name')}
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={t('settings.lastNamePlaceholder', 'Last name')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.bio', 'Bio')}
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                  <MoonIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('settings.appearance', 'Appearance')}
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('settings.theme', 'Theme')}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <SunIcon className="h-6 w-6 text-yellow-500" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {t('settings.light', 'Light')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.lightDesc', 'Light mode')}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <MoonIcon className="h-6 w-6 text-indigo-500" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {t('settings.dark', 'Dark')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.darkDesc', 'Dark mode')}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('settings.language', 'Language')}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          language === 'en'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <LanguageIcon className="h-6 w-6 text-blue-500" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {t('settings.lang_en', 'English')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">EN</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLanguageChange('uk')}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          language === 'uk'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <LanguageIcon className="h-6 w-6 text-yellow-500" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {t('settings.lang_uk', 'Українська')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">UK</div>
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
                  <KeyIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('settings.security', 'Security')}
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.currentPassword', 'Current Password')}
                    </label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.newPassword', 'New Password')}
                    </label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.confirmNewPassword', 'Confirm New Password')}
                    </label>
                    <input
                      type="password"
                      value={passwordData.new_password_confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                  <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('settings.accountInfo', 'Account Information')}
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('settings.role', 'Role')}</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {user?.role?.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('settings.accountCreated', 'Account Created')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('settings.studentId', 'Student ID')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user?.student_id || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileSettings;

