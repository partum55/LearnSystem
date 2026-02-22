import React, { useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  enableLatex?: boolean;
  enableCode?: boolean;
}

const toolbarBtnClass = 'px-2 py-1 text-xs rounded transition-colors';

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  height = '300px',
  enableLatex = true,
  enableCode = true,
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  const insertMarkdown = useCallback((prefix: string, suffix: string = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = before + prefix + selectedText + suffix + after;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [value, onChange]);

  const renderPreview = () => {
    let html = value;
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--text-primary);text-decoration:underline" target="_blank">$1</a>');
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:var(--bg-overlay);padding:12px;border-radius:6px;overflow-x:auto;margin:8px 0"><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg-overlay);padding:2px 6px;border-radius:4px;font-family:var(--font-mono)">$1</code>');
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div style="background:var(--bg-overlay);padding:12px;margin:8px 0;border-radius:6px;border:1px solid var(--border-default)"><em>LaTeX:</em> $1</div>');
    html = html.replace(/\$([^$]+)\$/g, '<span style="background:var(--bg-overlay);padding:2px 4px;border-radius:4px"><em>LaTeX:</em> $1</span>');
    html = html.replace(/^- (.+)$/gim, '<li style="margin-left:16px">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li style="margin-left:16px;list-style-type:decimal">$1</li>');
    html = html.replace(/^> (.+)$/gim, '<blockquote style="border-left:3px solid var(--border-strong);padding-left:12px;font-style:italic;margin:8px 0">$1</blockquote>');
    html = html.replace(/\n/g, '<br />');
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      {/* Toolbar */}
      <div
        className="px-2 py-2 flex items-center gap-1 flex-wrap"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button type="button" onClick={() => insertMarkdown('**', '**')} title="Bold" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>B</button>
        <button type="button" onClick={() => insertMarkdown('*', '*')} title="Italic" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>I</button>
        <button type="button" onClick={() => insertMarkdown('# ')} title="Heading 1" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>H1</button>
        <button type="button" onClick={() => insertMarkdown('## ')} title="Heading 2" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>H2</button>
        <button type="button" onClick={() => insertMarkdown('[', '](url)')} title="Insert Link" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>Link</button>
        <button type="button" onClick={() => insertMarkdown('> ')} title="Blockquote" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>Quote</button>
        <button type="button" onClick={() => insertMarkdown('- ')} title="Bullet List" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>List</button>
        <button type="button" onClick={() => insertMarkdown('1. ')} title="Numbered List" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>1.</button>

        {enableCode && (
          <>
            <button type="button" onClick={() => insertMarkdown('`', '`')} title="Inline Code" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>Code</button>
            <button type="button" onClick={() => insertMarkdown('```\n', '\n```')} title="Code Block" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>Block</button>
          </>
        )}

        {enableLatex && (
          <>
            <button type="button" onClick={() => insertMarkdown('$', '$')} title="Inline LaTeX" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>LaTeX</button>
            <button type="button" onClick={() => insertMarkdown('$$\n', '\n$$')} title="LaTeX Block" className={toolbarBtnClass} style={{ color: 'var(--text-secondary)' }}>$$</button>
          </>
        )}

        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="px-2.5 py-1 text-xs rounded-md transition-colors"
          style={{
            background: showPreview ? 'var(--bg-active)' : 'transparent',
            color: showPreview ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{ color: 'var(--text-faint)' }}
          title="Help"
        >
          ?
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="p-4 text-sm" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Markdown & LaTeX Help</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ color: 'var(--text-muted)' }}>
            <div>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>**bold**</code> — <strong>bold</strong></p>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>*italic*</code> — <em>italic</em></p>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>`code`</code> — inline code</p>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>```code block```</code></p>
            </div>
            <div>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}># Heading 1</code></p>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>## Heading 2</code></p>
              <p><code style={{ fontFamily: 'var(--font-mono)' }}>[link](url)</code> — link</p>
              {enableLatex && <p><code style={{ fontFamily: 'var(--font-mono)' }}>$x^2$</code> — inline LaTeX</p>}
              {enableLatex && <p><code style={{ fontFamily: 'var(--font-mono)' }}>$$...$$</code> — LaTeX block</p>}
            </div>
          </div>
        </div>
      )}

      {/* Editor or Preview */}
      {showPreview ? (
        <div
          className="p-4 overflow-y-auto"
          style={{ height, minHeight: height, color: 'var(--text-primary)', background: 'var(--bg-elevated)' }}
          dangerouslySetInnerHTML={{ __html: renderPreview() }}
        />
      ) : (
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 resize-none focus:outline-none text-sm"
          style={{
            height,
            minHeight: height,
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        />
      )}

      {/* Character count */}
      <div className="px-4 py-1 text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-faint)', borderTop: '1px solid var(--border-subtle)' }}>
        {value.length} characters
      </div>
    </div>
  );
};

export default RichTextEditor;
