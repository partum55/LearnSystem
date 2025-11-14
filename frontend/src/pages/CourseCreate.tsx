import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useCourseStore } from '../store/courseStore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const CourseCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createCourse, isLoading } = useCourseStore();

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE' | 'DRAFT',
    start_date: '',
    end_date: '',
    max_students: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('courses.errors.codeRequired');
    }
    if (!formData.title.trim()) {
      newErrors.title = t('courses.errors.titleRequired');
    }
    if (!formData.description.trim()) {
      newErrors.description = t('courses.errors.descriptionRequired');
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = t('courses.errors.endDateBeforeStart');
      }
    }

    if (formData.max_students && parseInt(formData.max_students) < 1) {
      newErrors.max_students = t('courses.errors.maxStudentsPositive');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const courseData = {
        code: formData.code.trim(),
        title_en: formData.title.trim(),
        title_uk: formData.title.trim(),
        description_en: formData.description.trim(),
        description_uk: formData.description.trim(),
        visibility: formData.visibility,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined,
        is_published: formData.visibility !== 'DRAFT',
      };

      const newCourse = await createCourse(courseData);
      navigate(`/courses/${newCourse.id}`);
    } catch (error) {
      console.error('Failed to create course:', error);
      setErrors({ submit: t('courses.errors.createFailed') });
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <button
                onClick={() => navigate('/courses')}
                className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                {t('courses.title')}
              </button>
              <span className="mx-2">/</span>
              <span>{t('courses.createCourse')}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('courses.createCourse')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('courses.createCourseDescription')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('courses.basicInformation')}
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-6">
                    {/* Course Code */}
                    <div>
                      <Input
                        label={t('courses.courseCode')}
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="CS101"
                        error={errors.code}
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('courses.courseCodeHint')}
                      </p>
                    </div>

                    {/* Course Title */}
                    <div>
                      <Input
                        label={t('courses.courseTitle')}
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder={t('courses.courseTitlePlaceholder')}
                        error={errors.title}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('courses.description')} *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={5}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder={t('courses.descriptionPlaceholder')}
                        required
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors.description}
                        </p>
                      )}
                    </div>

                    {/* Visibility */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('courses.visibility')}
                      </label>
                      <select
                        name="visibility"
                        value={formData.visibility}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="PUBLIC">{t('courses.public')}</option>
                        <option value="PRIVATE">{t('courses.private')}</option>
                        <option value="DRAFT">{t('courses.draft')}</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formData.visibility === 'PUBLIC' && t('courses.publicHint')}
                        {formData.visibility === 'PRIVATE' && t('courses.privateHint')}
                        {formData.visibility === 'DRAFT' && t('courses.draftHint')}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Input
                          label={t('courses.startDate')}
                          name="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <Input
                          label={t('courses.endDate')}
                          name="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={handleChange}
                          error={errors.end_date}
                        />
                      </div>
                    </div>

                    {/* Max Students */}
                    <div>
                      <Input
                        label={t('courses.maxStudents')}
                        name="max_students"
                        type="number"
                        min="1"
                        value={formData.max_students}
                        onChange={handleChange}
                        placeholder="50"
                        error={errors.max_students}
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('courses.maxStudentsHint')}
                      </p>
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                        <p className="text-sm text-red-800 dark:text-red-400">
                          {errors.submit}
                        </p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/courses')}
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                >
                  {t('courses.createCourse')}
                </Button>
              </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CourseCreate;
