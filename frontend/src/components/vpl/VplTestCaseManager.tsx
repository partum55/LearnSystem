import React from 'react';
import { VplConfig } from '../../types';

interface TestCaseDraft {
  input: string;
  expected_output: string;
  points: number;
  name?: string;
  hidden?: boolean;
  checkMode?: 'EXACT' | 'TRIM' | 'CONTAINS' | 'REGEX';
}

interface VplTestCaseManagerProps {
  vplConfig: VplConfig | null;
  testCases: TestCaseDraft[];
  language?: string;
  onChange: (config: VplConfig, testCases: TestCaseDraft[]) => void;
}

const DEFAULT_VPL_CONFIG: VplConfig = {
  mode: 'io',
  language: 'python',
  timeLimitSeconds: 10,
  memoryLimitMb: 128,
  pylintEnabled: false,
  pylintMinScore: 7,
  scoringMode: 'weighted',
  maxSubmitAttempts: 0,
};

const CHECK_MODES = ['EXACT', 'TRIM', 'CONTAINS', 'REGEX'] as const;

const VplTestCaseManager: React.FC<VplTestCaseManagerProps> = ({
  vplConfig, testCases, language, onChange,
}) => {
  const cfg = vplConfig ?? { ...DEFAULT_VPL_CONFIG, language: (language as VplConfig['language']) || 'python' };

  const updateConfig = (patch: Partial<VplConfig>) => {
    onChange({ ...cfg, ...patch }, testCases);
  };

  const addTestCase = () => {
    onChange(cfg, [...testCases, { input: '', expected_output: '', points: 1, name: `Test ${testCases.length + 1}`, hidden: false, checkMode: 'TRIM' }]);
  };

  const updateTestCase = (index: number, patch: Partial<TestCaseDraft>) => {
    const updated = testCases.map((tc, i) => i === index ? { ...tc, ...patch } : tc);
    onChange(cfg, updated);
  };

  const removeTestCase = (index: number) => {
    onChange(cfg, testCases.filter((_, i) => i !== index));
  };

  const moveTestCase = (index: number, dir: -1 | 1) => {
    const arr = [...testCases];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    onChange(cfg, arr);
  };

  const inputStyle = {
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="space-y-6">
      {/* VplConfig panel */}
      <div
        className="p-4 rounded-xl space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Virtual Lab Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mode */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Mode</label>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
              {(['io', 'framework'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateConfig({ mode: m })}
                  className="flex-1 py-1.5 text-sm font-medium transition-colors capitalize"
                  style={cfg.mode === m
                    ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                    : { background: 'transparent', color: 'var(--text-muted)' }}
                >
                  {m === 'io' ? 'IO Tests' : 'Framework'}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Language</label>
            <select
              value={cfg.language}
              onChange={e => updateConfig({ language: e.target.value as VplConfig['language'] })}
              style={{ ...inputStyle }}
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          {/* Time limit */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Time limit (s)</label>
            <input
              type="number" min={1} max={30}
              value={cfg.timeLimitSeconds}
              onChange={e => updateConfig({ timeLimitSeconds: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>

          {/* Memory limit */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Memory limit (MB)</label>
            <input
              type="number" min={32} max={512}
              value={cfg.memoryLimitMb}
              onChange={e => updateConfig({ memoryLimitMb: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>

          {/* Scoring mode */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Scoring mode</label>
            <select
              value={cfg.scoringMode}
              onChange={e => updateConfig({ scoringMode: e.target.value as VplConfig['scoringMode'] })}
              style={{ ...inputStyle }}
            >
              <option value="weighted">Weighted (per-test points)</option>
              <option value="all_or_nothing">All-or-nothing</option>
            </select>
          </div>

          {/* Max submit attempts */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Max submit attempts (0 = unlimited)</label>
            <input
              type="number" min={0}
              value={cfg.maxSubmitAttempts}
              onChange={e => updateConfig({ maxSubmitAttempts: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Pylint (Python only) */}
        {cfg.language === 'python' && (
          <div className="pt-2 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.pylintEnabled}
                onChange={e => updateConfig({ pylintEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enable Pylint code quality check</span>
            </label>
            {cfg.pylintEnabled && (
              <div className="flex items-center gap-4">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Min score: {cfg.pylintMinScore}/10
                </label>
                <input
                  type="range" min={1} max={10} step={0.5}
                  value={cfg.pylintMinScore}
                  onChange={e => updateConfig({ pylintMinScore: Number(e.target.value) })}
                  className="flex-1"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Test Cases ({testCases.length})
          </h3>
          <button
            type="button"
            onClick={addTestCase}
            className="btn btn-primary px-3 py-1 text-sm"
          >
            + Add test case
          </button>
        </div>

        <div className="space-y-3">
          {testCases.map((tc, i) => (
            <div
              key={i}
              className="p-4 rounded-xl space-y-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              {/* Row header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Reorder */}
                  <button
                    type="button"
                    onClick={() => moveTestCase(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded disabled:opacity-30 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTestCase(i, 1)}
                    disabled={i === testCases.length - 1}
                    className="p-1 rounded disabled:opacity-30 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <input
                    value={tc.name || `Test ${i + 1}`}
                    onChange={e => updateTestCase(i, { name: e.target.value })}
                    className="text-sm font-medium bg-transparent outline-none border-b border-transparent hover:border-current focus:border-current transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder={`Test ${i + 1}`}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={tc.hidden || false}
                      onChange={e => updateTestCase(i, { hidden: e.target.checked })}
                      className="rounded"
                    />
                    Hidden
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTestCase(i)}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--fn-error)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Input (stdin)</label>
                  <textarea
                    value={tc.input}
                    onChange={e => updateTestCase(i, { input: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                    placeholder="(empty)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Expected output</label>
                  <textarea
                    value={tc.expected_output}
                    onChange={e => updateTestCase(i, { expected_output: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                    placeholder="(empty)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Check mode</label>
                  <select
                    value={tc.checkMode || 'TRIM'}
                    onChange={e => updateTestCase(i, { checkMode: e.target.value as TestCaseDraft['checkMode'] })}
                    style={{ ...inputStyle, width: 'auto' }}
                  >
                    {CHECK_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Points</label>
                  <input
                    type="number" min={0}
                    value={tc.points}
                    onChange={e => updateTestCase(i, { points: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 80 }}
                  />
                </div>
              </div>
            </div>
          ))}

          {testCases.length === 0 && (
            <div
              className="text-center py-10 rounded-xl"
              style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
            >
              <p className="text-sm">No test cases yet</p>
              <button
                type="button"
                onClick={addTestCase}
                className="mt-2 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                Add your first test case →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VplTestCaseManager;
