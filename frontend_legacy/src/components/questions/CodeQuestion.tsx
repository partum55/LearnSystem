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
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{question.text}</p>
        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)' }}>Language: {language}</span>
          {testCases.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTests(!showTests)}
              className="hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              {showTests ? 'Hide' : 'Show'} test cases ({testCases.length})
            </button>
          )}
        </div>
      </div>

      {showTests && testCases.length > 0 && (
        <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Test Cases:</h4>
          <div className="space-y-2">
            {testCases.map((testCase, index) => (
              <div key={index} className="text-sm p-3 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div style={{ fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Input:</span> <span style={{ color: 'var(--text-primary)' }}>{testCase.input}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expected:</span> <span style={{ color: 'var(--text-primary)' }}>{testCase.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="label">Code Editor</span>
          <button
            type="button"
            onClick={handleRun}
            disabled={disabled}
            className="px-3 py-1 text-sm rounded disabled:cursor-not-allowed"
            style={{ background: disabled ? 'var(--bg-overlay)' : 'var(--fn-success)', color: disabled ? 'var(--text-faint)' : '#fff' }}
          >
            Run Code
          </button>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={20}
          className={`w-full px-4 py-3 text-sm rounded-lg resize-y ${disabled ? 'cursor-not-allowed' : ''}`}
          style={{
            background: disabled ? 'var(--bg-elevated)' : 'var(--bg-base)',
            color: disabled ? 'var(--text-faint)' : 'var(--fn-success)',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--border-default)',
            tabSize: 4,
          }}
          spellCheck={false}
        />
      </div>

      <div className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
        Tip: Use Tab for indentation. Your code will be tested against {testCases.length} test case(s).
      </div>
    </div>
  );
};

export default CodeQuestion;
