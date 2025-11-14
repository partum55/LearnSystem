import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';

export const Grades: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('grades.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                View your grades and performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">-</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('grades.average')}
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Graded Assignments
                    </p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Courses
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('grades.gradebook')}
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                  {t('grades.noGrades')}
                </p>
              </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Grades;
