import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import CodeEditor from '../components/CodeEditor';
import { Assignment } from '../types';
import { PlayIcon, CheckCircleIcon, XCircleIcon, StopIcon } from '@heroicons/react/24/outline';

const EXECUTION_TIMEOUT_SECONDS = 30; // Maximum execution time

interface TestCaseResult {
  name: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  points: number;
}

interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  success: boolean;
  testResults?: TestCaseResult[];
}

const VirtualLab: React.FC = () => {
  const { assignmentId: routeAssignmentId } = useParams<{ assignmentId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = routeAssignmentId || searchParams.get('assignmentId') || undefined;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeoutRemaining, setTimeoutRemaining] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assessments/assignments/${assignmentId}`);
      const raw = response.data as Assignment & {
        starterCode?: string;
        programmingLanguage?: string;
      };
      const data = {
        ...raw,
        starter_code: raw.starter_code || raw.starterCode,
        programming_language: raw.programming_language || raw.programmingLanguage,
      } as Assignment;
      setAssignment(data);

      // Set starter code if available
      if (data.starter_code) {
        setCode(data.starter_code);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch assignment:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setError(error.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAbortExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current);
    }
    setExecuting(false);
    setTimeoutRemaining(null);
    setError('Execution cancelled by user');
  };

  const executeCode = async () => {
    if (!assignment) return;

    try {
      // Create abort controller
      abortControllerRef.current = new AbortController();

      setExecuting(true);
      setOutput('');
      setError('');
      setExecutionResult(null);
      setTimeoutRemaining(EXECUTION_TIMEOUT_SECONDS);

      // Start countdown timer
      timeoutIntervalRef.current = setInterval(() => {
        setTimeoutRemaining((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      const response = await api.post('/assessments/virtual-lab/execute', {
        assignmentId: assignment.id,
        code,
        language: assignment.programming_language || 'python',
        input,
      }, {
        signal: abortControllerRef.current.signal,
      });

      const result = response.data as ExecutionResult;
      setExecutionResult(result);

      if (result.success) {
        setOutput(result.output || 'Program executed successfully with no output');
      } else {
        setError(result.error || 'Execution failed');
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        // Already handled in handleAbortExecution
        if (!error) {
          setError('Execution cancelled');
        }
      } else if (error.response?.status === 408 || error.message?.includes('timeout')) {
        setError(`Execution timed out after ${EXECUTION_TIMEOUT_SECONDS} seconds. Your code may contain an infinite loop or be too slow.`);
      } else {
        console.error('Code execution failed:', error);
        setError(error.response?.data?.message || 'Failed to execute code');
      }
    } finally {
      setExecuting(false);
      setTimeoutRemaining(null);
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
        timeoutIntervalRef.current = null;
      }
      abortControllerRef.current = null;
    }
  };

  const calculateScore = () => {
    if (!executionResult?.testResults) return 0;

    return executionResult.testResults.reduce((sum, test) => sum + (test.points || 0), 0);
  };

  const getTotalPoints = () => {
    if (!assignment?.test_cases) return 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return assignment.test_cases.reduce((sum: number, tc: any) => sum + (tc.points || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-muted)' }}>Assignment not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="rounded-lg mb-6 p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {assignment.title}
        </h1>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          {assignment.description}
        </p>
        {assignment.instructions && (
          <div className="p-4 mb-4" style={{ background: 'var(--bg-elevated)', borderLeft: '4px solid var(--text-secondary)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Instructions
            </h3>
            <div className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {assignment.instructions}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Code Editor
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Language: {assignment.programming_language || 'python'}
            </span>
          </div>

          <div className="mb-4">
            <CodeEditor
              value={code}
              onChange={(value: string) => setCode(value)}
              language={assignment.programming_language || 'python'}
              height="400px"
            />
          </div>

          <div className="mb-4">
            <label className="label block mb-2">
              Input (optional)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input w-full text-sm"
              style={{ fontFamily: 'var(--font-mono)' }}
              rows={3}
              placeholder="Enter program input here..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={executeCode}
              disabled={executing || !code.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--fn-success)', color: '#fff' }}
            >
              <PlayIcon className="w-5 h-5" />
              {executing ? (
                <>
                  Running...
                  {timeoutRemaining !== null && (
                    <span className="ml-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      ({timeoutRemaining}s)
                    </span>
                  )}
                </>
              ) : 'Run Code'}
            </button>

            {executing && (
              <button
                onClick={handleAbortExecution}
                className="px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ background: 'var(--fn-error)', color: '#fff' }}
              >
                <StopIcon className="w-5 h-5" />
                Stop
              </button>
            )}
          </div>

          {executing && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
              <p className="text-sm" style={{ color: 'var(--fn-warning)' }}>
                Timeout in {timeoutRemaining} seconds. Code will be terminated if it runs too long.
              </p>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Output
          </h2>

          {executionResult && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>Execution time: {executionResult.executionTime}ms</span>
                <span style={{ color: executionResult.success ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                  • {executionResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          )}

          {output && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Standard Output
              </h3>
              <pre className="rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {output}
              </pre>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--fn-error)' }}>
                Error Output
              </h3>
              <pre className="rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)', fontFamily: 'var(--font-mono)' }}>
                {error}
              </pre>
            </div>
          )}

          {executionResult?.testResults && executionResult.testResults.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Test Results
                </h3>
                <div className="text-sm">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Score: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {String(calculateScore())} / {getTotalPoints()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {executionResult.testResults.map((test, index) => (
                  <div
                    key={index}
                    className="rounded-lg p-3"
                    style={test.passed
                      ? { background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }
                      : { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }
                    }
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {test.passed ? (
                        <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--fn-success)' }} />
                      ) : (
                        <XCircleIcon className="w-5 h-5" style={{ color: 'var(--fn-error)' }} />
                      )}
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {test.name || `Test Case ${index + 1}`}
                      </span>
                      <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                        {test.passed ? test.points : 0} / {test.points} points
                      </span>
                    </div>

                    {test.input && (
                      <div className="text-xs mb-1">
                        <span style={{ color: 'var(--text-muted)' }}>Input: </span>
                        <code style={{ color: 'var(--text-primary)' }}>{test.input}</code>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                        <code style={{ color: 'var(--text-primary)' }}>
                          {test.expectedOutput}
                        </code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Actual: </span>
                        <code style={{ color: test.passed ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                          {test.actualOutput}
                        </code>
                      </div>
                    </div>

                    {test.error && (
                      <div className="mt-2 text-xs" style={{ color: 'var(--fn-error)' }}>
                        Error: {test.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!output && !error && !executionResult && (
            <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
              Run your code to see the output
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualLab;
