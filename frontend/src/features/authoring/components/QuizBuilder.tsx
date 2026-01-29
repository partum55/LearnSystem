import React from 'react';
import QuestionEditor from './QuestionEditor';
import { QuestionDraft } from '../types';

interface QuizBuilderProps {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
  readOnly?: boolean;
}

const QuizBuilder: React.FC<QuizBuilderProps> = ({ questions, onChange, readOnly = false }) => {
  const updateQuestion = (index: number, updated: QuestionDraft) => {
    const next = [...questions];
    next[index] = updated;
    onChange(next);
  };

  const addQuestion = () => {
    if (readOnly) return;
    onChange([
      ...questions,
      {
        id: `question-${Date.now()}`,
        type: 'MCQ',
        prompt: '',
        explanation: '',
        points: 1,
        format: 'MARKDOWN',
        options: [
          { id: `option-${Date.now()}-1`, text: '', isCorrect: false, format: 'MARKDOWN' },
          { id: `option-${Date.now()}-2`, text: '', isCorrect: false, format: 'MARKDOWN' },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (readOnly) return;
    const next = questions.filter((_, idx) => idx !== index);
    onChange(next);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Questions</h2>
        <button
          type="button"
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
          onClick={addQuestion}
          disabled={readOnly}
        >
          Add Question
        </button>
      </div>
      {questions.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">No questions yet. Add one to begin.</div>
      ) : (
        questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            onChange={(updated) => updateQuestion(index, updated)}
            onRemove={() => removeQuestion(index)}
            readOnly={readOnly}
          />
        ))
      )}
    </section>
  );
};

export default QuizBuilder;
