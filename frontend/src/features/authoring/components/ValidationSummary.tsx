import React from 'react';
import { ValidationResult } from '../types';

interface ValidationSummaryProps {
  validation: ValidationResult;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({ validation }) => {
  if (validation.issues.length === 0) {
    return (
      <div className="text-sm text-green-600 dark:text-green-400">No validation issues detected.</div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Validation Issues</h3>
      <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc ml-4">
        {validation.issues.map((issue, index) => (
          <li key={`${issue.field}-${index}`}>
            <span className={issue.severity === 'ERROR' ? 'text-red-600' : 'text-amber-600'}>
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
