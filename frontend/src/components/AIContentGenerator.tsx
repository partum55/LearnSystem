import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Modal } from './Modal';

interface AIContentGeneratorProps {
  type: 'quiz' | 'assignment' | 'module';
  onGenerate: (content: any) => void;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({ type, onGenerate }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    try {
      const endpoint = `/api/ai/generate/${type}`;
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      onGenerate(data);
      setIsOpen(false);
      setTopic('');
    } catch (error) {
      console.error('Error generating content:', error);
      alert(t('ai.generator.error', 'Failed to generate content. Please try again.'));
    } finally {
      setLoading(false);
    }
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
        onClose={() => setIsOpen(false)}
        title={t(`ai.generator.${type}Title`, `Generate ${type} with AI`)}
      >
        <div className="space-y-4">
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
              onClick={() => setIsOpen(false)}
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
        </div>
      </Modal>
    </>
  );
};

export default AIContentGenerator;
