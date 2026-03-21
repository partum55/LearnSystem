import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { common, createLowlight } from 'lowlight';
import DOMPurify from 'dompurify';
import { CanonicalDocument, CanonicalMark, CanonicalNode } from '../../types';
import { resolveSafeEmbed, EmbedProvider } from './embedSecurity';
import { ensureMermaidInitialized } from './mermaidUtils';
import {
  clampWidgetIframeHeight,
  withWidgetAutoResize,
  WIDGET_IFRAME_DEFAULT_HEIGHT,
} from './widgetIframe';
import './block-editor.css';

const lowlight = createLowlight(common);

interface DocumentRendererProps {
  document: CanonicalDocument;
  className?: string;
}

// ── Mark rendering ──

const renderMarks = (text: string, marks?: CanonicalMark[]): React.ReactNode => {
  if (!marks || marks.length === 0) return text;

  let result: React.ReactNode = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = <strong>{result}</strong>;
        break;
      case 'italic':
        result = <em>{result}</em>;
        break;
      case 'code':
        result = <code>{result}</code>;
        break;
      case 'strike':
        result = <s>{result}</s>;
        break;
      case 'link': {
        const href = String(mark.attrs?.href || '');
        result = (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        );
        break;
      }
    }
  }
  return result;
};

// ── Inline content ──

const renderInlineContent = (nodes?: CanonicalNode[]): React.ReactNode => {
  if (!nodes || nodes.length === 0) return null;

  return nodes.map((node, i) => {
    if (node.type === 'text' && node.text !== undefined) {
      return <React.Fragment key={i}>{renderMarks(node.text, node.marks)}</React.Fragment>;
    }
    if (node.type === 'mathInline') {
      return <InlineMath key={i} latex={String(node.attrs?.latex || '')} />;
    }
    if (node.type === 'hardBreak') {
      return <br key={i} />;
    }
    return null;
  });
};

// ── KaTeX components ──

const InlineMath: React.FC<{ latex: string }> = ({ latex }) => {
  let html: string | null = null;
  try {
    html = katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch {
    html = null;
  }

  if (!html) {
    return <code>{latex}</code>;
  }

  return <span className="doc-renderer-math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
};

const BlockMath: React.FC<{ latex: string }> = ({ latex }) => {
  let html: string | null = null;
  try {
    html = katex.renderToString(latex, { displayMode: true, throwOnError: false });
  } catch {
    html = null;
  }

  if (!html) {
    return <pre><code>{latex}</code></pre>;
  }

  return <div className="doc-renderer-math-block" dangerouslySetInnerHTML={{ __html: html }} />;
};

// ── Mermaid component ──

const MermaidDiagram: React.FC<{ code: string }> = ({ code }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mermaidId = useId().replace(/:/g, '');
  const trimmedCode = code.trim();

  useEffect(() => {
    if (!trimmedCode) {
      return;
    }
    ensureMermaidInitialized();
    let disposed = false;
    mermaid
      .render(`doc-mermaid-${mermaidId}`, trimmedCode)
      .then(({ svg: rendered }) => {
        if (!disposed) {
          setSvg(rendered);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Mermaid render failed');
          setSvg('');
        }
      });
    return () => { disposed = true; };
  }, [trimmedCode, mermaidId]);

  if (!trimmedCode) {
    return <div className="doc-renderer-mermaid-error">Empty mermaid code</div>;
  }

  if (error) {
    return <div className="doc-renderer-mermaid-error">{error}</div>;
  }
  return <div className="doc-renderer-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
};

const WidgetIframe: React.FC<{ code: string; title: string; className: string }> = ({
  code,
  title,
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(WIDGET_IFRAME_DEFAULT_HEIGHT);
  const srcDoc = useMemo(() => withWidgetAutoResize(code), [code]);

  useEffect(() => {
    setHeight(WIDGET_IFRAME_DEFAULT_HEIGHT);
  }, [code]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === 'resize' &&
        typeof event.data.height === 'number'
      ) {
        setHeight(clampWidgetIframeHeight(event.data.height));
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title={title}
      className={className}
      style={{ height: `${height}px` }}
    />
  );
};

// ── Code block with syntax highlighting ──

// Simple hast-to-html serializer (avoids extra dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hastToHtml = (node: any): string => {
  if (!node) return '';
  if (node.type === 'text') return DOMPurify.sanitize(node.value || '');
  if (node.type === 'element') {
    const tag = node.tagName || 'span';
    const props = node.properties || {};
    const className = Array.isArray(props.className) ? props.className.join(' ') : (props.className || '');
    const classAttr = className ? ` class="${className}"` : '';
    const children = (node.children || []).map(hastToHtml).join('');
    return `<${tag}${classAttr}>${children}</${tag}>`;
  }
  if (node.type === 'root' && node.children) {
    return node.children.map(hastToHtml).join('');
  }
  return '';
};

const HighlightedCodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  let html: string;
  try {
    const lang = language && language !== 'plaintext' ? language : undefined;
    const tree = lang ? lowlight.highlight(lang, code) : lowlight.highlightAuto(code);
    html = hastToHtml(tree);
  } catch {
    html = DOMPurify.sanitize(code);
  }

  return (
    <pre className="doc-renderer-code-block" data-language={language || undefined}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
};

// ── Callout icons ──

const CALLOUT_ICONS: Record<string, string> = {
  info: '\u2139\uFE0F',
  warn: '\u26A0\uFE0F',
  hint: '\uD83D\uDCA1',
  example: '\uD83C\uDF93',
};

// ── Node rendering ──

const renderNode = (node: CanonicalNode, index: number): React.ReactNode => {
  const key = node.id || index;

  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{renderInlineContent(node.content)}</p>;

    case 'heading': {
      const level = Number(node.attrs?.level || 1);
      const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{renderInlineContent(node.content)}</Tag>;
    }

    case 'bulletList':
      return <ul key={key}>{renderChildren(node.content)}</ul>;

    case 'orderedList':
      return <ol key={key}>{renderChildren(node.content)}</ol>;

    case 'listItem':
      return <li key={key}>{renderChildren(node.content)}</li>;

    case 'taskList':
      return <ul key={key} className="doc-renderer-task-list">{renderChildren(node.content)}</ul>;

    case 'taskItem': {
      const checked = Boolean(node.attrs?.checked);
      return (
        <li key={key} className="doc-renderer-task-item">
          <input type="checkbox" checked={checked} disabled readOnly />
          <span>{renderChildren(node.content)}</span>
        </li>
      );
    }

    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node.content)}</blockquote>;

    case 'codeBlock': {
      const language = String(node.attrs?.language || '');
      const code = (node.content || [])
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text)
        .join('');
      return <HighlightedCodeBlock key={key} code={code} language={language} />;
    }

    case 'horizontalRule':
      return <hr key={key} />;

    case 'table':
      return (
        <div key={key} className="doc-renderer-table-wrap">
          <table>{renderChildren(node.content)}</table>
        </div>
      );

    case 'tableRow':
      return <tr key={key}>{renderChildren(node.content)}</tr>;

    case 'tableCell':
      return <td key={key}>{renderChildren(node.content)}</td>;

    case 'tableHeader':
      return <th key={key}>{renderChildren(node.content)}</th>;

    case 'image': {
      const src = String(node.attrs?.src || '');
      const alt = String(node.attrs?.alt || '');
      const caption = String(node.attrs?.caption || '');
      const alignment = String(node.attrs?.alignment || 'center');
      return (
        <figure key={key} className={`doc-renderer-image align-${alignment}`}>
          <img src={src} alt={alt} loading="lazy" />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }

    case 'mathBlock':
      return <BlockMath key={key} latex={String(node.attrs?.latex || '')} />;

    case 'mathInline':
      return <InlineMath key={key} latex={String(node.attrs?.latex || '')} />;

    case 'callout': {
      const variant = String(node.attrs?.variant || 'info');
      const icon = CALLOUT_ICONS[variant] || CALLOUT_ICONS.info;
      return (
        <div key={key} className={`doc-renderer-callout doc-renderer-callout-${variant}`}>
          <span className="doc-renderer-callout-icon">{icon}</span>
          <div>{renderInlineContent(node.content)}</div>
        </div>
      );
    }

    case 'citation': {
      const author = String(node.attrs?.author || 'Unknown');
      const title = String(node.attrs?.title || 'Untitled');
      const year = node.attrs?.year ? String(node.attrs.year) : 'n.d.';
      const url = String(node.attrs?.url || '');
      return (
        <blockquote key={key} className="doc-renderer-citation">
          <p>
            {author} ({year}). <em>{title}</em>
            {url && (
              <>
                {' — '}
                <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
              </>
            )}
          </p>
        </blockquote>
      );
    }

    case 'footnote': {
      const ordinal = node.attrs?.ordinal ? String(node.attrs.ordinal) : '';
      return (
        <aside key={key} className="doc-renderer-footnote">
          {ordinal && <span className="doc-renderer-footnote-num">{ordinal}.</span>}
          {renderInlineContent(node.content)}
        </aside>
      );
    }

    case 'mermaid':
      return <MermaidDiagram key={key} code={String(node.attrs?.code || '')} />;

    case 'embed': {
      const provider = String(node.attrs?.provider || 'youtube') as EmbedProvider;
      const rawUrl = String(node.attrs?.url || node.attrs?.embedUrl || '');
      const embedTitle = String(node.attrs?.title || '');
      const safeEmbed = resolveSafeEmbed(provider, rawUrl);

      return (
        <div key={key} className="doc-renderer-embed">
          {safeEmbed ? (
            <div className="doc-renderer-embed-frame-wrap">
              <iframe
                src={safeEmbed.embedUrl}
                title={embedTitle || `${provider} embed`}
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
            </div>
          ) : (
            <div className="doc-renderer-embed-blocked">Embed blocked by allowlist.</div>
          )}
          {rawUrl && (
            <a href={safeEmbed?.sourceUrl || rawUrl} target="_blank" rel="noopener noreferrer">
              {embedTitle || rawUrl}
            </a>
          )}
        </div>
      );
    }

    case 'testCase': {
      const input = String(node.attrs?.input || '');
      const output = String(node.attrs?.output || '');
      const visibility = String(node.attrs?.visibility || 'public');
      const score = Number(node.attrs?.score || 0);
      return (
        <div key={key} className="doc-renderer-test-case">
          <div className="doc-renderer-test-case-header">
            TestCase [{visibility}] ({score} pts)
          </div>
          <div className="doc-renderer-test-case-io">
            <div>
              <span className="doc-renderer-test-case-label">Input:</span>
              <pre>{input}</pre>
            </div>
            <div>
              <span className="doc-renderer-test-case-label">Output:</span>
              <pre>{output}</pre>
            </div>
          </div>
        </div>
      );
    }

    case 'numberedParagraph': {
      const sequence = node.attrs?.sequence ? String(node.attrs.sequence) : '';
      return (
        <p key={key} className="doc-renderer-numbered-paragraph">
          {sequence && <span className="doc-renderer-num">{sequence}.</span>}
          {renderInlineContent(node.content)}
        </p>
      );
    }

    case 'interactiveWidget': {
      const widgetCode = String(node.attrs?.code || '');
      const widgetTitle = String(node.attrs?.title || '');
      return (
        <div key={key} className="doc-renderer-interactive-widget">
          {widgetTitle && <div className="doc-renderer-widget-title">{widgetTitle}</div>}
          {widgetCode ? (
            <WidgetIframe
              code={widgetCode}
              title={widgetTitle || 'Interactive widget'}
              className="doc-renderer-widget-iframe"
            />
          ) : (
            <div className="doc-renderer-widget-empty">Interactive widget (no content)</div>
          )}
        </div>
      );
    }

    default:
      // Fallback: render children if they exist
      if (node.content) return <div key={key}>{renderChildren(node.content)}</div>;
      if (node.text) return <span key={key}>{node.text}</span>;
      return null;
  }
};

const renderChildren = (nodes?: CanonicalNode[]): React.ReactNode => {
  if (!nodes) return null;
  return nodes.map((node, i) => renderNode(node, i));
};

// ── Main component ──

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({ document, className }) => {
  if (!document.content || document.content.length === 0) return null;

  return (
    <div className={`document-renderer ${className || ''}`}>
      {document.content.map((node, i) => renderNode(node, i))}
    </div>
  );
};
