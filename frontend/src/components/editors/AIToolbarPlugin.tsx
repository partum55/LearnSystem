import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../api/ai';

interface AIToolbarPluginProps {
  currentContent: string;
  onContentUpdate: (newContent: string) => void;
}

const AIToolbarPlugin: React.FC<AIToolbarPluginProps> = ({
  currentContent,
  onContentUpdate,
}) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleAction = async (action: 'generate' | 'enhance' | 'grammar') => {
    setLoading(true);
    try {
      let requestPrompt = '';
      switch (action) {
        case 'generate':
          requestPrompt = prompt;
          break;
        case 'enhance':
          requestPrompt = `Enhance and improve the following content, making it clearer and more engaging:\n\n${currentContent}`;
          break;
        case 'grammar':
          requestPrompt = `Fix grammar and spelling in the following content:\n\n${currentContent}`;
          break;
      }

      const result = await aiApi.editContent({
        entityType: 'ASSIGNMENT',
        entityId: '',
        currentContent: action === 'generate' ? '' : currentContent,
        prompt: requestPrompt,
        language: 'en',
      });

      // editContent returns a string directly
      if (typeof result === 'string' && result.trim()) {
        onContentUpdate(result);
      }
      setShowPopover(false);
      setPrompt('');
    } catch {
      // silently fail - user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        className="px-2 py-1 text-xs rounded transition-colors flex items-center gap-1"
        style={{ color: 'var(--text-secondary)' }}
        title={t('ai.toolbar.title', 'AI Assistant')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        AI
      </button>

      {showPopover && (
        <div
          className="absolute top-full left-0 mt-1 w-72 rounded-lg p-3 shadow-lg z-50 space-y-3"
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
        >
          <div className="space-y-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('ai.toolbar.promptPlaceholder', 'Describe what to generate...')}
              className="input w-full text-sm"
              onKeyDown={(e) => e.key === 'Enter' && prompt.trim() && handleAction('generate')}
            />
            <button
              type="button"
              onClick={() => void handleAction('generate')}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary w-full text-sm py-1.5"
            >
              {loading ? t('ai.generating', 'Generating...') : t('ai.toolbar.generate', 'Generate from prompt')}
            </button>
          </div>

          <div
            className="border-t pt-2 space-y-1"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => void handleAction('enhance')}
              disabled={loading || !currentContent.trim()}
              className="w-full text-left px-2 py-1.5 text-sm rounded transition-colors hover:bg-[var(--bg-active)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('ai.toolbar.enhance', 'Enhance selection')}
            </button>
            <button
              type="button"
              onClick={() => void handleAction('grammar')}
              disabled={loading || !currentContent.trim()}
              className="w-full text-left px-2 py-1.5 text-sm rounded transition-colors hover:bg-[var(--bg-active)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('ai.toolbar.grammar', 'Fix grammar')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIToolbarPlugin;
