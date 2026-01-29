import React from 'react';
import { renderLatexToHtml } from '../utils/latex';

interface LatexPreviewProps {
  value: string;
  height?: string;
}

const LatexPreview: React.FC<LatexPreviewProps> = ({ value, height = '200px' }) => {
  return (
    <div
      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto"
      style={{ minHeight: height, height }}
      dangerouslySetInnerHTML={{ __html: renderLatexToHtml(value) }}
    />
  );
};

export default LatexPreview;
