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

  // Language mappings for Monaco Editor
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
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Language: {language}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          {theme === 'vs-dark' ? '☀️ Light' : '🌙 Dark'}
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
        }}
      />
    </div>
  );
};

export default CodeEditor;

