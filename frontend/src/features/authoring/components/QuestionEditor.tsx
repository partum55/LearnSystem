import React from 'react';
import { Input } from '../../../components/Input';
import LatexEditor from './LatexEditor';
import { QuestionDraft, QuestionOption } from '../types';

interface QuestionEditorProps {
  question: QuestionDraft;
  index: number;
  onChange: (question: QuestionDraft) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, index, onChange, onRemove, readOnly = false }) => {
  const updateOption = (optionIndex: number, updated: QuestionOption) => {
    const nextOptions = [...question.options];
    nextOptions[optionIndex] = updated;
    onChange({ ...question, options: nextOptions });
  };

  const addOption = () => {
    if (readOnly) return;
    onChange({
      ...question,
      options: [
        ...question.options,
        { id: `option-${Date.now()}-${Math.random()}`, text: '', isCorrect: false, format: question.format },
      ],
    });
  };

  const removeOption = (optionIndex: number) => {
    if (readOnly) return;
    const nextOptions = question.options.filter((_, idx) => idx !== optionIndex);
    onChange({ ...question, options: nextOptions });
  };

  const supportsOptions = question.type === 'MCQ' || question.type === 'MULTI_SELECT';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Question {index + 1}</h3>
        {!readOnly && (
          <button type="button" className="text-sm text-red-600" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2"
            value={question.type}
            disabled={readOnly}
            onChange={(event) => onChange({ ...question, type: event.target.value as QuestionDraft['type'] })}
          >
            <option value="MCQ">Multiple Choice</option>
            <option value="MULTI_SELECT">Multi-select</option>
            <option value="NUMERIC">Numeric</option>
            <option value="OPEN_TEXT">Open Text</option>
            <option value="LATEX">LaTeX Response</option>
          </select>
        </div>
        <Input
          label="Points"
          type="number"
          min={0}
          value={question.points}
          disabled={readOnly}
          onChange={(event) => onChange({ ...question, points: Number(event.target.value) })}
        />
        {question.type === 'NUMERIC' && (
          <Input
            label="Correct Answer"
            value={question.correctAnswer ?? ''}
            disabled={readOnly}
            onChange={(event) => onChange({ ...question, correctAnswer: event.target.value })}
          />
        )}
      </div>
      <LatexEditor
        label="Prompt"
        value={question.prompt}
        format={question.format}
        onChange={(value) => onChange({ ...question, prompt: value })}
        onFormatChange={(format) => onChange({ ...question, format })}
        height="200px"
      />
      <LatexEditor
        label="Explanation"
        value={question.explanation}
        format={question.format}
        onChange={(value) => onChange({ ...question, explanation: value })}
        onFormatChange={(format) => onChange({ ...question, format })}
        height="180px"
      />
      {supportsOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200">Options</h4>
            <button
              type="button"
              className="text-sm text-blue-600"
              onClick={addOption}
              disabled={readOnly}
            >
              Add Option
            </button>
          </div>
          {question.options.map((option, optionIndex) => (
            <div key={option.id} className="flex flex-col md:flex-row gap-2 md:items-center">
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-2"
                value={option.text}
                disabled={readOnly}
                onChange={(event) => updateOption(optionIndex, { ...option, text: event.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type={question.type === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                  checked={option.isCorrect}
                  disabled={readOnly}
                  onChange={(event) =>
                    updateOption(optionIndex, {
                      ...option,
                      isCorrect: event.target.checked,
                    })
                  }
                />
                Correct
              </label>
              {!readOnly && question.options.length > 1 && (
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => removeOption(optionIndex)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;
