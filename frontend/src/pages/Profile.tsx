import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Card, CardHeader, CardBody } from '../components/Card';
import { useAuthStore } from '../store/authStore';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('nav.profile')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name
                      </label>
                      <p className="text-gray-900 dark:text-white">{user?.display_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">{user?.role}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Preferences
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('settings.language')}
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {user?.locale === 'uk' ? 'Українська' : 'English'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('settings.theme')}
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">
                        {user?.theme || 'light'}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
