import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import { Loading } from '../../../components';
import { DocumentRenderer } from '../../../features/editor-core/DocumentRenderer';
import { parseCanonicalDocument } from '../../../features/editor-core/documentUtils';
import { RichContentRenderer } from '../../../components/common/RichContentRenderer';
import { CourseLayout } from '../../../components/CourseLayout';
import { resourcesApi } from '../../../api/courses';
import { Resource } from '../../../types';
import {
  ArrowLeftIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { resourceTypeInfo } from '../../../utils/resourceIcons';

/* ── Helpers ─────────────────────────────────── */

/** Safely coerce any value to string. Prevents React error #310. */
const s = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return ''; }
};

/** Format bytes to human-readable */
const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

/** Format date */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return s(dateStr); }
};

/** Resource type icon + label — re-exported from shared utility */
const typeInfo = resourceTypeInfo;

/* ── Small empty state sub-component ── */
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="rounded-lg p-12 flex flex-col items-center gap-3"
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
    }}
  >
    <DocumentIcon className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
      {message}
    </p>
  </div>
);

/* ── Component ───────────────────────────────── */

const ResourceView: React.FC = () => {
  const { courseId, moduleId, resourceId } = useParams<{
    courseId: string;
    moduleId: string;
    resourceId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedResourceKey, setLoadedResourceKey] = useState<string | null>(null);
  const requestKey = courseId && moduleId && resourceId ? `${courseId}:${moduleId}:${resourceId}` : null;
  const loading = requestKey !== null && loadedResourceKey !== requestKey;

  useEffect(() => {
    if (!requestKey || !courseId || !moduleId || !resourceId) return;

    let active = true;
    resourcesApi
      .getById(courseId, moduleId, resourceId)
      .then((res) => {
        if (!active) return;
        setResource(res.data);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setResource(null);
        setError('Failed to load resource');
      })
      .finally(() => {
        if (!active) return;
        setLoadedResourceKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [courseId, moduleId, requestKey, resourceId]);

  const info = useMemo(
    () => typeInfo[s(resource?.resource_type)] || typeInfo.OTHER,
    [resource?.resource_type]
  );

  /* ── Loading / Error states ── */

  if (loading) return <Loading />;

  if (error || !resource) {
    return (
      <CourseLayout courseId={courseId || ''}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <DocumentIcon className="w-12 h-12 mx-auto" style={{ color: 'var(--text-faint)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {error || 'Resource not found'}
            </p>
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="text-sm px-4 py-2 rounded-md transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              {String(t('common.back_to_course', 'Back to course'))}
            </button>
          </div>
        </div>
      </CourseLayout>
    );
  }

  /* ── Content renderer by type ── */

  const renderContent = () => {
    const rType = s(resource.resource_type);

    switch (rType) {
      /* ───── TEXT / CODE — Markdown + LaTeX + Syntax Highlighting ───── */
      case 'TEXT':
      case 'CODE': {
        const raw = s(resource.text_content);

        // Try parsing as CanonicalDocument JSON (new editor format)
        if (raw.startsWith('{') && raw.includes('"type":"doc"')) {
          try {
            const doc = parseCanonicalDocument(raw);
            if (doc.content.length > 0) {
              return (
                <article className="resource-prose">
                  <DocumentRenderer document={doc} />
                </article>
              );
            }
          } catch {
            // fall through to ReactMarkdown
          }
        }

        // Fallback: legacy plain-markdown content
        return (
          <article className="resource-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={{
                a: ({ children, href, ...rest }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                    {children}
                  </a>
                ),
                table: ({ children, ...rest }) => (
                  <div className="resource-table-wrap">
                    <table {...rest}>{children}</table>
                  </div>
                ),
              }}
            >
              {raw}
            </ReactMarkdown>
          </article>
        );
      }

      /* ───── PDF — Embedded viewer ───── */
      case 'PDF':
        return resource.file_url ? (
          <div
            className="w-full rounded-lg overflow-hidden"
            style={{
              height: 'min(800px, 75vh)',
              border: '1px solid var(--border-default)',
            }}
          >
            <iframe
              src={`${s(resource.file_url)}#toolbar=1&navpanes=0`}
              className="w-full h-full"
              title={s(resource.title)}
              style={{ background: '#525659' }}
            />
          </div>
        ) : (
          <EmptyState message="PDF file not available" />
        );

      /* ───── LINK — External link card ───── */
      case 'LINK': {
        const url = s(resource.external_url);
        let hostname = '';
        try { hostname = new URL(url).hostname; } catch { hostname = url; }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg p-6 transition-all duration-200"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: info.accent }}
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {hostname}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {url}
                </p>
              </div>
              <ArrowTopRightOnSquareIcon
                className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          </a>
        );
      }

      /* ───── VIDEO — Player ───── */
      case 'VIDEO':
        return resource.file_url ? (
          <div
            className="w-full rounded-lg overflow-hidden"
            style={{
              background: '#000',
              border: '1px solid var(--border-default)',
              aspectRatio: '16/9',
            }}
          >
            <video
              controls
              className="w-full h-full"
              src={s(resource.file_url)}
              style={{ outline: 'none' }}
            />
          </div>
        ) : (
          <EmptyState message="Video file not available" />
        );

      /* ───── SLIDE / OTHER — Download card ───── */
      default:
        return resource.file_url ? (
          <div
            className="rounded-lg p-8 flex flex-col items-center gap-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: info.accent }}
            >
              <info.icon className="w-7 h-7" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {s(resource.title)}
              </p>
              {resource.file_size && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(resource.file_size)}
                </p>
              )}
            </div>
            {resource.is_downloadable && (
              <a
                href={s(resource.file_url)}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {'Download'}
              </a>
            )}
          </div>
        ) : (
          <EmptyState message="File not available" />
        );
    }
  };

  /* ── Main layout ── */

  return (
    <CourseLayout courseId={courseId || ''}>
          <div className="max-w-3xl mx-auto">
            {/* Back navigation */}
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex items-center gap-1.5 text-xs mb-8 transition-colors group"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>{String(t('common.back_to_course', 'Back to course'))}</span>
            </button>

            {/* Resource header */}
            <header className="mb-8">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide"
                  style={{
                    background: info.accent,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <info.icon className="w-3 h-3" />
                  {info.label}
                </span>
              </div>

              {/* Title */}
              <h1
                className="text-2xl sm:text-3xl font-bold leading-tight"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: 'var(--letter-tight)',
                }}
              >
                {s(resource.title)}
              </h1>

              {/* Description */}
              {resource.description && typeof resource.description === 'string' && (
                <div className="mt-3 max-w-2xl">
                  <RichContentRenderer
                    content={resource.description}
                    className="text-[15px] leading-relaxed"
                  />
                </div>
              )}

              {/* Meta row */}
              <div
                className="flex items-center gap-4 mt-4 text-xs"
                style={{ color: 'var(--text-faint)' }}
              >
                {resource.updated_at && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDate(resource.updated_at)}
                  </span>
                )}
                {resource.file_size ? (
                  <span>{formatBytes(resource.file_size)}</span>
                ) : null}
                {resource.uploaded_by_name && typeof resource.uploaded_by_name === 'string' && (
                  <span>{resource.uploaded_by_name}</span>
                )}
              </div>
            </header>

            {/* Divider */}
            <div className="mb-8" style={{ borderTop: '1px solid var(--border-subtle)' }} />

            {/* Content */}
            {renderContent()}

            {/* Bottom download bar for downloadable resources */}
            {resource.is_downloadable && resource.file_url && resource.resource_type !== 'LINK' && (
              <div
                className="mt-8 rounded-lg px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {'Download this resource'}
                </span>
                <a
                  href={s(resource.file_url)}
                  download
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  {'Download'}
                </a>
              </div>
            )}
          </div>

      {/* Scoped prose styles for rich text content */}
      <style>{`
        .resource-prose {
          font-family: var(--font-body);
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.75;
          overflow-wrap: break-word;
        }
        .resource-prose h1 {
          font-family: var(--font-display);
          color: var(--text-primary);
          font-size: 1.75em;
          font-weight: 700;
          margin: 2em 0 0.6em;
          letter-spacing: var(--letter-tight);
          line-height: 1.3;
        }
        .resource-prose h2 {
          font-family: var(--font-display);
          color: var(--text-primary);
          font-size: 1.35em;
          font-weight: 600;
          margin: 1.8em 0 0.5em;
          letter-spacing: var(--letter-tight);
          line-height: 1.35;
        }
        .resource-prose h3 {
          font-family: var(--font-display);
          color: var(--text-primary);
          font-size: 1.15em;
          font-weight: 600;
          margin: 1.5em 0 0.4em;
        }
        .resource-prose p {
          margin: 0.75em 0;
        }
        .resource-prose a {
          color: var(--text-primary);
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: var(--text-faint);
          transition: text-decoration-color 150ms;
        }
        .resource-prose a:hover {
          text-decoration-color: var(--text-primary);
        }
        .resource-prose strong {
          color: var(--text-primary);
          font-weight: 600;
        }
        .resource-prose em {
          font-style: italic;
        }
        .resource-prose ul, .resource-prose ol {
          margin: 0.75em 0;
          padding-left: 1.5em;
        }
        .resource-prose li {
          margin: 0.3em 0;
        }
        .resource-prose li::marker {
          color: var(--text-faint);
        }
        .resource-prose blockquote {
          margin: 1em 0;
          padding: 0.5em 1em;
          border-left: 3px solid var(--border-strong);
          background: var(--bg-surface);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          color: var(--text-muted);
          font-style: italic;
        }
        .resource-prose hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 2em 0;
        }
        .resource-prose img {
          max-width: 100%;
          border-radius: var(--radius-md);
          margin: 1em 0;
        }
        .resource-table-wrap {
          width: 100%;
          overflow-x: auto;
          margin: 1.25em 0;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
        }
        .resource-prose table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
          margin: 0;
        }
        .resource-prose th, .resource-prose td {
          padding: 0.6em 1em;
          text-align: left;
          border-bottom: 1px solid var(--border-subtle);
        }
        .resource-prose th {
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.8em;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          border-bottom: 1px solid var(--border-default);
        }
        .resource-prose td {
          color: var(--text-secondary);
        }
        .resource-prose tr:last-child td {
          border-bottom: none;
        }
        .resource-prose tbody tr:hover {
          background: var(--bg-surface);
        }
        /* ── Code blocks ── */
        .resource-prose code {
          font-family: var(--font-mono);
          font-size: 0.85em;
        }
        .resource-prose :not(pre) > code {
          background: var(--bg-overlay);
          padding: 0.15em 0.35em;
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
        }
        .resource-prose pre {
          margin: 1.25em 0;
          padding: 1em 1.25em;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          overflow-x: auto;
          line-height: 1.6;
        }
        .resource-prose pre code {
          background: none;
          padding: 0;
          border: none;
          color: var(--text-secondary);
          font-size: 0.85em;
        }
        /* ── KaTeX overrides for dark mode ── */
        .resource-prose .katex {
          color: var(--text-primary);
          font-size: 1.05em;
        }
        .resource-prose .katex-display {
          margin: 1.25em 0;
          padding: 1em;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow-x: auto;
        }
        /* ── highlight.js theme (dark) ── */
        .resource-prose .hljs-keyword,
        .resource-prose .hljs-selector-tag { color: #c678dd; }
        .resource-prose .hljs-string,
        .resource-prose .hljs-attr { color: #98c379; }
        .resource-prose .hljs-number,
        .resource-prose .hljs-literal { color: #d19a66; }
        .resource-prose .hljs-comment { color: #5c6370; font-style: italic; }
        .resource-prose .hljs-built_in { color: #e5c07b; }
        .resource-prose .hljs-function,
        .resource-prose .hljs-title { color: #61afef; }
        .resource-prose .hljs-type { color: #e5c07b; }
        .resource-prose .hljs-meta { color: #56b6c2; }
        .resource-prose .hljs-variable { color: #e06c75; }
      `}</style>
    </CourseLayout>
  );
};

export default ResourceView;
