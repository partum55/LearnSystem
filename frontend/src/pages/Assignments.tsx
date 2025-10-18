import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('assignments.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                All your assignments in one place
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('assignments.pending')}
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('assignments.submitted')}
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('assignments.graded')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  All Assignments
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                  No assignments available
                </p>
              </CardBody>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Assignments;
