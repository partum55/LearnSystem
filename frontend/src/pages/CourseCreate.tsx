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
        titleUk: formData.title.trim(),
        titleEn: formData.title.trim(),
        descriptionUk: formData.description.trim(),
        descriptionEn: formData.description.trim(),
        visibility: formData.visibility,
        startDate: formData.start_date || undefined,
        endDate: formData.end_date || undefined,
        maxStudents: formData.max_students ? parseInt(formData.max_students) : undefined,
        isPublished: formData.visibility !== 'DRAFT',
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
          <div className="flex items-center text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            <button
              onClick={() => navigate('/courses')}
              className="flex items-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              {t('courses.title')}
            </button>
            <span className="mx-2">/</span>
            <span>{t('courses.createCourse')}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {t('courses.createCourse')}
            </h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              {t('courses.createCourseDescription')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('courses.basicInformation')}
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
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
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('courses.courseCodeHint')}
                    </p>
                  </div>

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

                  <div className="input-group">
                    <label className="label">
                      {t('courses.description')} *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={5}
                      className="input"
                      style={{ resize: 'vertical' }}
                      placeholder={t('courses.descriptionPlaceholder')}
                      required
                    />
                    {errors.description && (
                      <p className="error-text">{errors.description}</p>
                    )}
                  </div>

                  <div className="input-group">
                    <label className="label">
                      {t('courses.visibility')}
                    </label>
                    <select
                      name="visibility"
                      value={formData.visibility}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="PUBLIC">{t('courses.public')}</option>
                      <option value="PRIVATE">{t('courses.private')}</option>
                      <option value="DRAFT">{t('courses.draft')}</option>
                    </select>
                    <p className="help-text">
                      {formData.visibility === 'PUBLIC' && t('courses.publicHint')}
                      {formData.visibility === 'PRIVATE' && t('courses.privateHint')}
                      {formData.visibility === 'DRAFT' && t('courses.draftHint')}
                    </p>
                  </div>

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
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('courses.maxStudentsHint')}
                    </p>
                  </div>

                  {errors.submit && (
                    <div
                      className="rounded-md px-3 py-2 text-sm"
                      style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
                    >
                      {errors.submit}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

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
