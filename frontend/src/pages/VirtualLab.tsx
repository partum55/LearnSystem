import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Layout } from '../components';
import { virtualLabApi } from '../api/virtualLab';

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
] as const;

const LANG_MAP: Record<string, string> = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp',
};

const STORAGE_KEY = 'vpl-playground';

const VirtualLab: React.FC = () => {
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);
  const [output, setOutput] = useState<{ text?: string; isError?: boolean; time?: number; exitCode?: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [splitPct, setSplitPct] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Persist code per language
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-${language}`);
    setCode(saved || '');
  }, [language]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-${language}`, code);
  }, [code, language]);

  // Cmd/Ctrl+Enter shortcut
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
  }, [code, stdin, language]);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await virtualLabApi.runCode({ language, code, stdin: stdin || undefined });
      setOutput({
        text: result.output || result.error || '(no output)',
        isError: !result.success && !result.output,
        time: result.executionTime,
        exitCode: result.exitCode,
      });
    } catch (err) {
      setOutput({ text: err instanceof Error ? err.message : 'Execution failed', isError: true, exitCode: -1 });
    } finally {
      setRunning(false);
    }
  };

  // Resizable drag
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPct(Math.max(30, Math.min(80, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-3">
            <h1
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              Code Playground
            </h1>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="text-sm rounded px-3 py-1.5 outline-none"
              style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => void handleRun()}
            disabled={running}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            {running ? (
              <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
            Run
            <span className="text-xs opacity-40 font-mono">⌘↵</span>
          </button>
        </div>

        {/* Split pane */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">
          {/* Editor */}
          <div style={{ width: `${splitPct}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={LANG_MAP[language] || language}
                value={code}
                onChange={v => setCode(v || '')}
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
                className="w-full flex items-center justify-between px-4 py-2 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                stdin
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
                    background: 'var(--bg-base)', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border-subtle)',
                  }}
                />
              )}
            </div>
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            className="flex-shrink-0 cursor-col-resize"
            style={{ width: 6, background: 'var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--border-default)')}
          />

          {/* Output */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-base)' }}
          >
            <div
              className="px-4 py-2 text-xs font-medium flex-shrink-0"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              Output
            </div>
            <div className="flex-1 overflow-auto p-4">
              {running && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fn-warning)' }}>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Running...
                </div>
              )}
              {!running && !output && (
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                  Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>⌘ ↵</kbd> or click Run
                </p>
              )}
              {!running && output && (
                <div className="space-y-3">
                  <pre
                    className="text-sm whitespace-pre-wrap break-all"
                    style={{
                      color: output.isError ? 'var(--fn-error)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {output.text}
                  </pre>
                  <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Exit: {output.exitCode}</span>
                    {output.time !== undefined && <span>{output.time}ms</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VirtualLab;
