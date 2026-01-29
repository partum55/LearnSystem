import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { Modal } from '../Modal';
import apiClient from '../../api/client';

interface AIContentGeneratorProps {
  type: 'quiz' | 'assignment' | 'module';
  onGenerate: (content: any) => void;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({ type, onGenerate }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [weekDuration, setWeekDuration] = useState(4);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert(t('ai.generator.topicRequired', 'Please enter a topic'));
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewError(null);
    try {
      // Use versioned API endpoint
      const endpoint = `/v1/ai/generate/${type}`;
      const requestBody: any = {
        topic,
        language: i18n.language === 'uk' ? 'uk' : 'en',
        difficulty,
      };

      if (type === 'quiz') {
        requestBody.questionCount = questionCount;
      } else if (type === 'module') {
        requestBody.weekDuration = weekDuration;
      }

      // Use apiClient instead of raw fetch
      const data = await apiClient.post(endpoint, requestBody);
      setPreviewJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error('Error generating content:', err);
      const errorMessage = err.message || t('ai.generator.error', 'Failed to generate content. Please try again.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    setPreviewJson(null);
    setPreviewError(null);
  };

  const handleConfirm = () => {
    if (!previewJson) {
      return;
    }
    try {
      const parsed = JSON.parse(previewJson);
      onGenerate(parsed);
      setIsOpen(false);
      setTopic('');
      setPreviewJson(null);
      setPreviewError(null);
    } catch (err: any) {
      setPreviewError(err.message || t('ai.generator.invalidJson', 'Invalid JSON. Please fix before confirming.'));
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTopic('');
    setError(null);
    setPreviewJson(null);
    setPreviewError(null);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
        className="flex items-center gap-2"
      >
        <span>✨</span>
        <span>{t(`ai.generator.${type}`, `Generate ${type} with AI`)}</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={
          previewJson
            ? t('ai.generator.previewTitle', 'Review AI output before saving')
            : t(`ai.generator.${type}Title`, `Generate ${type} with AI`)
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {previewError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {previewError}
            </div>
          )}
          {previewJson ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t(
                    'ai.generator.previewDescription',
                    'Review and edit the exact AI output. Content is not saved until you confirm.'
                  )}
                </p>
                <textarea
                  value={previewJson}
                  onChange={(e) => setPreviewJson(e.target.value)}
                  className="w-full h-80 px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button onClick={handleReject} variant="secondary" disabled={loading}>
                  {t('ai.generator.reject', 'Reject')}
                </Button>
                <Button onClick={handleConfirm} variant="primary" disabled={loading}>
                  {t('ai.generator.confirm', 'Confirm & Use')}
                </Button>
              </div>
            </>
          ) : (
            <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('ai.generator.topic', 'Topic')}
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={t('ai.generator.topicPlaceholder', 'Describe what you want to create...')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('ai.generator.difficulty', 'Difficulty')}
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">{t('difficulty.easy', 'Easy')}</option>
              <option value="medium">{t('difficulty.medium', 'Medium')}</option>
              <option value="hard">{t('difficulty.hard', 'Hard')}</option>
            </select>
          </div>

          {type === 'quiz' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('ai.generator.questionCount', 'Number of Questions')}
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                min={5}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {type === 'module' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('ai.generator.weekDuration', 'Duration (weeks)')}
              </label>
              <input
                type="number"
                value={weekDuration}
                onChange={(e) => setWeekDuration(parseInt(e.target.value))}
                min={1}
                max={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <Button
              onClick={handleClose}
              variant="secondary"
              disabled={loading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              variant="primary"
              disabled={loading || !topic.trim()}
            >
              {loading ? t('common.generating', 'Generating...') : t('common.generate', 'Generate')}
            </Button>
          </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AIContentGenerator;
