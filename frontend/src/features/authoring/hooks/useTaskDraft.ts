import { useMemo, useState } from 'react';
import { QuestionDraft, TaskDraft, TaskType } from '../types';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createDefaultQuestion = (): QuestionDraft => ({
  id: createId(),
  type: 'MCQ',
  prompt: '',
  explanation: '',
  points: 1,
  format: 'MARKDOWN',
  options: [
    { id: createId(), text: '', isCorrect: false, format: 'MARKDOWN' },
    { id: createId(), text: '', isCorrect: false, format: 'MARKDOWN' },
  ],
});

export const useTaskDraft = (taskType: TaskType, initial?: Partial<TaskDraft>) => {
  const initialDraft = useMemo<TaskDraft>(
    () => ({
      type: taskType,
      metadata: {
        title: '',
        description: '',
        difficulty: 'MEDIUM',
        tags: [],
        format: 'MARKDOWN',
      },
      settings: {
        timeLimitMinutes: undefined,
        attemptsAllowed: 1,
        gradingMode: 'MANUAL',
        draftState: 'DRAFT',
        allowLateSubmission: false,
      },
      questions: [createDefaultQuestion()],
      aiDrafts: [],
      ...initial,
    }),
    [initial, taskType]
  );

  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [lastSaved, setLastSaved] = useState<TaskDraft | null>(null);

  const resetDraft = () => setDraft(initialDraft);

  const markSaved = () => setLastSaved(draft);

  return {
    draft,
    setDraft,
    resetDraft,
    lastSaved,
    markSaved,
  };
};
