import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, JSONContent, useEditor, NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { CitationModal } from './modals/CitationModal';
import { TestCaseModal } from './modals/TestCaseModal';
import { MathInputModal } from './modals/MathInputModal';
import { EmbedModal } from './modals/EmbedModal';
import { CodeBlockModal } from './modals/CodeBlockModal';
import { FootnoteModal } from './modals/FootnoteModal';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CanonicalDocument, CanonicalNode } from '../../types';
import './block-editor.css';

type EditorMode = 'full' | 'lite';

interface BlockEditorProps {
  value: CanonicalDocument;
  onChange: (doc: CanonicalDocument) => void;
  readOnly?: boolean;
  mode?: EditorMode;
  placeholder?: string;
  onUploadMedia?: (file: File) => Promise<{ url: string; contentType?: string }>;
}

type SlashCommand = {
  key: string;
  label: string;
  keywords: string[];
  execute: () => void;
};

const sanitizeImportedHtml = (rawHtml: string): string =>
  DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'span',
      'strong',
      'em',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'a',
      'img',
      'figure',
      'figcaption',
      'div',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'class',
      'data-type',
      'data-variant',
      'data-sequence',
      'data-latex',
      'data-provider',
      'data-url',
      'data-embed-url',
      'data-caption',
      'data-alignment',
      'data-citation-type',
      'data-author',
      'data-year',
      'data-key',
      'data-ordinal',
      'data-score',
      'data-input',
      'data-output',
      'data-visibility',
      'data-code',
      'style',
    ],
    KEEP_CONTENT: true,
  });

type EmbedProvider = 'youtube' | 'pdf';

type SafeEmbed = {
  embedUrl: string;
  sourceUrl: string;
};

const EMBED_PROTOCOL_ALLOWLIST = new Set(['https:', 'http:']);
const YOUTUBE_HOST_ALLOWLIST = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
];

const normalizeHost = (host: string): string => host.trim().toLowerCase();

const hostAllowed = (host: string, allowlist: string[]): boolean => {
  const normalizedHost = normalizeHost(host);
  return allowlist.some((item) => {
    const normalizedItem = normalizeHost(item);
    if (!normalizedItem) return false;
    if (normalizedItem.startsWith('*.')) {
      const bare = normalizedItem.slice(2);
      return normalizedHost === bare || normalizedHost.endsWith(`.${bare}`);
    }
    return normalizedHost === normalizedItem;
  });
};

const readPdfAllowlist = (): string[] => {
  const configured = (import.meta.env.VITE_PDF_EMBED_ALLOWLIST || '')
    .split(',')
    .map((host: string) => host.trim())
    .filter(Boolean);
  const localHost = typeof window !== 'undefined' ? [window.location.hostname] : [];
  return Array.from(new Set([...localHost, ...configured]));
};

const parseEmbedUrl = (rawUrl: string): URL | null => {
  const value = rawUrl.trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    if (value.startsWith('/')) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        return new URL(value, origin);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const extractYouTubeVideoId = (url: URL): string | null => {
  const host = normalizeHost(url.hostname);
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const segment = url.pathname.split('/').filter(Boolean)[0];
    return segment || null;
  }

  if (hostAllowed(host, YOUTUBE_HOST_ALLOWLIST)) {
    const fromWatch = url.searchParams.get('v');
    if (fromWatch) return fromWatch;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' && parts[1]) {
      return parts[1];
    }
    if (parts[0] === 'shorts' && parts[1]) {
      return parts[1];
    }
  }

  return null;
};

const resolveSafeEmbed = (provider: EmbedProvider, rawUrl: string): SafeEmbed | null => {
  const parsed = parseEmbedUrl(rawUrl);
  if (!parsed) return null;
  if (!EMBED_PROTOCOL_ALLOWLIST.has(parsed.protocol)) return null;

  if (provider === 'youtube') {
    if (!hostAllowed(parsed.hostname, YOUTUBE_HOST_ALLOWLIST)) return null;
    const videoId = extractYouTubeVideoId(parsed);
    if (!videoId || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null;

    return {
      sourceUrl: parsed.href,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  const pdfAllowlist = readPdfAllowlist();
  if (!hostAllowed(parsed.hostname, pdfAllowlist)) return null;
  if (!/\.pdf(?:[?#].*)?$/i.test(parsed.href)) return null;

  return {
    sourceUrl: parsed.href,
    embedUrl: parsed.href,
  };
};

const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      variant: { default: 'info' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const variant = String(HTMLAttributes.variant || 'info');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'callout',
        'data-variant': variant,
        class: `editor-callout editor-callout-${variant}`,
      }),
      0,
    ];
  },
});

const CitationNode = Node.create({
  name: 'citation',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      author: { default: '' },
      title: { default: '' },
      year: { default: null },
      url: { default: '' },
      citationType: { default: 'APA' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="citation"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const author = String(HTMLAttributes.author || 'Unknown author');
    const title = String(HTMLAttributes.title || 'Untitled');
    const year = HTMLAttributes.year ? String(HTMLAttributes.year) : 'n.d.';
    const citationType = String(HTMLAttributes.citationType || 'APA');
    const url = String(HTMLAttributes.url || '');

    const content = `${author} (${year}). ${title}${url ? ` — ${url}` : ''}`;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'citation',
        'data-citation-type': citationType,
        class: 'editor-citation',
      }),
      content,
    ];
  },
});

const FootnoteNode = Node.create({
  name: 'footnote',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      key: { default: '' },
      ordinal: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="footnote"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'footnote',
        class: 'editor-footnote',
      }),
      0,
    ];
  },
});

const NumberedParagraphNode = Node.create({
  name: 'numberedParagraph',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      sequence: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'p[data-type="numbered-paragraph"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'numbered-paragraph',
        class: 'editor-numbered-paragraph',
      }),
      0,
    ];
  },
});

const TestCaseNode = Node.create({
  name: 'testCase',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      input: { default: '' },
      output: { default: '' },
      visibility: { default: 'public' },
      score: { default: 0 },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="test-case"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const input = String(HTMLAttributes.input || '');
    const output = String(HTMLAttributes.output || '');
    const visibility = String(HTMLAttributes.visibility || 'public');
    const score = Number(HTMLAttributes.score || 0);

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'test-case',
        class: 'editor-test-case',
      }),
      `TestCase [${visibility}] (${score} pts) input: ${input} | output: ${output}`,
    ];
  },
});

const EmbedView: React.FC<NodeViewProps> = ({ node }) => {
  const provider = String(node.attrs.provider || 'youtube') as EmbedProvider;
  const title = String(node.attrs.title || '').trim();
  const rawUrl = String(node.attrs.url || node.attrs.embedUrl || '');
  const safeEmbed = resolveSafeEmbed(provider, rawUrl);

  return (
    <NodeViewWrapper className="editor-embed">
      <div className="editor-embed-frame-wrap">
        {safeEmbed ? (
          <iframe
            className="editor-embed-frame"
            src={safeEmbed.embedUrl}
            title={title || `${provider} embed`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={
              provider === 'youtube'
                ? 'allow-scripts allow-same-origin allow-presentation'
                : 'allow-same-origin allow-scripts'
            }
            allow={
              provider === 'youtube'
                ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                : undefined
            }
            allowFullScreen={provider === 'youtube'}
          />
        ) : (
          <div className="editor-embed-blocked">
            Embed blocked by provider/domain allowlist.
          </div>
        )}
      </div>
      {rawUrl && (
        <a href={safeEmbed?.sourceUrl || rawUrl} target="_blank" rel="noopener noreferrer">
          {title || rawUrl}
        </a>
      )}
    </NodeViewWrapper>
  );
};

const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      provider: { default: 'youtube' },
      url: { default: '' },
      embedUrl: { default: '' },
      title: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const provider = String(HTMLAttributes.provider || 'embed');
    const url = String(HTMLAttributes.url || '');
    const title = String(HTMLAttributes.title || `${provider} embed`);
    const embedUrl = String(HTMLAttributes.embedUrl || '');

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'embed',
        'data-provider': provider,
        'data-url': url,
        'data-embed-url': embedUrl,
        class: 'editor-embed',
      }),
      [
        'a',
        {
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        `${title || provider}: ${url}`,
      ],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});

const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      alignment: { default: 'center' },
    };
  },
  parseHTML() {
    return [{ tag: 'figure[data-type="image"]' }, { tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || '');
    const alt = String(HTMLAttributes.alt || '');
    const caption = String(HTMLAttributes.caption || '');
    const alignment = String(HTMLAttributes.alignment || 'center');

    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'image',
        'data-caption': caption,
        'data-alignment': alignment,
        class: `editor-image-block align-${alignment}`,
      }),
      ['img', { src, alt }],
      caption ? ['figcaption', {}, caption] : ['figcaption', {}, ''],
    ];
  },
});

let mermaidInitialized = false;
const ensureMermaidInitialized = () => {
  if (mermaidInitialized) {
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
};

const MermaidBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(node.attrs.code || ''));
  const [diagramSvg, setDiagramSvg] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);
  const isEditable = editor.isEditable;

  useEffect(() => {
    setDraft(String(node.attrs.code || ''));
  }, [node.attrs.code]);

  useEffect(() => {
    const code = String(node.attrs.code || '').trim();
    if (!code) {
      setDiagramSvg('');
      setRenderError('Mermaid code is empty.');
      return;
    }

    ensureMermaidInitialized();
    let disposed = false;
    mermaid
      .render(renderIdRef.current, code)
      .then(({ svg }) => {
        if (!disposed) {
          setDiagramSvg(svg);
          setRenderError(null);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setRenderError(error instanceof Error ? error.message : 'Failed to render Mermaid.');
          setDiagramSvg('');
        }
      });

    return () => {
      disposed = true;
    };
  }, [node.attrs.code]);

  if (editing && isEditable) {
    return (
      <NodeViewWrapper className="editor-mermaid-block">
        <textarea
          className="w-full input"
          rows={8}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="graph TD&#10;  A[Start] --> B[End]"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => {
              updateAttributes({ code: draft });
              setEditing(false);
            }}
          >
            Save Diagram
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setDraft(String(node.attrs.code || ''));
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="editor-mermaid-block"
      onDoubleClick={() => {
        if (isEditable) {
          setEditing(true);
        }
      }}
    >
      {renderError ? (
        <div className="editor-mermaid-error">Mermaid render error: {renderError}</div>
      ) : (
        <div className="editor-mermaid-svg" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
      )}
      {isEditable && (
        <button
          type="button"
          className="btn btn-ghost btn-xs mt-2"
          onClick={() => setEditing(true)}
        >
          Edit Mermaid
        </button>
      )}
    </NodeViewWrapper>
  );
};

const MermaidNode = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      code: { default: 'graph TD\n  A[Start] --> B[End]' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const code = String(HTMLAttributes.code || '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        'data-code': code,
        class: 'editor-mermaid-block',
      }),
      ['pre', {}, code],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },
});

const renderKatex = (latex: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false });
  } catch {
    return `<span style="color:var(--fn-error)">${DOMPurify.sanitize(latex)}</span>`;
  }
};

const MathBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.latex as string);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditable = editor.isEditable;

  useEffect(() => { setDraft(node.attrs.latex as string); }, [node.attrs.latex]);

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus();
  }, [editing]);

  if (editing && isEditable) {
    return (
      <NodeViewWrapper className="editor-math-block">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            updateAttributes({ latex: draft });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { updateAttributes({ latex: draft }); setEditing(false); }
          }}
          className="w-full bg-transparent text-sm resize-none outline-none"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', minHeight: '60px' }}
          rows={3}
        />
        <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Press Escape or click outside to save</div>
      </NodeViewWrapper>
    );
  }

  const html = renderKatex(node.attrs.latex as string, true);
  return (
    <NodeViewWrapper
      className="editor-math-block"
      onClick={() => isEditable && setEditing(true)}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
};

const MathInlineView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.attrs.latex as string);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditable = editor.isEditable;

  useEffect(() => { setDraft(node.attrs.latex as string); }, [node.attrs.latex]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (editing && isEditable) {
    return (
      <NodeViewWrapper as="span" className="editor-math-inline">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { updateAttributes({ latex: draft }); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') { updateAttributes({ latex: draft }); setEditing(false); }
          }}
          className="bg-transparent outline-none text-sm"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: `${Math.max(draft.length * 0.6, 4)}em` }}
        />
      </NodeViewWrapper>
    );
  }

  const html = renderKatex(node.attrs.latex as string, false);
  return (
    <NodeViewWrapper
      as="span"
      className="editor-math-inline"
      onClick={() => isEditable && setEditing(true)}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
};

const MathBlockNode = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      latex: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const latex = String(HTMLAttributes.latex || '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math-block',
        class: 'editor-math-block',
      }),
      `$$${latex}$$`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },
});

const MathInlineNode = Node.create({
  name: 'mathInline',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      latex: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const latex = String(HTMLAttributes.latex || '');
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math-inline',
        class: 'editor-math-inline',
      }),
      `\\(${latex}\\)`,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },
});

const ToolbarButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; isActive?: boolean }> = ({
  label,
  onClick,
  disabled,
  isActive,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="px-2 py-1 text-sm rounded border disabled:opacity-50 transition-colors"
    style={{
      borderColor: isActive ? 'var(--border-strong)' : 'var(--border-default)',
      background: isActive ? 'var(--bg-active)' : 'transparent',
      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    }}
  >
    {label}
  </button>
);

export const BlockEditor: React.FC<BlockEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  mode = 'full',
  placeholder,
  onUploadMedia,
}) => {
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Modal states
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState<false | 'block' | 'inline'>(false);
  const [showEmbedModal, setShowEmbedModal] = useState<false | 'youtube' | 'pdf'>(false);
  const [showCodeBlockModal, setShowCodeBlockModal] = useState(false);
  const [showFootnoteModal, setShowFootnoteModal] = useState(false);

  const toTiptapDocument = (doc: CanonicalDocument): JSONContent => ({
    type: 'doc',
    content: (doc.content as unknown as JSONContent[]) ?? [],
  });

  const toCanonicalDocument = (doc: JSONContent, source: CanonicalDocument): CanonicalDocument => ({
    version: source.version || 1,
    type: 'doc',
    meta: source.meta ?? {},
    content: (doc.content as unknown as CanonicalNode[]) ?? [],
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Type / for block commands...',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CalloutNode,
      CitationNode,
      FootnoteNode,
      NumberedParagraphNode,
      TestCaseNode,
      EmbedNode,
      ImageNode,
      MermaidNode,
      MathBlockNode,
      MathInlineNode,
    ],
    editable: !readOnly,
    content: toTiptapDocument(value),
    onUpdate({ editor: tiptapEditor }) {
      onChange(toCanonicalDocument(tiptapEditor.getJSON(), value));
    },
    editorProps: {
      attributes: {
        class:
          readOnly
            ? 'p-2 outline-none max-w-none text-[var(--text-primary)] leading-7'
            : 'min-h-[320px] p-4 outline-none max-w-none text-[var(--text-primary)] leading-7',
      },
      transformPastedHTML: (html) => sanitizeImportedHtml(html),
      handleKeyDown: (_view, event) => {
        if (event.isComposing || readOnly || !editor) {
          return false;
        }

        if (
          event.key === '/' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          setSlashQuery('');
          setShowSlashCommands(true);
          return true;
        }

        if (event.key === 'Escape' && showSlashCommands) {
          event.preventDefault();
          setShowSlashCommands(false);
          return true;
        }

        if (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const direction = event.key === 'ArrowUp' ? -1 : 1;

            const current = editor.getJSON();
            const blocks: JSONContent[] = Array.isArray(current.content)
              ? [...(current.content as JSONContent[])]
              : [];
            if (blocks.length < 2) {
              return true;
            }

            const cursor = editor.state.selection.from;
            let selectedIndex = -1;
            editor.state.doc.forEach((node, offset, index) => {
              const start = offset + 1;
              const end = start + node.nodeSize - 1;
              if (cursor >= start && cursor <= end) {
                selectedIndex = index;
              }
            });

            if (selectedIndex === -1) {
              return true;
            }

            const targetIndex = selectedIndex + direction;
            if (targetIndex < 0 || targetIndex >= blocks.length) {
              return true;
            }

            const [moved] = blocks.splice(selectedIndex, 1);
            blocks.splice(targetIndex, 0, moved);
            editor.commands.setContent({ type: 'doc', content: blocks }, { emitUpdate: true });
            editor.commands.focus();
            return true;
          }
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getJSON();
    const incoming = toTiptapDocument(value);
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  const insertInlineMath = () => {
    if (!editor || readOnly) return;
    setShowMathModal('inline');
  };

  const insertMathBlock = () => {
    if (!editor || readOnly) return;
    setShowMathModal('block');
  };

  const handleMathInsert = useCallback((latex: string) => {
    if (!editor) return;
    const type = showMathModal === 'inline' ? 'mathInline' : 'mathBlock';
    editor.chain().focus().insertContent({ type, attrs: { latex } }).run();
  }, [editor, showMathModal]);

  const insertCallout = (variant: 'info' | 'warn' | 'example' | 'hint' = 'info') => {
    if (!editor || readOnly) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'callout',
        attrs: { variant },
        content: [{ type: 'text', text: 'Callout text' }],
      })
      .run();
  };

  const insertCitation = () => {
    if (!editor || readOnly) return;
    setShowCitationModal(true);
  };

  const handleCitationInsert = useCallback((data: { author: string; title: string; year: number | null; url: string; citationType: string }) => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'citation', attrs: data }).run();
  }, [editor]);

  const insertFootnote = () => {
    if (!editor || readOnly) return;
    setShowFootnoteModal(true);
  };

  const handleFootnoteInsert = useCallback((key: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'footnote',
        attrs: { key: key || null },
        content: [{ type: 'text', text: 'Footnote text' }],
      })
      .run();
  }, [editor]);

  const insertNumberedParagraph = () => {
    if (!editor || readOnly) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'numberedParagraph',
        content: [{ type: 'text', text: 'Numbered paragraph text' }],
      })
      .run();
  };

  const insertTestCase = () => {
    if (!editor || readOnly) return;
    setShowTestCaseModal(true);
  };

  const handleTestCaseInsert = useCallback((data: { input: string; output: string; visibility: string; score: number }) => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'testCase', attrs: data }).run();
  }, [editor]);

  const insertEmbed = (provider: 'youtube' | 'pdf') => {
    if (!editor || readOnly) return;
    setShowEmbedModal(provider);
  };

  const handleEmbedInsert = useCallback((data: { provider: 'youtube' | 'pdf'; url: string; title: string }) => {
    if (!editor) return;
    const safeEmbed = resolveSafeEmbed(data.provider, data.url);
    if (!safeEmbed) {
      window.alert(
        data.provider === 'youtube'
          ? 'Only allowlisted YouTube URLs are supported.'
          : 'PDF embeds are restricted to allowlisted domains and .pdf URLs.'
      );
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'embed',
        attrs: {
          provider: data.provider,
          url: safeEmbed.sourceUrl,
          embedUrl: safeEmbed.embedUrl,
          title: data.title,
        },
      })
      .run();
  }, [editor]);

  const insertMermaid = () => {
    if (!editor || readOnly) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mermaid',
        attrs: {
          code: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[Done]',
        },
      })
      .run();
  };

  const duplicateCurrentBlock = () => {
    if (!editor || readOnly) {
      return;
    }

    const current = editor.getJSON();
    const blocks: JSONContent[] = Array.isArray(current.content)
      ? [...(current.content as JSONContent[])]
      : [];
    if (blocks.length === 0) {
      return;
    }

    const cursor = editor.state.selection.from;
    let selectedIndex = -1;
    editor.state.doc.forEach((node, offset, index) => {
      const start = offset + 1;
      const end = start + node.nodeSize - 1;
      if (cursor >= start && cursor <= end) {
        selectedIndex = index;
      }
    });

    if (selectedIndex < 0 || selectedIndex >= blocks.length) {
      return;
    }

    const clone = JSON.parse(JSON.stringify(blocks[selectedIndex])) as JSONContent;
    blocks.splice(selectedIndex + 1, 0, clone);
    editor.commands.setContent({ type: 'doc', content: blocks }, { emitUpdate: true });
    editor.commands.focus();
  };

  const triggerImageUpload = () => {
    if (readOnly) {
      return;
    }
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || readOnly) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (onUploadMedia) {
      setIsUploading(true);
      try {
        const uploaded = await onUploadMedia(file);
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'image',
            attrs: {
              src: uploaded.url,
              alt: file.name,
              caption: '',
              alignment: 'center',
            },
          })
          .run();
        return;
      } catch (error) {
        console.error('Image upload failed', error);
      } finally {
        setIsUploading(false);
      }
    }

    const fallbackUrl = window.prompt('Image URL', 'https://');
    if (!fallbackUrl || !fallbackUrl.trim()) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: fallbackUrl.trim(),
          alt: file.name,
          caption: '',
          alignment: 'center',
        },
      })
      .run();
  };

  const insertCodeBlock = () => {
    if (!editor || readOnly) return;
    setShowCodeBlockModal(true);
  };

  const handleCodeBlockInsert = useCallback((language: string) => {
    if (!editor) return;
    editor.chain().focus().setNode('codeBlock', { language }).run();
  }, [editor]);

  const slashCommands = useMemo<SlashCommand[]>(() => {
    if (!editor || readOnly) {
      return [];
    }

    const baseCommands: SlashCommand[] = [
      {
        key: 'paragraph',
        label: 'Paragraph',
        keywords: ['text', 'p'],
        execute: () => editor.chain().focus().setParagraph().run(),
      },
      {
        key: 'heading1',
        label: 'Heading 1',
        keywords: ['h1', 'title'],
        execute: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        key: 'heading2',
        label: 'Heading 2',
        keywords: ['h2', 'subtitle'],
        execute: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        key: 'heading3',
        label: 'Heading 3',
        keywords: ['h3'],
        execute: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        key: 'bulletList',
        label: 'Bulleted List',
        keywords: ['list', 'bullet'],
        execute: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        key: 'orderedList',
        label: 'Numbered List',
        keywords: ['list', 'ordered'],
        execute: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        key: 'taskList',
        label: 'Checklist',
        keywords: ['task', 'todo'],
        execute: () => editor.chain().focus().toggleTaskList().run(),
      },
      {
        key: 'quote',
        label: 'Quote',
        keywords: ['blockquote'],
        execute: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        key: 'codeBlock',
        label: 'Code Block',
        keywords: ['code', 'snippet'],
        execute: insertCodeBlock,
      },
      {
        key: 'mathInline',
        label: 'Inline Math',
        keywords: ['latex', 'math'],
        execute: insertInlineMath,
      },
      {
        key: 'mathBlock',
        label: 'Math Block',
        keywords: ['latex', 'equation'],
        execute: insertMathBlock,
      },
      {
        key: 'table',
        label: 'Table 3x3',
        keywords: ['table'],
        execute: () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        key: 'image',
        label: 'Image',
        keywords: ['media', 'upload'],
        execute: triggerImageUpload,
      },
    ];

    if (mode === 'lite') {
      return baseCommands;
    }

    return [
      ...baseCommands,
      {
        key: 'calloutInfo',
        label: 'Callout (Info)',
        keywords: ['callout', 'info'],
        execute: () => insertCallout('info'),
      },
      {
        key: 'calloutWarn',
        label: 'Callout (Warn)',
        keywords: ['callout', 'warn'],
        execute: () => insertCallout('warn'),
      },
      {
        key: 'calloutExample',
        label: 'Callout (Example)',
        keywords: ['callout', 'example'],
        execute: () => insertCallout('example'),
      },
      {
        key: 'calloutHint',
        label: 'Callout (Hint)',
        keywords: ['callout', 'hint'],
        execute: () => insertCallout('hint'),
      },
      {
        key: 'citation',
        label: 'Citation',
        keywords: ['reference', 'bibliography'],
        execute: insertCitation,
      },
      {
        key: 'footnote',
        label: 'Footnote',
        keywords: ['reference', 'note'],
        execute: insertFootnote,
      },
      {
        key: 'numberedParagraph',
        label: 'Numbered Paragraph',
        keywords: ['law', 'legal', 'numbering'],
        execute: insertNumberedParagraph,
      },
      {
        key: 'testCase',
        label: 'TestCase',
        keywords: ['stem', 'programming', 'grading'],
        execute: insertTestCase,
      },
      {
        key: 'youtube',
        label: 'YouTube Embed',
        keywords: ['video', 'embed', 'youtube'],
        execute: () => insertEmbed('youtube'),
      },
      {
        key: 'pdf',
        label: 'PDF Embed',
        keywords: ['pdf', 'embed'],
        execute: () => insertEmbed('pdf'),
      },
      {
        key: 'mermaid',
        label: 'Mermaid Diagram',
        keywords: ['diagram', 'flowchart', 'mermaid'],
        execute: insertMermaid,
      },
    ];
  }, [editor, mode, readOnly]);

  const filteredSlashCommands = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) {
      return slashCommands;
    }

    return slashCommands.filter((command) => {
      const haystack = `${command.label} ${command.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [slashCommands, slashQuery]);

  const runSlashCommand = (command: SlashCommand) => {
    command.execute();
    setShowSlashCommands(false);
    setSlashQuery('');
  };

  if (!editor) {
    return <div className="p-4 border rounded-lg border-[var(--surface-border)]">Loading editor...</div>;
  }

  return (
    <div className="border rounded-lg border-[var(--surface-border)] bg-[var(--surface-elevated)]">
      {!readOnly && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(event) => {
              void handleImageUpload(event);
            }}
          />

          <div className="flex flex-wrap gap-2 p-3 border-b border-[var(--surface-border)]">
            <ToolbarButton label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} />
            <ToolbarButton label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} />
            <ToolbarButton label="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} />
            <ToolbarButton label="Inline Math" onClick={insertInlineMath} />
            <ToolbarButton label="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} />
            <ToolbarButton label="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} />
            <ToolbarButton label="Bullet" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} />
            <ToolbarButton label="Numbered" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} />
            <ToolbarButton label="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} />
            <ToolbarButton label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} />
            <ToolbarButton label="Code" onClick={insertCodeBlock} isActive={editor.isActive('codeBlock')} />
            <ToolbarButton label="Math Block" onClick={insertMathBlock} />
            <ToolbarButton
              label="Table"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            />
            <ToolbarButton label={isUploading ? 'Uploading...' : 'Image'} onClick={triggerImageUpload} disabled={isUploading} />
            <ToolbarButton label="Duplicate" onClick={duplicateCurrentBlock} />
            {mode === 'full' && (
              <>
                <ToolbarButton label="Callout" onClick={() => insertCallout('info')} />
                <ToolbarButton label="Citation" onClick={insertCitation} />
                <ToolbarButton label="Footnote" onClick={insertFootnote} />
                <ToolbarButton label="Num ¶" onClick={insertNumberedParagraph} />
                <ToolbarButton label="TestCase" onClick={insertTestCase} />
                <ToolbarButton label="YouTube" onClick={() => insertEmbed('youtube')} />
                <ToolbarButton label="PDF" onClick={() => insertEmbed('pdf')} />
                <ToolbarButton label="Mermaid" onClick={insertMermaid} />
              </>
            )}
            {editor.isActive('table') && (
              <>
                <ToolbarButton label="+ Row" onClick={() => editor.chain().focus().addRowAfter().run()} />
                <ToolbarButton label="- Row" onClick={() => editor.chain().focus().deleteRow().run()} />
                <ToolbarButton label="+ Col" onClick={() => editor.chain().focus().addColumnAfter().run()} />
                <ToolbarButton label="- Col" onClick={() => editor.chain().focus().deleteColumn().run()} />
              </>
            )}
          </div>
        </>
      )}

      {showSlashCommands && !readOnly && (
        <div className="m-3 p-3 rounded border border-[var(--surface-border)] bg-[var(--surface-muted)] space-y-2">
          <div className="text-sm font-medium">Slash commands</div>
          <input
            type="text"
            value={slashQuery}
            onChange={(event) => setSlashQuery(event.target.value)}
            placeholder="Filter commands"
            className="w-full input"
          />
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
            {filteredSlashCommands.map((command) => (
              <button
                key={command.key}
                type="button"
                className="text-left px-2 py-1 rounded hover:bg-[var(--surface-elevated)]"
                onClick={() => runSlashCommand(command)}
              >
                {command.label}
              </button>
            ))}
          </div>
          {filteredSlashCommands.length === 0 && (
            <div className="text-xs text-[var(--text-muted)]">No commands match your filter.</div>
          )}
          <button
            type="button"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => setShowSlashCommands(false)}
          >
            Close
          </button>
        </div>
      )}

      <CitationModal
        isOpen={showCitationModal}
        onClose={() => setShowCitationModal(false)}
        onInsert={handleCitationInsert}
      />

      <TestCaseModal
        isOpen={showTestCaseModal}
        onClose={() => setShowTestCaseModal(false)}
        onInsert={handleTestCaseInsert}
      />

      <MathInputModal
        isOpen={!!showMathModal}
        onClose={() => setShowMathModal(false)}
        onInsert={handleMathInsert}
        displayMode={showMathModal === 'block'}
        title={showMathModal === 'block' ? 'Insert Math Block' : 'Insert Inline Math'}
      />

      <EmbedModal
        isOpen={!!showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        onInsert={handleEmbedInsert}
        defaultProvider={showEmbedModal || 'youtube'}
      />

      <CodeBlockModal
        isOpen={showCodeBlockModal}
        onClose={() => setShowCodeBlockModal(false)}
        onInsert={handleCodeBlockInsert}
      />

      <FootnoteModal
        isOpen={showFootnoteModal}
        onClose={() => setShowFootnoteModal(false)}
        onInsert={handleFootnoteInsert}
      />

      <EditorContent editor={editor} />
    </div>
  );
};

export default BlockEditor;
