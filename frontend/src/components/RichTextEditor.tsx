import React, { useRef } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  enableLatex?: boolean;
  enableCode?: boolean;
}

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

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = before + prefix + selectedText + suffix + after;
    onChange(newValue);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const toolbarButtons = [
    { label: 'B', title: 'Bold', action: () => insertMarkdown('**', '**') },
    { label: 'I', title: 'Italic', action: () => insertMarkdown('*', '*') },
    { label: 'H1', title: 'Heading 1', action: () => insertMarkdown('# ') },
    { label: 'H2', title: 'Heading 2', action: () => insertMarkdown('## ') },
    { label: 'Link', title: 'Insert Link', action: () => insertMarkdown('[', '](url)') },
    { label: 'Quote', title: 'Blockquote', action: () => insertMarkdown('> ') },
    { label: 'List', title: 'Bullet List', action: () => insertMarkdown('- ') },
    { label: '1.', title: 'Numbered List', action: () => insertMarkdown('1. ') },
  ];

  if (enableCode) {
    toolbarButtons.push(
      { label: 'Code', title: 'Inline Code', action: () => insertMarkdown('`', '`') },
      { label: 'Code Block', title: 'Code Block', action: () => insertMarkdown('```\n', '\n```') }
    );
  }

  if (enableLatex) {
    toolbarButtons.push(
      { label: 'LaTeX', title: 'Inline LaTeX', action: () => insertMarkdown('$', '$') },
      { label: 'LaTeX Block', title: 'LaTeX Block', action: () => insertMarkdown('$$\n', '\n$$') }
    );
  }

  // Render markdown with LaTeX support
  const renderPreview = () => {
    let html = value;

    // Convert markdown headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto my-2"><code>$2</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">$1</code>');

    // LaTeX (placeholder - would need actual LaTeX renderer like KaTeX)
    // eslint-disable-next-line no-useless-escape
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="bg-blue-50 dark:bg-blue-900/20 p-3 my-2 rounded border border-blue-200 dark:border-blue-800"><em>LaTeX Block:</em> $1</div>');
    // eslint-disable-next-line no-useless-escape
    html = html.replace(/\$([^\$]+)\$/g, '<span class="bg-blue-50 dark:bg-blue-900/20 px-1 rounded"><em>LaTeX:</em> $1</span>');

    // Lists
    // eslint-disable-next-line no-useless-escape
    html = html.replace(/^\- (.+)$/gim, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4 list-decimal">$1</li>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-2">$1</blockquote>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    // Sanitize
    const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    return clean;
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-100 dark:bg-gray-700 px-2 py-2 flex items-center gap-1 border-b border-gray-300 dark:border-gray-600 flex-wrap">
        {toolbarButtons.map((btn, idx) => (
          <button
            key={idx}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {btn.label}
          </button>
        ))}
        <div className="flex-1"></div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Help"
        >
          ?
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4 text-sm">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Markdown & LaTeX Help</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
            <div>
              <p><code>**bold**</code> → <strong>bold</strong></p>
              <p><code>*italic*</code> → <em>italic</em></p>
              <p><code>`code`</code> → inline code</p>
              <p><code>```code block```</code></p>
            </div>
            <div>
              <p><code># Heading 1</code></p>
              <p><code>## Heading 2</code></p>
              <p><code>[link](url)</code> → link</p>
              {enableLatex && <p><code>$x^2$</code> → inline LaTeX</p>}
              {enableLatex && <p><code>$$...$$</code> → LaTeX block</p>}
            </div>
          </div>
        </div>
      )}

      {/* Editor or Preview */}
      {showPreview ? (
        <div 
          className="p-4 prose dark:prose-invert max-w-none overflow-y-auto"
          style={{ height, minHeight: height }}
          dangerouslySetInnerHTML={{ __html: renderPreview() }}
        />
      ) : (
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none font-mono text-sm"
          style={{ height, minHeight: height }}
        />
      )}

      {/* Character count */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600">
        {value.length} characters
      </div>
    </div>
  );
};

export default RichTextEditor;
