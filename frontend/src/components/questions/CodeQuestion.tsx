import React, { useState } from 'react';

interface CodeQuestionProps {
  question: {
    id: string;
    text: string;
    metadata: {
      language?: string;
      starter_code?: string;
      test_cases?: Array<{
        input: string;
        expected: string;
      }>;
    };
  };
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CodeQuestion: React.FC<CodeQuestionProps> = ({
  question,
  value = '',
  onChange,
  disabled = false
}) => {
  const [showTests, setShowTests] = useState(false);
  const language = question.metadata?.language || 'python';
  const starterCode = question.metadata?.starter_code || '';
  const testCases = question.metadata?.test_cases || [];

  // Initialize with starter code if value is empty
  React.useEffect(() => {
    if (!value && starterCode) {
      onChange(starterCode);
    }
  }, [value, starterCode, onChange]);

  const handleRun = () => {
    // This would connect to a code execution service
    console.log('Running code:', value);
    alert('Code execution feature coming soon!');
  };

  return (
    <div className="code-question">
      <div className="mb-4">
        <p className="text-lg font-medium text-gray-900 mb-2">{question.text}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-gray-100 rounded">Language: {language}</span>
          {testCases.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTests(!showTests)}
              className="text-blue-600 hover:underline"
            >
              {showTests ? 'Hide' : 'Show'} test cases ({testCases.length})
            </button>
          )}
        </div>
      </div>

      {showTests && testCases.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Test Cases:</h4>
          <div className="space-y-2">
            {testCases.map((testCase, index) => (
              <div key={index} className="text-sm bg-white p-3 rounded border border-gray-200">
                <div className="font-mono">
                  <span className="text-gray-600">Input:</span> {testCase.input}
                </div>
                <div className="font-mono">
                  <span className="text-gray-600">Expected:</span> {testCase.expected}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Code Editor</span>
          <button
            type="button"
            onClick={handleRun}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Run Code
          </button>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={20}
          className={`w-full px-4 py-3 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-900 text-green-400'
            }`}
          style={{ tabSize: 4 }}
          spellCheck={false}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Tip: Use Tab for indentation. Your code will be tested against {testCases.length} test case(s).
      </div>
    </div>
  );
};

export default CodeQuestion;

