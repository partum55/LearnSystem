import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, type SyllabusResponseData } from '../api/ai';
import { Modal } from './Modal';
import { Button } from './index';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface SyllabusBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (syllabusJson: string) => void;
  courseDescription?: string;
}

export const SyllabusBuilder: React.FC<SyllabusBuilderProps> = ({
  isOpen, onClose, onApply, courseDescription = '',
}) => {
  const { t, i18n } = useTranslation();
  const [description, setDescription] = useState(courseDescription);
  const [weekCount, setWeekCount] = useState(16);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyllabusResponseData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.syllabus(description, weekCount, i18n.language);
      setResult(data);
      setActiveTab(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate syllabus');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    // Convert to SyllabusData format expected by CourseSyllabusTab
    const syllabusData = {
      version: 2,
      pages: result.pages.map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        content: JSON.stringify({
          version: 1,
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: p.content }] }],
        }),
      })),
    };
    onApply(JSON.stringify(syllabusData));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('ai.syllabusBuilder', 'AI Syllabus Builder')} size="large">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--fn-error)' }}>
          {error}
        </div>
      )}

      {!result ? (
        <div className="space-y-4">
          <div className="input-group">
            <label className="label">{t('ai.courseDescription', 'Course Description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input"
              style={{ resize: 'vertical' }}
              placeholder={t('ai.courseDescPlaceholder', 'Describe your course, topics covered, target audience...')}
            />
          </div>
          <div className="input-group">
            <label className="label">{t('ai.weekCount', 'Number of Weeks')}</label>
            <input
              type="number" min={4} max={52} value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="input"
              style={{ maxWidth: 120 }}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={loading || !description.trim()}>
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t('ai.generating', 'Generating...')}
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {t('ai.generateSyllabus', 'Generate Syllabus')}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {/* Tab navigation */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {result.pages.map((page, i) => (
              <button
                key={page.id}
                onClick={() => setActiveTab(i)}
                className="px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all"
                style={activeTab === i
                  ? { color: 'var(--text-primary)', borderBottom: '2px solid var(--text-primary)' }
                  : { color: 'var(--text-muted)' }
                }
              >
                {page.title}
              </button>
            ))}
          </div>

          {/* Content preview */}
          <div
            className="p-4 rounded-lg mb-4 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {result.pages[activeTab]?.content}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setResult(null)}>
              {t('ai.regenerate', 'Regenerate')}
            </Button>
            <Button onClick={handleApply}>
              {t('ai.applySyllabus', 'Apply to Course')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SyllabusBuilder;
