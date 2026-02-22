import React from 'react';
import LatexPreview from './LatexPreview';
import { AIDraft } from '../types';

interface AIReviewPanelProps {
  drafts: AIDraft[];
  onApprove: (draftId: string) => void;
  onReject: (draftId: string) => void;
  onApply: (draftId: string) => void;
  readOnly?: boolean;
}

const AIReviewPanel: React.FC<AIReviewPanelProps> = ({
  drafts,
  onApprove,
  onReject,
  onApply,
  readOnly = false,
}) => {
  if (drafts.length === 0) {
    return (
      <section className="border border-dashed rounded-lg p-4" style={{ borderColor: 'var(--border-default)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI Drafts</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No AI drafts yet. Generate one to review.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI Drafts (Review Required)</h2>
      {drafts.map((draft) => (
        <div key={draft.id} className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{draft.summary}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status: {draft.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 text-sm rounded"
                style={{ background: 'var(--fn-success)', color: 'white' }}
                onClick={() => onApprove(draft.id)}
                disabled={readOnly}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn-secondary px-2 py-1 text-sm"
                onClick={() => onApply(draft.id)}
                disabled={readOnly}
              >
                Apply
              </button>
              <button
                type="button"
                className="px-2 py-1 text-sm rounded"
                style={{ background: 'var(--fn-error)', color: 'white' }}
                onClick={() => onReject(draft.id)}
                disabled={readOnly}
              >
                Reject
              </button>
            </div>
          </div>
          <LatexPreview value={draft.content} height="180px" />
        </div>
      ))}
    </section>
  );
};

export default AIReviewPanel;
