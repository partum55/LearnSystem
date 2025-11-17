import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import CodeEditor from '../components/CodeEditor';
import { Assignment } from '../types';
import { PlayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

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
  const { assignmentId } = useParams<{ assignmentId: string }>();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assessments/assignments/${assignmentId}`);
      const data = response.data as Assignment;
      setAssignment(data);
      
      // Set starter code if available
      if (data.starter_code) {
        setCode(data.starter_code);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignment:', err);
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const executeCode = async () => {
    if (!assignment) return;

    try {
      setExecuting(true);
      setOutput('');
      setError('');
      setExecutionResult(null);

      const response = await api.post('/assessments/virtual-lab/execute', {
        assignmentId: assignment.id,
        code,
        language: assignment.programming_language || 'python',
        input,
      });

      const result = response.data as ExecutionResult;
      setExecutionResult(result);
      
      if (result.success) {
        setOutput(result.output || 'Program executed successfully with no output');
      } else {
        setError(result.error || 'Execution failed');
      }
    } catch (err: any) {
      console.error('Code execution failed:', err);
      setError(err.response?.data?.message || 'Failed to execute code');
    } finally {
      setExecuting(false);
    }
  };

  const calculateScore = () => {
    if (!executionResult?.testResults) return 0;
    
    return executionResult.testResults.reduce((sum, test) => sum + (test.points || 0), 0);
  };

  const getTotalPoints = () => {
    if (!assignment?.test_cases) return 0;
    
    return assignment.test_cases.reduce((sum, tc: any) => sum + (tc.points || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Assignment not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {assignment.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {assignment.description}
        </p>
        {assignment.instructions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Instructions
            </h3>
            <div className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Code Editor
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Input (optional)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm"
              rows={3}
              placeholder="Enter program input here..."
            />
          </div>

          <button
            onClick={executeCode}
            disabled={executing || !code.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <PlayIcon className="w-5 h-5" />
            {executing ? 'Running...' : 'Run Code'}
          </button>
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Output
          </h2>

          {executionResult && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Execution time: {executionResult.executionTime}ms</span>
                <span className={executionResult.success ? 'text-green-600' : 'text-red-600'}>
                  • {executionResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
          )}

          {output && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Standard Output
              </h3>
              <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Error Output
              </h3>
              <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm font-mono overflow-x-auto text-red-800 dark:text-red-200 whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          )}

          {executionResult?.testResults && executionResult.testResults.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Results
                </h3>
                <div className="text-sm">
                  <span className="font-semibold">Score: </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {calculateScore()} / {getTotalPoints()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {executionResult.testResults.map((test, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${
                      test.passed
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {test.passed ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {test.name || `Test Case ${index + 1}`}
                      </span>
                      <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                        {test.passed ? test.points : 0} / {test.points} points
                      </span>
                    </div>
                    
                    {test.input && (
                      <div className="text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Input: </span>
                        <code className="text-gray-800 dark:text-gray-200">{test.input}</code>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Expected: </span>
                        <code className="text-gray-800 dark:text-gray-200">
                          {test.expectedOutput}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Actual: </span>
                        <code className={test.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                          {test.actualOutput}
                        </code>
                      </div>
                    </div>

                    {test.error && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Error: {test.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!output && !error && !executionResult && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              Run your code to see the output
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualLab;
