import React from 'react';
import { ValidationResult } from '../types';

interface ValidationSummaryProps {
  validation: ValidationResult;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({ validation }) => {
  if (validation.issues.length === 0) {
    return (
      <div className="text-sm" style={{ color: 'var(--fn-success)' }}>No validation issues detected.</div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Validation Issues</h3>
      <ul className="text-sm list-disc ml-4" style={{ color: 'var(--text-secondary)' }}>
        {validation.issues.map((issue, index) => (
          <li key={`${issue.field}-${index}`}>
            <span style={{ color: issue.severity === 'ERROR' ? 'var(--fn-error)' : 'var(--fn-warning)' }}>
              {issue.severity}:
            </span>{' '}
            {issue.message} ({issue.field})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationSummary;
