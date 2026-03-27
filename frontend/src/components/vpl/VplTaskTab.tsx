import React from 'react';
import { parseCanonicalDocument } from '../../features/editor-core';
import { DocumentRenderer } from '../../features/editor-core/DocumentRenderer';

interface VplAssignment {
  title: string;
  description: string;
  description_format: string;
  instructions?: string;
  instructions_format?: string;
  due_date?: string;
  max_points: number;
  allow_late_submission?: boolean;
  late_penalty_percent?: number;
  available_from?: string | null;
}

interface VplTaskTabProps {
  assignment: VplAssignment;
}

const renderContent = (content: string, format: string) => {
  if (format === 'RICH') {
    return <DocumentRenderer document={parseCanonicalDocument(content)} />;
  }
  return <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{content}</p>;
};

const VplTaskTab: React.FC<VplTaskTabProps> = ({ assignment }) => {
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;

  return (
    <div className="space-y-6 py-6">
      {/* Meta row */}
      <div className="flex flex-wrap gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        >
          {assignment.max_points} pts
        </span>
        {dueDate && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            Due {dueDate.toLocaleString()}
          </span>
        )}
        {assignment.allow_late_submission && (
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
            style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--fn-warning)', border: '1px solid rgba(234,179,8,0.2)' }}
          >
            Late: −{assignment.late_penalty_percent}% / day
          </span>
        )}
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Description
        </h3>
        <div style={{ color: 'var(--text-secondary)' }}>
          {renderContent(assignment.description, assignment.description_format)}
        </div>
      </div>

      {/* Instructions */}
      {assignment.instructions && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Instructions
          </h3>
          <div style={{ color: 'var(--text-secondary)' }}>
            {renderContent(assignment.instructions, assignment.instructions_format || 'MARKDOWN')}
          </div>
        </div>
      )}
    </div>
  );
};

export default VplTaskTab;
