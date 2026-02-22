import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../api/ai';
import { extractErrorMessage } from '../../api/client';
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
  onContentGenerated?: (type: string, content: unknown) => void;
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
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
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
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
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
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderFunctionForm = () => {
    if (loading) {
      return (
        <div className="py-8 text-center">
          <Loading />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('ai.generating')}
          </p>
        </div>
      );
    }

    switch (activeFunction) {
      case 'modules':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('ai.generateModules')}
            </h4>
            <div>
              <label className="label block mb-1">
                {t('ai.modulePrompt')}
              </label>
              <textarea
                value={modulePrompt}
                onChange={(e) => setModulePrompt(e.target.value)}
                placeholder={t('ai.modulePromptPlaceholder')}
                rows={3}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label block mb-1">
                {t('ai.moduleCount')}
              </label>
              <input
                type="number"
                value={moduleCount}
                onChange={(e) => setModuleCount(Number(e.target.value))}
                min={1}
                max={10}
                className="input w-full text-sm"
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
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('ai.generateAssignments')}
            </h4>
            <div>
              <label className="label block mb-1">
                {t('ai.assignmentTopic')}
              </label>
              <input
                type="text"
                value={assignmentTopic}
                onChange={(e) => setAssignmentTopic(e.target.value)}
                placeholder={t('ai.assignmentTopicPlaceholder')}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label block mb-1">
                {t('ai.assignmentCount')}
              </label>
              <input
                type="number"
                value={assignmentCount}
                onChange={(e) => setAssignmentCount(Number(e.target.value))}
                min={1}
                max={10}
                className="input w-full text-sm"
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
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('ai.generateQuiz')}
            </h4>
            <div>
              <label className="label block mb-1">
                {t('ai.quizTopic')}
              </label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder={t('ai.quizTopicPlaceholder')}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label block mb-1">
                {t('ai.questionCount')}
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={5}
                max={50}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label block mb-1">
                {t('ai.timeLimit')} ({t('quiz.minutes')})
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={5}
                max={180}
                className="input w-full text-sm"
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
    <div className="fixed right-0 top-0 h-full w-96 z-50 transform transition-transform duration-300 overflow-y-auto"
         style={{ background: 'var(--bg-surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' }}>
      {/* Header */}
      <div className="sticky top-0 p-4 flex items-center justify-between" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <SparklesIcon className="w-6 h-6" />
          <h3 className="font-semibold">{t('ai.assistant')}</h3>
        </div>
        <button onClick={onClose} className="rounded p-1" style={{ color: 'var(--text-muted)' }}>
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!activeFunction && (
          <>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('ai.assistantHint')}
            </p>

            {/* AI Functions */}
            <div className="space-y-2">
              {courseId && (
                <button
                  onClick={() => setActiveFunction('modules')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <DocumentPlusIcon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('ai.generateModules')}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('ai.generateModulesHint')}
                    </div>
                  </div>
                </button>
              )}

              {moduleId && (
                <button
                  onClick={() => setActiveFunction('assignments')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <ClipboardDocumentListIcon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('ai.generateAssignments')}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('ai.generateAssignmentsHint')}
                    </div>
                  </div>
                </button>
              )}

              {courseId && (
                <button
                  onClick={() => setActiveFunction('quiz')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <AcademicCapIcon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t('ai.generateQuiz')}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
              className="text-sm hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              &larr; {t('common.back')}
            </button>

            {renderFunctionForm()}

            {error && (
              <div className="text-sm p-3 rounded" style={{ color: 'var(--fn-error)', background: 'rgba(239, 68, 68, 0.08)' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
