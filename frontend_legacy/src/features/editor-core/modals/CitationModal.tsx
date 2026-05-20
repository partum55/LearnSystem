import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: { author: string; title: string; year: number | null; url: string; citationType: string }) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [url, setUrl] = useState('');
  const [citationType, setCitationType] = useState('APA');

  const handleInsert = () => {
    if (!author.trim()) return;
    const parsedYear = Number.parseInt(year, 10);
    onInsert({
      author: author.trim(),
      title: title.trim(),
      year: Number.isFinite(parsedYear) ? parsedYear : null,
      url: url.trim(),
      citationType,
    });
    setAuthor(''); setTitle(''); setYear(String(new Date().getFullYear())); setUrl(''); setCitationType('APA');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Insert Citation
          </Dialog.Title>
          <div className="space-y-3">
            <div>
              <label className="label block mb-1">Author *</label>
              <input className="input w-full" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author Name" autoFocus />
            </div>
            <div>
              <label className="label block mb-1">Title</label>
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Source title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Year</label>
                <input className="input w-full" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
              </div>
              <div>
                <label className="label block mb-1">Style</label>
                <select className="input w-full" value={citationType} onChange={(e) => setCitationType(e.target.value)}>
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="IEEE">IEEE</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label block mb-1">URL</label>
              <input className="input w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.edu/source" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleInsert} disabled={!author.trim()}>Insert</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
