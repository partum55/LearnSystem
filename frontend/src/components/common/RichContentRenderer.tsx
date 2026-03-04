import React from 'react';
import { DocumentRenderer } from '../../features/editor-core/DocumentRenderer';
import { parseCanonicalDocument } from '../../features/editor-core/documentUtils';

interface RichContentRendererProps {
  content?: string;
  format?: string;
  className?: string;
}

export const RichContentRenderer: React.FC<RichContentRendererProps> = ({ content, format, className }) => {
  if (!content) return null;

  let parsedRichContent = null;
  if (format === 'RICH' || (content.startsWith('{') && content.includes('"type":"doc"'))) {
    try {
      const doc = parseCanonicalDocument(content);
      if (doc.content.length > 0) {
        parsedRichContent = doc;
      }
    } catch {
      // fallback to plain text
    }
  }

  if (parsedRichContent) {
    return <DocumentRenderer document={parsedRichContent} className={className} />;
  }

  return <p className={className} style={{ color: 'var(--text-muted)' }}>{content}</p>;
};
