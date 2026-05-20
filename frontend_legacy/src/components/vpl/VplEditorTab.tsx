import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { virtualLabApi, CodeExecutionResult } from '../../api/virtualLab';
import api from '../../api/client';

interface VplEditorAssignment {
  id: string;
  programming_language?: string;
  starter_code?: string;
  auto_grading_enabled?: boolean;
  max_points: number;
}

interface VplEditorTabProps {
  assignment: VplEditorAssignment;
  code: string;
  onCodeChange: (code: string) => void;
  onTestResult: (result: CodeExecutionResult) => void;
  onViewResults: () => void;
}

const LANG_MAP: Record<string, string> = {
  python: 'python', python3: 'python',
  javascript: 'javascript', js: 'javascript',
  java: 'java', cpp: 'cpp', 'c++': 'cpp',
};

const VplEditorTab: React.FC<VplEditorTabProps> = ({
  assignment, code, onCodeChange, onTestResult, onViewResults,
}) => {
  const lang = assignment.programming_language?.toLowerCase() || 'python';
  const monacoLang = LANG_MAP[lang] || lang;

  const [runResult, setRunResult] = useState<{ output?: string; error?: string; exitCode?: number; executionTime?: number } | null>(null);
  const [testSummary, setTestSummary] = useState<{ passed: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);
  const [splitPct, setSplitPct] = useState(60);
  const [rightTab, setRightTab] = useState<'output' | 'tests'>('output');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Persist code in localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`vpl-code-${assignment.id}`);
    if (saved && !code) {
      onCodeChange(saved);
    } else if (assignment.starter_code && !code) {
      onCodeChange(assignment.starter_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id]);

  useEffect(() => {
    if (code) localStorage.setItem(`vpl-code-${assignment.id}`, code);
  }, [code, assignment.id]);

  // Keyboard shortcut: Cmd/Ctrl+Enter → Run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stdin]);

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRightTab('output');
    try {
      const result = await virtualLabApi.runCode({
        language: lang,
        code,
        stdin: stdin || undefined,
      });
      setRunResult({
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      });
    } catch (err) {
      setRunResult({ error: err instanceof Error ? err.message : 'Execution failed', exitCode: -1 });
    } finally {
      setRunning(false);
    }
  }, [running, lang, code, stdin]);

  const handleRunTests = async () => {
    if (testing) return;
    setTesting(true);
    setRightTab('tests');
    try {
      const result = await virtualLabApi.execute({
        assignmentId: assignment.id,
        code,
        language: lang,
      });
      onTestResult(result);
      const passed = result.testResults?.filter(t => t.passed).length ?? 0;
      const total = result.testResults?.length ?? 0;
      setTestSummary({ passed, total });
    } catch (err) {
      setTestSummary(null);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Create submission
      const createRes = await api.post<{ id: string }>('/submissions', {
        assignmentId: assignment.id,
        textAnswer: code,
        submissionType: 'CODE',
      });
      const submissionId = createRes.data.id;
      // Submit it
      await api.post(`/submissions/${submissionId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Resizable drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(30, Math.min(80, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const outputContent = runResult?.output || runResult?.error;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
      >
        <span
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-subtle)' }}
        >
          {lang}
        </span>

        <div className="flex items-center gap-2">
          {/* Run button */}
          <button
            onClick={() => void handleRun()}
            disabled={running || testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            title="Run Code (Ctrl+Enter)"
          >
            {running ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
            Run
            <span className="text-xs opacity-50 font-mono">⌘↵</span>
          </button>

          {/* Run Tests button */}
          <button
            onClick={() => void handleRunTests()}
            disabled={running || testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--bg-surface)', color: 'var(--fn-warning)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            {testing ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Tests
          </button>

          {/* Submit button */}
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || submitted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: submitted ? 'rgba(34,197,94,0.1)' : 'var(--fn-success)',
              color: submitted ? 'var(--fn-success)' : '#fff',
              border: submitted ? '1px solid rgba(34,197,94,0.3)' : 'none',
            }}
          >
            {submitting ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : submitted ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Submitted
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Submit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* Editor pane */}
        <div style={{ width: `${splitPct}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={monacoLang}
              value={code}
              onChange={(v) => onCodeChange(v || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          {/* Stdin */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0 }}>
            <button
              onClick={() => setStdinOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>stdin (standard input)</span>
              <svg
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: stdinOpen ? 'rotate(180deg)' : 'none' }}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {stdinOpen && (
              <textarea
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Enter input..."
                rows={3}
                className="w-full px-4 py-2 text-sm resize-none outline-none"
                style={{
                  background: 'var(--bg-base)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              />
            )}
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="flex-shrink-0 cursor-col-resize flex items-center justify-center group"
          style={{ width: 6, background: 'var(--border-default)', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--border-default)')}
        />

        {/* Output pane */}
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          {/* Right pane tabs */}
          <div
            className="flex items-center px-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', height: 36 }}
          >
            <button
              onClick={() => setRightTab('output')}
              className="text-xs font-medium px-3 h-full border-b-2 transition-colors"
              style={rightTab === 'output'
                ? { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }
                : { borderColor: 'transparent', color: 'var(--text-muted)' }}
            >
              Output
            </button>
            <button
              onClick={() => setRightTab('tests')}
              className="text-xs font-medium px-3 h-full border-b-2 transition-colors"
              style={rightTab === 'tests'
                ? { borderColor: 'var(--fn-warning)', color: 'var(--fn-warning)' }
                : { borderColor: 'transparent', color: 'var(--text-muted)' }}
            >
              Tests
              {testSummary && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    background: testSummary.passed === testSummary.total ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: testSummary.passed === testSummary.total ? 'var(--fn-success)' : 'var(--fn-error)',
                  }}
                >
                  {testSummary.passed}/{testSummary.total}
                </span>
              )}
            </button>
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-auto p-4">
            {rightTab === 'output' && (
              <>
                {running && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fn-warning)' }}>
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Running...
                  </div>
                )}
                {!running && !runResult && (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>⌘ ↵</kbd> or click Run to execute
                  </p>
                )}
                {!running && runResult && (
                  <div className="space-y-3">
                    {outputContent ? (
                      <pre
                        className="text-sm whitespace-pre-wrap break-all"
                        style={{
                          color: runResult.error && !runResult.output ? 'var(--fn-error)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {outputContent}
                      </pre>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No output</p>
                    )}
                    <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>Exit code: {runResult.exitCode}</span>
                      {runResult.executionTime !== undefined && (
                        <span>{runResult.executionTime}ms</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {rightTab === 'tests' && (
              <>
                {testing && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fn-warning)' }}>
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Running tests...
                  </div>
                )}
                {!testing && !testSummary && (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    Click <span style={{ color: 'var(--fn-warning)' }}>Tests</span> to run the test suite
                  </p>
                )}
                {!testing && testSummary && (
                  <div className="space-y-4">
                    {/* Score bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {testSummary.passed} / {testSummary.total} tests passed
                        </span>
                        <span className="text-sm" style={{ color: testSummary.passed === testSummary.total ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                          {testSummary.total > 0 ? Math.round((testSummary.passed / testSummary.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${testSummary.total > 0 ? (testSummary.passed / testSummary.total) * 100 : 0}%`,
                            background: testSummary.passed === testSummary.total ? 'var(--fn-success)' : 'var(--fn-error)',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={onViewResults}
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      View detailed results →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <div
              className="px-4 py-2 text-xs flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--fn-error)', borderTop: '1px solid rgba(239,68,68,0.2)' }}
            >
              {submitError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VplEditorTab;
