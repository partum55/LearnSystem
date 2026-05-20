import React, { useState, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import katex from 'katex';

interface MathInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  displayMode?: boolean;
  title?: string;
}

export const MathInputModal: React.FC<MathInputModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  displayMode = true,
  title = 'Insert Math',
}) => {
  const [latex, setLatex] = useState('');

  const preview = useMemo(() => {
    if (!latex.trim()) return '';
    try {
      return katex.renderToString(latex, { displayMode, throwOnError: false });
    } catch {
      return '<span style="color:var(--fn-error)">Invalid LaTeX</span>';
    }
  }, [latex, displayMode]);

  const handleInsert = () => {
    if (!latex.trim()) return;
    onInsert(latex.trim());
    setLatex('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {title}
          </Dialog.Title>
          <div>
            <label className="label block mb-1">LaTeX Expression</label>
            <textarea
              className="input w-full"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              placeholder={displayMode ? '\\int_0^1 x^2 dx' : 'x^2 + y^2 = z^2'}
              autoFocus
            />
          </div>
          {latex.trim() && (
            <div>
              <label className="label block mb-1">Preview</label>
              <div
                className="p-3 rounded-md overflow-x-auto"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)', textAlign: displayMode ? 'center' : 'left' }}
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleInsert} disabled={!latex.trim()}>Insert</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
