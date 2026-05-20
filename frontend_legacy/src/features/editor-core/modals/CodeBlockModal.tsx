import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface CodeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (language: string) => void;
}

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'bash', 'json', 'yaml',
];

export const CodeBlockModal: React.FC<CodeBlockModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [language, setLanguage] = useState('plaintext');

  const handleInsert = () => {
    onInsert(language);
    setLanguage('plaintext');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Insert Code Block
          </Dialog.Title>
          <div>
            <label className="label block mb-1">Language</label>
            <select className="input w-full" value={language} onChange={(e) => setLanguage(e.target.value)} autoFocus>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleInsert}>Insert</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
