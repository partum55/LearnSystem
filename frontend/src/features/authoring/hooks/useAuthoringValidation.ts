import { useMemo } from 'react';
import { TaskDraft, ValidationIssue, ValidationResult } from '../types';
import { validateLatex } from '../utils/latex';

export const useAuthoringValidation = (draft: TaskDraft): ValidationResult => {
  return useMemo(() => {
    const issues: ValidationIssue[] = [];

    if (!draft.metadata.title.trim()) {
      issues.push({ field: 'metadata.title', message: 'Title is required.', severity: 'ERROR' });
    }

    if (!draft.metadata.description.trim()) {
      issues.push({ field: 'metadata.description', message: 'Description is required.', severity: 'ERROR' });
    }

    draft.questions.forEach((question, index) => {
      if (!question.prompt.trim()) {
        issues.push({
          field: `questions[${index}].prompt`,
          message: 'Question prompt is required.',
          severity: 'ERROR',
        });
      }
      const latexIssues = validateLatex(question.prompt);
      latexIssues.forEach((issue) =>
        issues.push({
          field: `questions[${index}].prompt`,
          message: issue,
          severity: 'WARNING',
        })
      );

      if (question.type === 'NUMERIC' && !question.correctAnswer?.trim()) {
        issues.push({
          field: `questions[${index}].correctAnswer`,
          message: 'Numeric questions require a correct answer.',
          severity: 'ERROR',
        });
      }

      if ((question.type === 'MCQ' || question.type === 'MULTI_SELECT') && question.options.length === 0) {
        issues.push({
          field: `questions[${index}].options`,
          message: 'Multiple choice questions need at least one option.',
          severity: 'ERROR',
        });
      }

      if (question.type === 'MCQ' && !question.options.some((option) => option.isCorrect)) {
        issues.push({
          field: `questions[${index}].options`,
          message: 'Mark one correct option for MCQ.',
          severity: 'ERROR',
        });
      }
    });

    return {
      valid: issues.every((issue) => issue.severity !== 'ERROR'),
      issues,
    };
  }, [draft]);
};
