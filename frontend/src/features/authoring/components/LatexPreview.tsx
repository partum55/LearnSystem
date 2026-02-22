import React from 'react';
import { renderLatexToHtml } from '../utils/latex';

interface LatexPreviewProps {
  value: string;
  height?: string;
}

const LatexPreview: React.FC<LatexPreviewProps> = ({ value, height = '200px' }) => {
  return (
    <div
      className="p-4 rounded-lg overflow-y-auto"
      style={{ minHeight: height, height, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      dangerouslySetInnerHTML={{ __html: renderLatexToHtml(value) }}
    />
  );
};

export default LatexPreview;
