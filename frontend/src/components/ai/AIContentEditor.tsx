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
    <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <SparklesIcon className="w-5 h-5" />
          <h4 className="font-semibold">{t('ai.improveContent')}</h4>
        </div>
        <button
          onClick={handleCancel}
          style={{ color: 'var(--text-faint)' }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="space-y-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('ai.quickSuggestions')}:
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleEdit(suggestion)}
              disabled={loading}
              className="px-3 py-1 text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <div>
        <label className="label block mb-1">
          {t('ai.customPrompt')}:
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai.customPromptPlaceholder')}
            className="input flex-1 text-sm"
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
        <div className="text-sm" style={{ color: 'var(--fn-error)' }}>
          {error}
        </div>
      )}

      {/* Preview edited content */}
      {editedContent && !loading && (
        <div className="space-y-3">
          <div className="rounded-md p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('ai.editedContent')}:
            </p>
            <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
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
