import React from 'react';
import RichTextEditor from '../../../components/RichTextEditor';
import { LatexFormat } from '../types';
import LatexPreview from './LatexPreview';
import { validateLatex } from '../utils/latex';

interface LatexEditorProps {
  label: string;
  value: string;
  format?: LatexFormat;
  onChange: (value: string) => void;
  onFormatChange?: (format: LatexFormat) => void;
  height?: string;
}

const LatexEditor: React.FC<LatexEditorProps> = ({
  label,
  value,
  format = 'MARKDOWN',
  onChange,
  onFormatChange,
  height,
}) => {
  const issues = validateLatex(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
        {onFormatChange && (
          <select
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
            value={format}
            onChange={(event) => onFormatChange(event.target.value as LatexFormat)}
          >
            <option value="MARKDOWN">Markdown</option>
            <option value="LATEX">LaTeX</option>
            <option value="HTML">HTML</option>
          </select>
        )}
      </div>
      <RichTextEditor
        value={value}
        onChange={onChange}
        height={height}
        enableLatex
        enableCode
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Live Preview</p>
          <LatexPreview value={value} height="180px" />
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Validation</p>
          {issues.length === 0 ? (
            <div className="text-sm text-green-600 dark:text-green-400">LaTeX looks balanced.</div>
          ) : (
            <ul className="text-sm text-amber-600 dark:text-amber-400 list-disc ml-4">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatexEditor;
