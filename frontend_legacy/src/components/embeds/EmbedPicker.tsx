import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectEmbed, EmbedInfo } from './embedDetector';
import EmbedPreview from './EmbedPreview';

interface EmbedPickerProps {
  onSelect: (embed: { provider: string; embedUrl: string; thumbnailUrl?: string; title: string }) => void;
  onClose: () => void;
}

const EmbedPicker: React.FC<EmbedPickerProps> = ({ onSelect, onClose }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [detected, setDetected] = useState<EmbedInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    if (value.trim()) {
      const embed = detectEmbed(value);
      setDetected(embed);
      if (!embed && value.startsWith('http')) {
        setError(t('embed.unsupported', 'This URL type is not supported for embedding'));
      }
    } else {
      setDetected(null);
    }
  };

  const handleConfirm = () => {
    if (detected) {
      onSelect({ ...detected, title: title || url });
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-lg p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('embed.title', 'Embed External Content')}
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-active)]">
              <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('embed.desc', 'Paste a URL from YouTube, Google Docs, CodeSandbox, CodePen, or Vimeo')}
          </p>

          <div>
            <label className="label text-sm">{t('embed.url', 'URL')}</label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="input w-full text-sm"
            />
          </div>

          {detected && (
            <div>
              <label className="label text-sm">{t('embed.customTitle', 'Title (optional)')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('embed.titlePlaceholder', 'Enter a title for this embed')}
                className="input w-full text-sm"
              />
            </div>
          )}

          {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          {detected && (
            <EmbedPreview
              provider={detected.provider}
              embedUrl={detected.embedUrl}
              title={title || url}
            />
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!detected}
              className="btn btn-primary flex-1 py-2"
            >
              {t('embed.add', 'Add Embed')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmbedPicker;
