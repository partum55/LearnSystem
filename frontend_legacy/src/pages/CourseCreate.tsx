import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useCourseStore } from '../store/courseStore';
import { coursesApi } from '../api/courses';
import { SyllabusBuilder } from '../components/SyllabusBuilder';

const isHexColor = (value: string) =>
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

export const CourseCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateFromQuery = searchParams.get('template') || '';
  const { createCourse, fetchCourses, courses, isLoading } = useCourseStore();

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE' | 'DRAFT',
    start_date: '',
    end_date: '',
    max_students: '',
    thumbnail_url: '',
    theme_color: '#1f2937',
    is_template: Boolean(templateFromQuery),
    template_course_id: templateFromQuery,
    copy_schedule_dates: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSyllabusBuilder, setShowSyllabusBuilder] = useState(false);

  useEffect(() => {
    if (formData.is_template) {
      void fetchCourses();
    }
  }, [fetchCourses, formData.is_template]);

  const templateOptions = useMemo(
    () =>
      (courses || [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code)),
    [courses]
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name } = target;
    let value: string | boolean =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;
    if (name === 'code' && typeof value === 'string') {
      value = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('courses.errors.codeRequired');
    }
    if (!formData.is_template && !formData.title.trim()) {
      newErrors.title = t('courses.errors.titleRequired');
    }
    if (!formData.is_template && !formData.description.trim()) {
      newErrors.description = t('courses.errors.descriptionRequired');
    }
    if (formData.is_template && !formData.template_course_id) {
      newErrors.template_course_id = t('courses.templateRequired', 'Select a template course');
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = t('courses.errors.endDateBeforeStart');
      }
    }

    if (formData.max_students && parseInt(formData.max_students) < 1) {
      newErrors.max_students = t('courses.errors.maxStudentsPositive');
    }
    if (formData.theme_color && !isHexColor(formData.theme_color)) {
      newErrors.theme_color = t('courses.invalidThemeColor', 'Use HEX format, for example #1d4ed8');
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
      if (formData.is_template && formData.template_course_id) {
        const response = await coursesApi.cloneStructure(formData.template_course_id, {
          code: formData.code.trim().toUpperCase(),
          titleUk: formData.title.trim() || undefined,
          titleEn: formData.title.trim() || undefined,
          descriptionUk: formData.description.trim() || undefined,
          descriptionEn: formData.description.trim() || undefined,
          visibility: formData.visibility,
          startDate: formData.start_date || undefined,
          endDate: formData.end_date || undefined,
          maxStudents: formData.max_students ? parseInt(formData.max_students) : undefined,
          isPublished: formData.visibility !== 'DRAFT',
          thumbnailUrl: formData.thumbnail_url.trim() || undefined,
          themeColor: formData.theme_color.trim() || undefined,
          copyScheduleDates: formData.copy_schedule_dates,
        });
        navigate(`/courses/${response.data.courseId}`);
        return;
      }

      const newCourse = await createCourse({
        code: formData.code.trim().toUpperCase(),
        titleUk: formData.title.trim(),
        titleEn: formData.title.trim(),
        descriptionUk: formData.description.trim(),
        descriptionEn: formData.description.trim(),
        visibility: formData.visibility,
        startDate: formData.start_date || undefined,
        endDate: formData.end_date || undefined,
        maxStudents: formData.max_students ? parseInt(formData.max_students) : undefined,
        isPublished: formData.visibility !== 'DRAFT',
        thumbnailUrl: formData.thumbnail_url.trim() || undefined,
        themeColor: formData.theme_color.trim() || undefined,
      });
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
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: t('courses.title'), to: '/courses' },
              { label: t('courses.createCourse') },
            ]}
          />

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
                  <section
                    className="rounded-lg border p-4"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                  >
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="is_template"
                        checked={formData.is_template}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {t('courses.useTemplate', 'Create from existing course template')}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t(
                            'courses.useTemplateHint',
                            'Reuse modules, resources, assignments and quizzes for a new semester in one action.'
                          )}
                        </p>
                      </span>
                    </label>

                    {formData.is_template && (
                      <div className="mt-4 space-y-3">
                        <div className="input-group">
                          <label className="label">{t('courses.templateCourse', 'Template course')}</label>
                          <select
                            name="template_course_id"
                            value={formData.template_course_id}
                            onChange={handleChange}
                            className="input"
                          >
                            <option value="">
                              {t('courses.selectTemplate', 'Select course')}
                            </option>
                            {templateOptions.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.code} · {course.title}
                              </option>
                            ))}
                          </select>
                          {errors.template_course_id && (
                            <p className="error-text">{errors.template_course_id}</p>
                          )}
                        </div>

                        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <input
                            type="checkbox"
                            name="copy_schedule_dates"
                            checked={formData.copy_schedule_dates}
                            onChange={handleChange}
                            className="h-4 w-4"
                          />
                          {t('courses.copyScheduleDates', 'Copy due/publish dates as well')}
                        </label>
                      </div>
                    )}
                  </section>

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
                      required={!formData.is_template}
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">
                      {t('courses.description')}
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={5}
                      className="input"
                      style={{ resize: 'vertical' }}
                      placeholder={t('courses.descriptionPlaceholder')}
                      required={!formData.is_template}
                    />
                    {errors.description && (
                      <p className="error-text">{errors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Input
                        label={t('courses.thumbnailUrl', 'Course cover URL')}
                        name="thumbnail_url"
                        value={formData.thumbnail_url}
                        onChange={handleChange}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                      <Input
                        label={t('courses.themeColor', 'Theme color')}
                        name="theme_color"
                        value={formData.theme_color}
                        onChange={handleChange}
                        placeholder="#1d4ed8"
                        error={errors.theme_color}
                      />
                      <div
                        className="h-10 w-10 rounded-md border"
                        style={{
                          borderColor: 'var(--border-default)',
                          background: isHexColor(formData.theme_color)
                            ? formData.theme_color
                            : 'var(--bg-overlay)',
                        }}
                        aria-hidden="true"
                      />
                    </div>
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

            {/* AI Syllabus Builder */}
            <Card className="mt-6">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('ai.syllabusBuilder', 'AI Syllabus Builder')}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('ai.syllabusBuilderDesc', 'Generate a structured syllabus using AI based on your course description')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowSyllabusBuilder(true)}
                    disabled={!formData.description.trim()}
                  >
                    {t('ai.generateSyllabus', 'Generate Syllabus')}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <SyllabusBuilder
              isOpen={showSyllabusBuilder}
              onClose={() => setShowSyllabusBuilder(false)}
              onApply={(syllabusJson) => {
                setFormData({ ...formData, ...{ syllabus: syllabusJson } as Record<string, unknown> });
              }}
              courseDescription={formData.description}
            />

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
                {formData.is_template
                  ? t('courses.createFromTemplate', 'Create from template')
                  : t('courses.createCourse')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CourseCreate;
