import React, { useEffect, useId, useRef, useState } from 'react';
import {
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { EmbedProvider, resolveSafeEmbed } from '../embedSecurity';
import { ensureMermaidInitialized } from '../mermaidUtils';

// Re-export InteractiveWidgetNode from its own file
export { InteractiveWidgetNode } from './InteractiveWidgetNode';

// ── Callout ──

export const CalloutNode = Node.create({
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

// ── Citation ──

export const CitationNode = Node.create({
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

// ── Footnote ──

export const FootnoteNode = Node.create({
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

// ── Numbered Paragraph ──

export const NumberedParagraphNode = Node.create({
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

// ── Test Case ──

export const TestCaseNode = Node.create({
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

// ── Embed ──

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

export const EmbedNode = Node.create({
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

// ── Image ──

export const ImageNode = Node.create({
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

// ── Mermaid ──

const MermaidBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(node.attrs.code || ''));
  const [diagramSvg, setDiagramSvg] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const mermaidId = useId().replace(/:/g, '');
  const isEditable = editor.isEditable;
  const code = String(node.attrs.code || '').trim();

  useEffect(() => {
    if (!code) {
      return;
    }

    ensureMermaidInitialized();
    let disposed = false;
    mermaid
      .render(`mermaid-${mermaidId}`, code)
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
  }, [code, mermaidId]);

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
          setDraft(String(node.attrs.code || ''));
          setEditing(true);
        }
      }}
    >
      {renderError ? (
        <div className="editor-mermaid-error">Mermaid render error: {renderError}</div>
      ) : !code ? (
        <div className="editor-mermaid-error">Mermaid code is empty.</div>
      ) : (
        <div className="editor-mermaid-svg" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
      )}
      {isEditable && (
        <button
          type="button"
          className="btn btn-ghost btn-xs mt-2"
          onClick={() => {
            setDraft(String(node.attrs.code || ''));
            setEditing(true);
          }}
        >
          Edit Mermaid
        </button>
      )}
    </NodeViewWrapper>
  );
};

export const MermaidNode = Node.create({
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

// ── KaTeX helpers ──

const renderKatex = (latex: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false });
  } catch {
    return `<span style="color:var(--fn-error)">${DOMPurify.sanitize(latex)}</span>`;
  }
};

// ── Math Block ──

const MathBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const currentLatex = String(node.attrs.latex || '');
  const [draft, setDraft] = useState(currentLatex);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditable = editor.isEditable;

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
      onClick={() => {
        if (isEditable) {
          setDraft(currentLatex);
          setEditing(true);
        }
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
};

export const MathBlockNode = Node.create({
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

// ── Math Inline ──

const MathInlineView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const [editing, setEditing] = useState(false);
  const currentLatex = String(node.attrs.latex || '');
  const [draft, setDraft] = useState(currentLatex);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditable = editor.isEditable;

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
      onClick={() => {
        if (isEditable) {
          setDraft(currentLatex);
          setEditing(true);
        }
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
};

export const MathInlineNode = Node.create({
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
