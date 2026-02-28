import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: { provider: 'youtube' | 'pdf'; url: string; title: string }) => void;
  defaultProvider?: 'youtube' | 'pdf';
}

export const EmbedModal: React.FC<EmbedModalProps> = ({ isOpen, onClose, onInsert, defaultProvider = 'youtube' }) => {
  const [provider, setProvider] = useState<'youtube' | 'pdf'>(defaultProvider);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleInsert = () => {
    if (!url.trim()) return;
    onInsert({ provider, url: url.trim(), title: title.trim() });
    setUrl(''); setTitle(''); setProvider(defaultProvider);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Insert Embed
          </Dialog.Title>
          <div className="space-y-3">
            <div>
              <label className="label block mb-1">Provider</label>
              <select className="input w-full" value={provider} onChange={(e) => setProvider(e.target.value as 'youtube' | 'pdf')}>
                <option value="youtube">YouTube</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <label className="label block mb-1">URL *</label>
              <input
                className="input w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={provider === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/file.pdf'}
                autoFocus
              />
            </div>
            <div>
              <label className="label block mb-1">Title</label>
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Embed title (optional)" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleInsert} disabled={!url.trim()}>Insert</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
