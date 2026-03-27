import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useCourseStore } from '../store/courseStore';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Loading } from '../components/Loading';
import { Course, CourseCreateData } from '../types';

const isHexColor = (value: string) =>
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

export const CourseEdit: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { currentCourse, fetchCourseById, updateCourse, deleteCourse, isLoadingCourse, isLoading } = useCourseStore();

    useEffect(() => {
        if (id) {
            fetchCourseById(id);
        }
    }, [id, fetchCourseById]);

    if (isLoadingCourse || !currentCourse) {
        return <Loading />;
    }

    const handleUpdate = async (data: CourseCreateData) => {
        if (!id) return;
        await updateCourse(id, data as unknown as Partial<Course>);
        navigate(`/courses/${id}`);
    }

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteCourse(id);
            navigate('/courses');
        } catch (error) {
            console.error('Failed to delete course:', error);
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
                            { label: currentCourse.title || currentCourse.code || t('courses.title'), to: `/courses/${id}` },
                            { label: t('common.edit') },
                        ]}
                    />

                    {/* Header */}
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1
                                className="text-3xl font-bold"
                                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                            >
                                {t('courses.editCourse')}
                            </h1>
                            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                                {currentCourse.code}: {currentCourse.title}
                            </p>
                        </div>
                    </div>

                    <CourseEditFormLogic
                        course={currentCourse}
                        onSubmit={handleUpdate}
                        onDelete={handleDelete}
                        isLoading={isLoading}
                        onCancel={() => navigate(`/courses/${id}`)}
                    />
                </div>
            </div>
        </Layout>
    );
};

interface CourseEditFormLogicProps {
    course: Course;
    onSubmit: (data: CourseCreateData) => Promise<void>;
    onDelete: () => Promise<void>;
    isLoading: boolean;
    onCancel: () => void;
}

const CourseEditFormLogic: React.FC<CourseEditFormLogicProps> = ({ course, onSubmit, onDelete, isLoading, onCancel }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        code: course.code,
        title: course.title,
        description: course.description || '',
        visibility: (course.visibility as 'PUBLIC' | 'PRIVATE' | 'DRAFT') || 'PRIVATE',
        startDate: course.startDate ? new Date(course.startDate).toISOString().split('T')[0] : '',
        endDate: course.endDate ? new Date(course.endDate).toISOString().split('T')[0] : '',
        maxStudents: course.maxStudents ? String(course.maxStudents) : '',
        thumbnail_url: course.thumbnailUrl || '',
        theme_color: course.themeColor || '#1f2937',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name } = e.target;
        const value = name === 'code' ? e.target.value.toUpperCase() : e.target.value;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.code.trim()) newErrors.code = t('courses.errors.codeRequired');
        if (!formData.title.trim()) newErrors.title = t('courses.errors.titleRequired');
        if (!formData.description.trim()) newErrors.description = t('courses.errors.descriptionRequired');
        if (formData.startDate && formData.endDate) {
            if (new Date(formData.startDate) > new Date(formData.endDate)) {
                newErrors.endDate = t('courses.errors.endDateBeforeStart');
            }
        }
        if (formData.maxStudents && parseInt(formData.maxStudents) < 1) {
            newErrors.maxStudents = t('courses.errors.maxStudentsPositive');
        }
        if (formData.theme_color && !isHexColor(formData.theme_color)) {
            newErrors.theme_color = t('courses.invalidThemeColor', 'Use HEX format, for example #1d4ed8');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const courseData: CourseCreateData = {
                code: formData.code.trim(),
                titleUk: formData.title.trim(),
                titleEn: formData.title.trim(),
                descriptionUk: formData.description.trim(),
                descriptionEn: formData.description.trim(),
                visibility: formData.visibility,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined,
                isPublished: formData.visibility !== 'DRAFT',
                thumbnailUrl: formData.thumbnail_url.trim() || undefined,
                themeColor: formData.theme_color.trim() || undefined,
            };
            await onSubmit(courseData);
        } catch (error) {
            console.error(error);
            setErrors({ submit: t('courses.errors.updateFailed') });
        }
    };

    return (
        <>
            <div className="flex justify-end mb-4 -mt-16">
                <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    {t('courses.deleteCourse')}
                </Button>
            </div>

            <CourseEditForm
                onSubmit={handleSubmit}
                errors={errors}
                isLoading={isLoading}
                onCancel={onCancel}
                formData={formData}
                onChange={handleChange}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                >
                    <div
                        className="rounded-lg max-w-md w-full p-6"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                        <h3
                            className="text-xl font-bold mb-4"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {t('courses.deleteCourseConfirmTitle')}
                        </h3>
                        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
                            {t('courses.deleteCourseConfirmMessage')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    onDelete().catch(() => {
                                        setErrors({ delete: t('courses.errors.deleteFailed') });
                                        setShowDeleteConfirm(false);
                                    });
                                }}
                                isLoading={isLoading}
                            >
                                {t('common.delete')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

interface CourseEditFormProps {
    onSubmit: (e: React.FormEvent) => void;
    errors: Record<string, string>;
    isLoading: boolean;
    onCancel: () => void;
    formData: {
        code: string;
        title: string;
        description: string;
        visibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
        startDate: string;
        endDate: string;
        maxStudents: string;
        thumbnail_url: string;
        theme_color: string;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const CourseEditForm: React.FC<CourseEditFormProps> = ({ onSubmit, errors, isLoading, onCancel, formData, onChange }) => {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSubmit}>
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
                                onChange={onChange}
                                placeholder="CS101"
                                error={errors.code}
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label={t('courses.courseTitle')}
                                name="title"
                                value={formData.title}
                                onChange={onChange}
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
                                onChange={onChange}
                                rows={5}
                                className="input"
                                style={{ resize: 'vertical' }}
                                required
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
                                    onChange={onChange}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                                <Input
                                    label={t('courses.themeColor', 'Theme color')}
                                    name="theme_color"
                                    value={formData.theme_color}
                                    onChange={onChange}
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
                                onChange={onChange}
                                className="input"
                            >
                                <option value="PUBLIC">{t('courses.public')}</option>
                                <option value="PRIVATE">{t('courses.private')}</option>
                                <option value="DRAFT">{t('courses.draft')}</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label={t('courses.startDate')}
                                    name="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={onChange}
                                />
                            </div>
                            <div>
                                <Input
                                    label={t('courses.endDate')}
                                    name="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={onChange}
                                    error={errors.endDate}
                                />
                            </div>
                        </div>

                        <div>
                            <Input
                                label={t('courses.maxStudents')}
                                name="maxStudents"
                                type="number"
                                min="1"
                                value={formData.maxStudents}
                                onChange={onChange}
                                error={errors.maxStudents}
                            />
                        </div>

                        {errors.submit && (
                            <div
                                className="rounded-md px-3 py-2 text-sm"
                                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
                            >
                                {errors.submit}
                            </div>
                        )}
                        {errors.delete && (
                            <div
                                className="rounded-md px-3 py-2 text-sm"
                                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
                            >
                                {errors.delete}
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            <div className="mt-6 flex justify-end gap-4">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    {t('common.cancel')}
                </Button>
                <Button
                    type="submit"
                    isLoading={isLoading}
                >
                    {t('common.save')}
                </Button>
            </div>
        </form>
    );
};

export default CourseEdit;
