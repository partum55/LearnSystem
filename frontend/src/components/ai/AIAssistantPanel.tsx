import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../api/ai';
import {
  SparklesIcon,
  DocumentPlusIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../Button';
import { Loading } from '../Loading';

interface AIAssistantPanelProps {
  courseId?: string;
  moduleId?: string;
  isOpen: boolean;
  onClose: () => void;
  onContentGenerated?: (type: string, content: any) => void;
}

type AIFunction = 'modules' | 'assignments' | 'quiz' | 'questions';

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  courseId,
  moduleId,
  isOpen,
  onClose,
  onContentGenerated,
}) => {
  const { t } = useTranslation();
  const [activeFunction, setActiveFunction] = useState<AIFunction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [modulePrompt, setModulePrompt] = useState('');
  const [moduleCount, setModuleCount] = useState(4);
  const [assignmentTopic, setAssignmentTopic] = useState('');
  const [assignmentCount, setAssignmentCount] = useState(3);
  const [quizTopic, setQuizTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);

  const handleGenerateModules = async () => {
    if (!courseId || !modulePrompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await aiApi.generateModules({
        courseId,
        prompt: modulePrompt,
        language: 'uk',
        moduleCount,
      });

      if (onContentGenerated) {
        onContentGenerated('modules', result.modules);
      }

      setModulePrompt('');
      setActiveFunction(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('ai.errors.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignments = async () => {
    if (!moduleId || !assignmentTopic.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await aiApi.generateAssignments({
        moduleId,
        moduleTopic: assignmentTopic,
        language: 'uk',
        assignmentCount,
      });

      if (onContentGenerated) {
        onContentGenerated('assignments', result.assignments);
      }

      setAssignmentTopic('');
      setActiveFunction(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('ai.errors.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!courseId || !quizTopic.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await aiApi.generateQuiz({
        courseId,
        topic: quizTopic,
        language: 'uk',
        questionCount,
        timeLimit,
      });

      if (onContentGenerated) {
        onContentGenerated('quiz', result.quizzes);
      }

      setQuizTopic('');
      setActiveFunction(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('ai.errors.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderFunctionForm = () => {
    if (loading) {
      return (
        <div className="py-8 text-center">
          <Loading />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t('ai.generating')}
          </p>
        </div>
      );
    }

    switch (activeFunction) {
      case 'modules':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t('ai.generateModules')}
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.modulePrompt')}
              </label>
              <textarea
                value={modulePrompt}
                onChange={(e) => setModulePrompt(e.target.value)}
                placeholder={t('ai.modulePromptPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.moduleCount')}
              </label>
              <input
                type="number"
                value={moduleCount}
                onChange={(e) => setModuleCount(Number(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <Button onClick={handleGenerateModules} disabled={!modulePrompt.trim()}>
              <SparklesIcon className="w-4 h-4 mr-2" />
              {t('ai.generate')}
            </Button>
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t('ai.generateAssignments')}
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.assignmentTopic')}
              </label>
              <input
                type="text"
                value={assignmentTopic}
                onChange={(e) => setAssignmentTopic(e.target.value)}
                placeholder={t('ai.assignmentTopicPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.assignmentCount')}
              </label>
              <input
                type="number"
                value={assignmentCount}
                onChange={(e) => setAssignmentCount(Number(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <Button onClick={handleGenerateAssignments} disabled={!assignmentTopic.trim()}>
              <SparklesIcon className="w-4 h-4 mr-2" />
              {t('ai.generate')}
            </Button>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t('ai.generateQuiz')}
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.quizTopic')}
              </label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder={t('ai.quizTopicPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.questionCount')}
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={5}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('ai.timeLimit')} ({t('quiz.minutes')})
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={5}
                max={180}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <Button onClick={handleGenerateQuiz} disabled={!quizTopic.trim()}>
              <SparklesIcon className="w-4 h-4 mr-2" />
              {t('ai.generate')}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50
                    transform transition-transform duration-300 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-purple-600 dark:bg-purple-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-6 h-6" />
          <h3 className="font-semibold">{t('ai.assistant')}</h3>
        </div>
        <button onClick={onClose} className="hover:bg-purple-700 dark:hover:bg-purple-800 rounded p-1">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!activeFunction && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('ai.assistantHint')}
            </p>

            {/* AI Functions */}
            <div className="space-y-2">
              {courseId && (
                <button
                  onClick={() => setActiveFunction('modules')}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700
                           hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <DocumentPlusIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('ai.generateModules')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t('ai.generateModulesHint')}
                    </div>
                  </div>
                </button>
              )}

              {moduleId && (
                <button
                  onClick={() => setActiveFunction('assignments')}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700
                           hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('ai.generateAssignments')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t('ai.generateAssignmentsHint')}
                    </div>
                  </div>
                </button>
              )}

              {courseId && (
                <button
                  onClick={() => setActiveFunction('quiz')}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700
                           hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <AcademicCapIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('ai.generateQuiz')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t('ai.generateQuizHint')}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </>
        )}

        {activeFunction && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setActiveFunction(null);
                setError('');
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              ← {t('common.back')}
            </button>

            {renderFunctionForm()}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

