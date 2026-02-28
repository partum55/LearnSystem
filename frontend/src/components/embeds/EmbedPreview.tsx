import React from 'react';

interface EmbedPreviewProps {
  provider: string;
  embedUrl: string;
  title?: string;
}

const EmbedPreview: React.FC<EmbedPreviewProps> = ({
  provider,
  embedUrl,
  title,
}) => {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <div className="aspect-video relative">
        <iframe
          src={embedUrl}
          title={title || `${provider} embed`}
          className="w-full h-full absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          style={{ border: 'none' }}
        />
      </div>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--bg-surface)' }}>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}
        >
          {provider}
        </span>
        {title && (
          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </span>
        )}
      </div>
    </div>
  );
};

export default EmbedPreview;
