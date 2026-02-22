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
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{question.text}</p>
        {question.metadata?.rubric_id && (
          <button
            type="button"
            className="text-sm hover:underline"
            style={{ color: 'var(--text-secondary)' }}
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
          className={`input w-full resize-y ${disabled ? 'cursor-not-allowed' : ''}`}
          style={isOverLimit ? { borderColor: 'var(--fn-error)' } : undefined}
          placeholder="Type your essay here..."
        />
      </div>

      <div className="mt-2 flex justify-between items-center text-sm">
        <span style={{ color: isOverLimit ? 'var(--fn-error)' : 'var(--text-muted)', fontWeight: isOverLimit ? 600 : 400 }}>
          Word count: {wordCount} / {maxWords}
        </span>
        {isOverLimit && (
          <span style={{ color: 'var(--fn-error)' }}>
            Exceeded word limit by {wordCount - maxWords} words
          </span>
        )}
      </div>
    </div>
  );
};

export default EssayQuestion;
