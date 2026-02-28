import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface TestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: { input: string; output: string; visibility: string; score: number }) => void;
}

export const TestCaseModal: React.FC<TestCaseModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [score, setScore] = useState('1');

  const handleInsert = () => {
    const parsedScore = Number.parseFloat(score);
    onInsert({
      input,
      output,
      visibility,
      score: Number.isFinite(parsedScore) ? parsedScore : 1,
    });
    setInput(''); setOutput(''); setVisibility('public'); setScore('1');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[var(--z-modal)]">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Dialog.Title className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Insert Test Case
          </Dialog.Title>
          <div className="space-y-3">
            <div>
              <label className="label block mb-1">Input</label>
              <textarea className="input w-full" style={{ fontFamily: 'var(--font-mono)' }} value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="Test input" autoFocus />
            </div>
            <div>
              <label className="label block mb-1">Expected Output</label>
              <textarea className="input w-full" style={{ fontFamily: 'var(--font-mono)' }} value={output} onChange={(e) => setOutput(e.target.value)} rows={3} placeholder="Expected output" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Visibility</label>
                <select className="input w-full" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="label block mb-1">Score</label>
                <input type="number" className="input w-full" value={score} onChange={(e) => setScore(e.target.value)} min="0" step="0.5" />
              </div>
            </div>
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
