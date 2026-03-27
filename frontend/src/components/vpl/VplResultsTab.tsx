import React, { useState } from 'react';
import { CodeExecutionResult, TestCaseResult } from '../../api/virtualLab';

interface VplResultsTabProps {
  result: CodeExecutionResult | null;
  assignment: { max_points: number };
}

const TestRow: React.FC<{ test: TestCaseResult; index: number }> = ({ test, index }) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !test.passed && !test.hidden && (test.expectedOutput || test.error);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${test.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, background: 'var(--bg-surface)' }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={() => canExpand && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {test.passed ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: 'var(--fn-success)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : test.hidden ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--fn-error)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: 'var(--fn-error)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {test.hidden ? `Hidden test ${index + 1}` : (test.name || `Test ${index + 1}`)}
          </span>
          {test.hidden && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
              hidden
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {test.points} pt{test.points !== 1 ? 's' : ''}
          </span>
          {canExpand && (
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none' }}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {expanded && canExpand && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {test.input && (
            <div className="pt-3">
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Input</p>
              <pre
                className="text-xs p-3 rounded"
                style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}
              >
                {test.input || '(empty)'}
              </pre>
            </div>
          )}
          {test.expectedOutput !== undefined && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--fn-success)' }}>Expected</p>
              <pre
                className="text-xs p-3 rounded"
                style={{ background: 'rgba(34,197,94,0.05)', color: 'var(--fn-success)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                {test.expectedOutput || '(empty)'}
              </pre>
            </div>
          )}
          {test.actualOutput !== undefined && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--fn-error)' }}>Actual</p>
              <pre
                className="text-xs p-3 rounded"
                style={{ background: 'rgba(239,68,68,0.05)', color: 'var(--fn-error)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                {test.actualOutput || '(empty)'}
              </pre>
            </div>
          )}
          {test.error && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--fn-error)' }}>Error</p>
              <pre
                className="text-xs p-3 rounded"
                style={{ background: 'rgba(239,68,68,0.05)', color: 'var(--fn-error)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                {test.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VplResultsTab: React.FC<VplResultsTabProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--text-faint)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No test results yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
          Click <span style={{ color: 'var(--fn-warning)' }}>Tests</span> on the Editor tab to run the test suite
        </p>
      </div>
    );
  }

  const tests = result.testResults || [];
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const allPassed = passed === total && total > 0;

  return (
    <div className="py-6 space-y-6">
      {/* Score header */}
      {total > 0 && (
        <div
          className="p-5 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: `1px solid ${allPassed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {passed} / {total} tests passed
            </span>
            <span
              className="text-2xl font-bold"
              style={{ color: allPassed ? 'var(--fn-success)' : 'var(--fn-error)', fontFamily: 'var(--font-display)' }}
            >
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: allPassed ? 'var(--fn-success)' : `linear-gradient(90deg, var(--fn-error), rgba(239,68,68,0.6))`,
              }}
            />
          </div>
          {result.totalPoints !== undefined && result.maxPoints !== undefined && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {result.totalPoints} / {result.maxPoints} points earned
            </p>
          )}
        </div>
      )}

      {/* Test list */}
      <div className="space-y-2">
        {tests.map((test, i) => (
          <TestRow key={i} test={test} index={i} />
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No test cases found
          </p>
        )}
      </div>

      {/* Pylint section */}
      {result.pylint && (
        <div
          className="p-4 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Code Quality (Pylint)
          </h3>
          <div className="flex items-center gap-4">
            {/* Score ring */}
            <div className="relative flex-shrink-0" style={{ width: 60, height: 60 }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-base)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={result.pylint.passed ? 'var(--fn-success)' : 'var(--fn-error)'}
                  strokeWidth="3"
                  strokeDasharray={`${result.pylint.score * 10} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {result.pylint.score.toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {result.pylint.score.toFixed(1)} / 10
              </p>
              <p className="text-xs mt-0.5" style={{ color: result.pylint.passed ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                {result.pylint.passed ? 'Passed' : 'Below threshold'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VplResultsTab;
