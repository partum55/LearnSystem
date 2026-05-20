import React from 'react';
import { LatexFormat } from '../types';
import LatexPreview from './LatexPreview';
import { validateLatex } from '../utils/latex';
import {
  BlockEditor,
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../../../features/editor-core';

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
}) => {
  const issues = validateLatex(value);
  const document = parseCanonicalDocument(value, '');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        {onFormatChange && (
          <select
            className="input px-2 py-1 text-sm"
            value={format}
            onChange={(event) => onFormatChange(event.target.value as LatexFormat)}
          >
            <option value="MARKDOWN">Markdown</option>
            <option value="LATEX">LaTeX</option>
            <option value="HTML">HTML</option>
          </select>
        )}
      </div>
      <BlockEditor
        value={document}
        onChange={(nextDocument) => onChange(serializeCanonicalDocument(nextDocument))}
        mode="full"
        placeholder={label}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Live Preview</p>
          <LatexPreview value={value} height="180px" />
        </div>
        <div>
          <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Validation</p>
          {issues.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--fn-success)' }}>LaTeX looks balanced.</div>
          ) : (
            <ul className="text-sm list-disc ml-4" style={{ color: 'var(--fn-warning)' }}>
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
