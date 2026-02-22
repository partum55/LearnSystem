import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Loading } from '../components/Loading';
import { useCourseStore } from '../store/courseStore';

export const Assignments: React.FC = () => {
  const { t } = useTranslation();
  const { fetchCourses, isLoading } = useCourseStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('assignments.title')}
            </h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              All your assignments in one place
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>0</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('assignments.pending')}
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>0</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('assignments.submitted')}
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>0</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('assignments.graded')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  All Assignments
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  No assignments available
                </p>
              </CardBody>
            </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Assignments;
