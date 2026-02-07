import React, { useMemo } from 'react';

interface EssayQuestionProps {
  question: {
    id: string;
    text: string;
    metadata: {
      max_words?: number;
      rich_text_enabled?: boolean;
      rubric_id?: string;
    };
  };
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const EssayQuestion: React.FC<EssayQuestionProps> = ({
  question,
  value = '',
  onChange,
  disabled = false
}) => {
  const maxWords = question.metadata?.max_words || 500;

  const wordCount = useMemo(() => {
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const words = newValue.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length <= maxWords) {
      onChange(newValue);
    }
  };

  const isOverLimit = wordCount > maxWords;

  return (
    <div className="essay-question">
      <div className="mb-4">
        <p className="text-lg font-medium text-gray-900 mb-2">{question.text}</p>
        {question.metadata?.rubric_id && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {/* Open rubric modal */ }}
          >
            View Rubric
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          disabled={disabled}
          rows={15}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${isOverLimit ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="Type your essay here..."
        />
      </div>

      <div className="mt-2 flex justify-between items-center text-sm">
        <span className={`${isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          Word count: {wordCount} / {maxWords}
        </span>
        {isOverLimit && (
          <span className="text-red-600">
            Exceeded word limit by {wordCount - maxWords} words
          </span>
        )}
      </div>
    </div>
  );
};

export default EssayQuestion;

