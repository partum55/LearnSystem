import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { AssignmentType } from '../types';
import { assignmentsApi, quizzesApi } from '../api/assessments';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions_count: number;
  total_points: number;
}

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  moduleId?: string;
  onAssignmentCreated: () => void;
}

const ASSIGNMENT_TYPES: { value: AssignmentType; labelKey: string; descriptionKey: string }[] = [
  { value: 'FILE_UPLOAD', labelKey: 'assignments.types.fileUpload', descriptionKey: 'assignments.types.fileUploadDesc' },
  { value: 'TEXT', labelKey: 'assignments.types.text', descriptionKey: 'assignments.types.textDesc' },
  { value: 'CODE', labelKey: 'assignments.types.code', descriptionKey: 'assignments.types.codeDesc' },
  { value: 'URL', labelKey: 'assignments.types.url', descriptionKey: 'assignments.types.urlDesc' },
  { value: 'QUIZ', labelKey: 'assignments.types.quiz', descriptionKey: 'assignments.types.quizDesc' },
  { value: 'MANUAL_GRADE', labelKey: 'assignments.types.manualGrade', descriptionKey: 'assignments.types.manualGradeDesc' },
  { value: 'EXTERNAL', labelKey: 'assignments.types.external', descriptionKey: 'assignments.types.externalDesc' },
];

const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  courseId,
  moduleId,
  onAssignmentCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [formData, setFormData] = useState({
    assignment_type: 'FILE_UPLOAD' as AssignmentType,
    title: '',
    description: '',
    instructions: '',
    max_points: '100',
    due_date: '',
    available_from: '',
    available_until: '',
    allow_late_submission: false,
    late_penalty_percent: '0',
    // File upload settings
    allowed_file_types: '',
    max_file_size: '10485760', // 10 MB in bytes
    max_files: '5',
    // Code settings
    programming_language: 'python',
    auto_grading_enabled: false,
    // External tool settings
    external_tool_url: '',
    // Quiz settings
    quiz_id: '',
    // Grading settings
    grade_anonymously: false,
    peer_review_enabled: false,
    peer_reviews_required: '0',
    is_published: false,
  });
  const [error, setError] = useState('');

  // Fetch available quizzes when the QUIZ type is selected
  const fetchAvailableQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    try {
      const response = await quizzesApi.getAll(courseId);
      const data = response.data as any;
      const quizzes = Array.isArray(data) ? data : data.results || [];
      setAvailableQuizzes(quizzes);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (formData.assignment_type === 'QUIZ' && isOpen) {
      fetchAvailableQuizzes();
    }
  }, [formData.assignment_type, isOpen, fetchAvailableQuizzes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate Quiz selection
      if (formData.assignment_type === 'QUIZ' && !formData.quiz_id) {
        setError(t('assignments.errors.quizRequired'));
        setLoading(false);
        return;
      }

      // Build submission types based on assignment type
      let submission_types: string[] = [];
      if (formData.assignment_type === 'FILE_UPLOAD') {
        submission_types = ['file'];
      } else if (formData.assignment_type === 'TEXT') {
        submission_types = ['text'];
      } else if (formData.assignment_type === 'CODE') {
        submission_types = ['text'];
      } else if (formData.assignment_type === 'URL') {
        submission_types = ['url'];
      }

      const payload: any = {
        course: courseId,
        module: moduleId || null,
        assignment_type: formData.assignment_type,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        max_points: parseFloat(formData.max_points),
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        available_from: formData.available_from ? new Date(formData.available_from).toISOString() : null,
        available_until: formData.available_until ? new Date(formData.available_until).toISOString() : null,
        allow_late_submission: formData.allow_late_submission,
        late_penalty_percent: parseFloat(formData.late_penalty_percent),
        grade_anonymously: formData.grade_anonymously,
        peer_review_enabled: formData.peer_review_enabled,
        peer_reviews_required: parseInt(formData.peer_reviews_required),
        is_published: formData.is_published,
        submission_types,
      };

      // Add type-specific fields
      if (formData.assignment_type === 'FILE_UPLOAD') {
        payload.allowed_file_types = formData.allowed_file_types
          ? formData.allowed_file_types.split(',').map(s => s.trim()).filter(s => s)
          : [];
        payload.max_file_size = parseInt(formData.max_file_size);
        payload.max_files = parseInt(formData.max_files);
      } else if (formData.assignment_type === 'CODE') {
        payload.programming_language = formData.programming_language;
        payload.auto_grading_enabled = formData.auto_grading_enabled;
        payload.test_cases = [];
      } else if (formData.assignment_type === 'EXTERNAL') {
        payload.external_tool_url = formData.external_tool_url;
        payload.external_tool_config = {};
      } else if (formData.assignment_type === 'QUIZ') {
        payload.quiz = formData.quiz_id;
      }

      await assignmentsApi.create(payload);

      // Reset form
      setFormData({
        assignment_type: 'FILE_UPLOAD',
        title: '',
        description: '',
        instructions: '',
        max_points: '100',
        due_date: '',
        available_from: '',
        available_until: '',
        allow_late_submission: false,
        late_penalty_percent: '0',
        allowed_file_types: '',
        max_file_size: '10485760',
        max_files: '5',
        programming_language: 'python',
        auto_grading_enabled: false,
        external_tool_url: '',
        quiz_id: '',
        grade_anonymously: false,
        peer_review_enabled: false,
        peer_reviews_required: '0',
        is_published: false,
      });
      onAssignmentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || t('assignments.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('assignments.createAssignment')} size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Assignment Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('assignments.type')} *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ASSIGNMENT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`
                  relative flex cursor-pointer rounded-lg border p-4 focus:outline-none
                  ${formData.assignment_type === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }
                `}
              >
                <input
                  type="radio"
                  name="assignment_type"
                  value={type.value}
                  checked={formData.assignment_type === type.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex flex-col flex-1">
                  <span className={`block text-sm font-medium ${
                    formData.assignment_type === type.value
                      ? 'text-blue-900 dark:text-blue-200'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {t(type.labelKey)}
                  </span>
                  <span className={`mt-1 text-xs ${
                    formData.assignment_type === type.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {t(type.descriptionKey)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Basic Information */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('assignments.basicInfo')}
          </h3>

          <div className="space-y-4">
            <Input
              label={t('assignments.title')}
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder={t('assignments.titlePlaceholder')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assignments.description')} *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder={t('assignments.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assignments.instructions')}
              </label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder={t('assignments.instructionsPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Dates and Points */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('assignments.schedule')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('assignments.maxPoints')}
              name="max_points"
              type="number"
              value={formData.max_points}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />

            <Input
              label={t('assignments.dueDate')}
              name="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={handleChange}
            />

            <Input
              label={t('assignments.availableFrom')}
              name="available_from"
              type="datetime-local"
              value={formData.available_from}
              onChange={handleChange}
            />

            <Input
              label={t('assignments.availableUntil')}
              name="available_until"
              type="datetime-local"
              value={formData.available_until}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="allow_late_submission"
                id="allow_late_submission"
                checked={formData.allow_late_submission}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allow_late_submission" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('assignments.allowLateSubmission')}
              </label>
            </div>

            {formData.allow_late_submission && (
              <Input
                label={t('assignments.latePenaltyPercent')}
                name="late_penalty_percent"
                type="number"
                value={formData.late_penalty_percent}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
              />
            )}
          </div>
        </div>

        {/* Type-Specific Settings */}
        {formData.assignment_type === 'FILE_UPLOAD' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('assignments.fileUploadSettings')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('assignments.allowedFileTypes')}
                </label>
                <input
                  type="text"
                  name="allowed_file_types"
                  value={formData.allowed_file_types}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder=".pdf, .docx, .zip"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('assignments.allowedFileTypesHelp')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('assignments.maxFileSize')} (MB)
                  </label>
                  <input
                    type="number"
                    name="max_file_size"
                    value={(parseInt(formData.max_file_size) / 1048576).toFixed(0)}
                    onChange={(e) => {
                      const mb = parseFloat(e.target.value) || 0;
                      handleChange({
                        ...e,
                        target: { ...e.target, name: 'max_file_size', value: (mb * 1048576).toString() }
                      } as any);
                    }}
                    min="1"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <Input
                  label={t('assignments.maxFiles')}
                  name="max_files"
                  type="number"
                  value={formData.max_files}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>
          </div>
        )}

        {formData.assignment_type === 'CODE' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('assignments.codeSubmissionSettings')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('assignments.programmingLanguage')} *
                </label>
                <select
                  name="programming_language"
                  value={formData.programming_language}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  {PROGRAMMING_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="auto_grading_enabled"
                  id="auto_grading_enabled"
                  checked={formData.auto_grading_enabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_grading_enabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  {t('assignments.enableAutoGrading')}
                </label>
              </div>

              {formData.auto_grading_enabled && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {t('assignments.autoGradingNote')}
                </p>
              )}
            </div>
          </div>
        )}

        {formData.assignment_type === 'EXTERNAL' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('assignments.externalToolSettings')}
            </h3>
            <Input
              label={t('assignments.externalToolUrl')}
              name="external_tool_url"
              type="url"
              value={formData.external_tool_url}
              onChange={handleChange}
              placeholder="https://example.com/tool"
              required
            />
          </div>
        )}

        {formData.assignment_type === 'QUIZ' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('assignments.quizSettings')}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('assignments.selectQuiz')} *
              </label>
              <select
                name="quiz_id"
                value={formData.quiz_id}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                disabled={loadingQuizzes}
              >
                <option value="">{t('common.select')}...</option>
                {availableQuizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title} ({quiz.questions_count} {t('common.questions')})
                  </option>
                ))}
              </select>
              {loadingQuizzes && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('common.loading')}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grading Options */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('assignments.gradingOptions')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="grade_anonymously"
                id="grade_anonymously"
                checked={formData.grade_anonymously}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="grade_anonymously" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('assignments.gradeAnonymously')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="peer_review_enabled"
                id="peer_review_enabled"
                checked={formData.peer_review_enabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="peer_review_enabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('assignments.enablePeerReview')}
              </label>
            </div>

            {formData.peer_review_enabled && (
              <Input
                label={t('assignments.peerReviewsRequired')}
                name="peer_reviews_required"
                type="number"
                value={formData.peer_reviews_required}
                onChange={handleChange}
                min="1"
                max="10"
              />
            )}
          </div>
        </div>

        {/* Publish Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_published"
              id="is_published_assignment"
              checked={formData.is_published}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_published_assignment" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              {t('assignments.publishImmediately')}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {t('assignments.createAssignment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
