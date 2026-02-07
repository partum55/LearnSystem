import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { aiApi, CourseEditRequest } from '../../api/ai';
import { extractErrorMessage } from '../../api/client';
import {
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AIContentEditorProps {
  entityType: 'COURSE' | 'MODULE' | 'ASSIGNMENT' | 'QUIZ';
  entityId: string;
  currentContent: string;
  language?: 'uk' | 'en';
  onContentUpdated?: (newContent: string) => void;
  className?: string;
}

export const AIContentEditor: React.FC<AIContentEditorProps> = ({
  entityType,
  entityId,
  currentContent,
  language = 'uk',
  onContentUpdated,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestions = [
    t('ai.suggestions.makeMoreStructured'),
    t('ai.suggestions.simplify'),
    t('ai.suggestions.expand'),
    t('ai.suggestions.addExamples'),
    t('ai.suggestions.improveClarity'),
  ];

  const handleEdit = async (customPrompt?: string) => {
    const editPrompt = customPrompt || prompt;
    if (!editPrompt.trim()) {
      setError(t('ai.errors.promptRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const request: CourseEditRequest = {
        entity_type: entityType,
        entity_id: entityId,
        current_content: currentContent,
        prompt: editPrompt,
        language,
      };

      const result = await aiApi.editContent(request);
      setEditedContent(result);
    } catch (err) {
      console.error('Failed to edit content:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onContentUpdated && editedContent) {
      onContentUpdated(editedContent);
    }
    handleCancel();
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPrompt('');
    setEditedContent('');
    setError('');
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <SparklesIcon className="w-4 h-4 mr-1" />
        {t('ai.improveWithAI')}
      </Button>
    );
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
          <SparklesIcon className="w-5 h-5" />
          <h4 className="font-semibold">{t('ai.improveContent')}</h4>
        </div>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('ai.quickSuggestions')}:
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleEdit(suggestion)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-purple-300
                       dark:border-purple-600 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('ai.customPrompt')}:
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai.customPromptPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
            disabled={loading}
          />
          <Button
            onClick={() => handleEdit()}
            disabled={loading || !prompt.trim()}
            size="sm"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                {t('ai.processing')}
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-1" />
                {t('ai.apply')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Preview edited content */}
      {editedContent && !loading && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ai.editedContent')}:
            </p>
            <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {editedContent}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" size="sm" onClick={() => setEditedContent('')}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleApply}>
              <CheckIcon className="w-4 h-4 mr-1" />
              {t('ai.applyChanges')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

