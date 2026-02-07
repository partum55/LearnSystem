import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { aiApi, CourseGenerationRequest, GeneratedCourse } from '../../api/ai';
import { extractErrorMessage } from '../../api/client';
import { SparklesIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Loading } from '../Loading';

interface AICourseGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseGenerated?: (course: GeneratedCourse) => void;
  userId?: string;
  authToken?: string;
}

type Step = 'prompt' | 'options' | 'generating' | 'preview' | 'success';

export const AICourseGenerator: React.FC<AICourseGeneratorProps> = ({
  isOpen,
  onClose,
  onCourseGenerated,
  userId,
  authToken,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('prompt');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<CourseGenerationRequest>({
    prompt: '',
    language: 'uk',
    include_modules: true,
    include_assignments: false,
    include_quizzes: false,
    academic_year: '2024-2025',
  });
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(t('ai.errors.promptRequired'));
      return;
    }

    setStep('generating');
    setError('');

    try {
      const request: CourseGenerationRequest = {
        ...options,
        prompt: prompt.trim(),
      };

      const result = await aiApi.generateCourse(request);
      setGeneratedCourse(result);
      setStep('preview');
    } catch (err) {
      console.error('Failed to generate course:', err);
      setError(extractErrorMessage(err));
      setStep('prompt');
    }
  };

  const handleSave = async () => {
    if (!generatedCourse || !userId || !authToken) return;

    setSaving(true);
    setError('');

    try {
      const request: CourseGenerationRequest = {
        ...options,
        prompt: prompt.trim(),
      };

      await aiApi.generateAndSaveCourse(request, userId);
      setStep('success');

      if (onCourseGenerated) {
        onCourseGenerated(generatedCourse);
      }
    } catch (err) {
      console.error('Failed to save course:', err);
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('prompt');
    setPrompt('');
    setGeneratedCourse(null);
    setError('');
    onClose();
  };

  const renderPromptStep = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400">
        <SparklesIcon className="w-8 h-8" />
        <h3 className="text-xl font-semibold">{t('ai.generateCourse')}</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('ai.coursePromptHint')}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('ai.coursePrompt')}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('ai.coursePromptPlaceholder')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <XCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => setStep('options')}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t('ai.generationOptions')}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('ai.language')}
        </label>
        <select
          value={options.language}
          onChange={(e) => setOptions({ ...options, language: e.target.value as 'uk' | 'en' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     dark:bg-gray-700 dark:text-white"
        >
          <option value="uk">Українська</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('ai.academicYear')}
        </label>
        <Input
          type="text"
          value={options.academic_year}
          onChange={(e) => setOptions({ ...options, academic_year: e.target.value })}
          placeholder="2024-2025"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.include_modules}
            onChange={(e) => setOptions({ ...options, include_modules: e.target.checked })}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('ai.includeModules')}
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.include_assignments}
            onChange={(e) => setOptions({ ...options, include_assignments: e.target.checked })}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            disabled={!options.include_modules}
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('ai.includeAssignments')}
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={options.include_quizzes}
            onChange={(e) => setOptions({ ...options, include_quizzes: e.target.checked })}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            disabled={!options.include_modules}
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('ai.includeQuizzes')}
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={() => setStep('prompt')}>
          {t('common.back')}
        </Button>
        <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
          <SparklesIcon className="w-5 h-5 mr-2" />
          {t('ai.generate')}
        </Button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="py-12 text-center space-y-4">
      <Loading />
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('ai.generating')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('ai.generatingHint')}
        </p>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!generatedCourse) return null;

    const { course, modules } = generatedCourse;

    return (
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('ai.previewCourse')}
        </h3>

        {/* Course Info */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('course.code')}:
            </span>
            <span className="ml-2 text-gray-900 dark:text-white">{course.code}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('course.title')}:
            </span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {options.language === 'uk' ? course.titleUk : course.titleEn}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('course.description')}:
            </span>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {options.language === 'uk' ? course.descriptionUk : course.descriptionEn}
            </p>
          </div>
        </div>

        {/* Modules */}
        {modules && modules.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t('course.modules')} ({modules.length})
            </h4>
            {modules.map((module, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  {index + 1}. {module.title}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {module.description}
                </p>
                {module.assignments && module.assignments.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    📝 {module.assignments.length} {t('course.assignments')}
                  </div>
                )}
                {module.quizzes && module.quizzes.length > 0 && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    📊 {module.quizzes.length} {t('course.quizzes')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <XCircleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" onClick={() => setStep('options')}>
            {t('ai.regenerate')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('ai.saveToDatabase')}
          </Button>
        </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="py-12 text-center space-y-4">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('ai.courseCreated')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('ai.courseCreatedHint')}
        </p>
      </div>
      <Button onClick={handleClose}>{t('common.close')}</Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="large" title={t('ai.generateCourse')}>
      <div className="p-6">
        {step === 'prompt' && renderPromptStep()}
        {step === 'options' && renderOptionsStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'success' && renderSuccessStep()}
      </div>
    </Modal>
  );
};

