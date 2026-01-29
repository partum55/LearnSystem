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
      <section className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI Drafts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">No AI drafts yet. Generate one to review.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI Drafts (Review Required)</h2>
      {drafts.map((draft) => (
        <div key={draft.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{draft.summary}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status: {draft.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 text-sm bg-green-600 text-white rounded"
                onClick={() => onApprove(draft.id)}
                disabled={readOnly}
              >
                Approve
              </button>
              <button
                type="button"
                className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => onApply(draft.id)}
                disabled={readOnly}
              >
                Apply
              </button>
              <button
                type="button"
                className="px-2 py-1 text-sm bg-red-500 text-white rounded"
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
