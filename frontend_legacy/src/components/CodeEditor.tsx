import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'python',
  height = '400px',
  readOnly = false,
}) => {
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  const languageMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    swift: 'swift',
    kotlin: 'kotlin',
    sql: 'sql',
    html: 'html',
    css: 'css',
  };

  const editorLanguage = languageMap[language.toLowerCase()] || 'python';

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {language}
        </span>
        <button
          type="button"
          onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          {theme === 'vs-dark' ? 'Light' : 'Dark'}
        </button>
      </div>
      <Editor
        height={height}
        language={editorLanguage}
        value={value}
        onChange={handleEditorChange}
        theme={theme}
        options={{
          readOnly,
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
  );
};

export default CodeEditor;
