import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useCourseStore } from '../store/courseStore';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Loading } from '../components/Loading';
import { Course, CourseCreateData } from '../types';

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
        // Store expects Partial<Course> but API might need CourseCreateData structure (camelCase dates)
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
                    {/* Breadcrumb */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <button
                            onClick={() => navigate(`/courses/${id}`)}
                            className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            <ArrowLeftIcon className="h-4 w-4 mr-1" />
                            {t('courses.backToCourse')}
                        </button>
                        <span className="mx-2">/</span>
                        <span>{t('common.edit')}</span>
                    </div>

                    {/* Header */}
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {t('courses.editCourse')}
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
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
        start_date: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : '',
        end_date: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : '',
        max_students: course.max_students ? String(course.max_students) : '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
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
        if (!validateForm()) return;

        try {
            const courseData: CourseCreateData = {
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('courses.deleteCourseConfirmTitle')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
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

// Internal Form Component to handle rendering
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
        start_date: string;
        end_date: string;
        max_students: string;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const CourseEditForm: React.FC<CourseEditFormProps> = ({ onSubmit, errors, isLoading, onCancel, formData, onChange }) => {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSubmit}>
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
                                onChange={onChange}
                                placeholder="CS101"
                                error={errors.code}
                                required
                            />
                        </div>

                        {/* Course Title */}
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

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('courses.description')} *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={onChange}
                                rows={5}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
                                onChange={onChange}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="PUBLIC">{t('courses.public')}</option>
                                <option value="PRIVATE">{t('courses.private')}</option>
                                <option value="DRAFT">{t('courses.draft')}</option>
                            </select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label={t('courses.startDate')}
                                    name="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={onChange}
                                />
                            </div>
                            <div>
                                <Input
                                    label={t('courses.endDate')}
                                    name="end_date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={onChange}
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
                                onChange={onChange}
                                error={errors.max_students}
                            />
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                                <p className="text-sm text-red-800 dark:text-red-400">
                                    {errors.submit}
                                </p>
                            </div>
                        )}
                        {errors.delete && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                                <p className="text-sm text-red-800 dark:text-red-400">
                                    {errors.delete}
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
