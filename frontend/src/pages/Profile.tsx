import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { useAuthStore } from '../store/authStore';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('nav.profile')}
            </h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              Manage your account settings and preferences
            </p>
          </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Personal Information
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-1 block">Name</label>
                      <p style={{ color: 'var(--text-primary)' }}>{user?.display_name}</p>
                    </div>
                    <div>
                      <label className="label mb-1 block">Email</label>
                      <p style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
                    </div>
                    <div>
                      <label className="label mb-1 block">Role</label>
                      <p className="capitalize" style={{ color: 'var(--text-primary)' }}>{user?.role}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Preferences
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-1 block">{t('settings.language')}</label>
                      <p style={{ color: 'var(--text-primary)' }}>
                        {user?.locale === 'uk' ? 'Українська' : 'English'}
                      </p>
                    </div>
                    <div>
                      <label className="label mb-1 block">{t('settings.theme')}</label>
                      <p className="capitalize" style={{ color: 'var(--text-primary)' }}>
                        {user?.theme || 'light'}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
