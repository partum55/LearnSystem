import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface FootnoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (key: string) => void;
}

export const FootnoteModal: React.FC<FootnoteModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [key, setKey] = useState('');

  const handleInsert = () => {
    onInsert(key.trim());
    setKey('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Insert Footnote
          </Dialog.Title>
          <div>
            <label className="label block mb-1">Key (optional)</label>
            <input
              className="input w-full"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., fn-1"
              autoFocus
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Leave blank for auto-numbered footnote
            </p>
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
