'use client';

import React from 'react';
import { RichContentDocument } from '../rich-content.types';
import { MermaidRenderer } from './MermaidRenderer';
import { MathRenderer } from './MathRenderer';
import { markdownToRichContent } from '../markdown-parser';

interface RichContentRendererProps {
  document?: RichContentDocument | string | null;
}

function parseInlineElements(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by $ for inline math equations
  const parts = text.split('$');
  const rendered: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      // Inline math formula
      rendered.push(<MathRenderer key={`math-${index}`} code={part} block={false} />);
    } else {
      // Normal text with potential bold/italic formatting
      const boldParts = part.split('**');
      boldParts.forEach((bp, bIndex) => {
        if (bIndex % 2 === 1) {
          rendered.push(<strong key={`b-${index}-${bIndex}`}>{bp}</strong>);
        } else {
          const italicParts = bp.split('*');
          italicParts.forEach((ip, iIndex) => {
            if (iIndex % 2 === 1) {
              rendered.push(<em key={`em-${index}-${bIndex}-${iIndex}`}>{ip}</em>);
            } else {
              rendered.push(ip);
            }
          });
        }
      });
    }
  });

  return rendered;
}

export function RichContentRenderer({ document }: RichContentRendererProps) {
  let parsedDoc: RichContentDocument | null = null;
  if (typeof document === 'string') {
    try {
      parsedDoc = JSON.parse(document) as RichContentDocument;
    } catch {
      parsedDoc = markdownToRichContent(document);
    }
  } else if (document && typeof document === 'object') {
    parsedDoc = document as RichContentDocument;
  }

  if (!parsedDoc || !parsedDoc.blocks || parsedDoc.blocks.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-[var(--text-faint)] italic">
        No content loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)] text-sm leading-relaxed max-w-none">
      {parsedDoc.blocks.map((block) => {
        const id = block.id;
        switch (block.type) {
          case 'heading': {
            const level = block.data.level || 1;
            const text = block.data.text || '';
            const headingClass = "font-bold text-[var(--text-primary)] mt-6 mb-2 tracking-tight";
            if (level === 1) return <h1 key={id} className={`${headingClass} text-2xl border-b border-[var(--border-subtle)] pb-1.5`}>{text}</h1>;
            if (level === 2) return <h2 key={id} className={`${headingClass} text-xl`}>{text}</h2>;
            if (level === 3) return <h3 key={id} className={`${headingClass} text-lg`}>{text}</h3>;
            return <h4 key={id} className={`${headingClass} text-base`}>{text}</h4>;
          }

          case 'paragraph': {
            const text = block.data.text || '';
            return (
              <p key={id} className="mb-4 text-[var(--text-secondary)] leading-relaxed">
                {parseInlineElements(text)}
              </p>
            );
          }

          case 'quote': {
            const text = block.data.text || '';
            return (
              <blockquote
                key={id}
                className="pl-4 py-2 my-4 border-l-4 rounded-r-lg bg-[var(--bg-elevated)] border-[var(--text-faint)] italic text-[var(--text-secondary)]"
              >
                {parseInlineElements(text)}
              </blockquote>
            );
          }

          case 'list': {
            const items = block.data.items || [];
            const listType = block.data.listType || 'bullet';
            const listClass = "pl-6 mb-4 space-y-1.5 list-outside text-[var(--text-secondary)]";
            if (listType === 'ordered') {
              return (
                <ol key={id} className={`${listClass} list-decimal`}>
                  {items.map((item, idx) => (
                    <li key={idx}>{parseInlineElements(item)}</li>
                  ))}
                </ol>
              );
            } else {
              return (
                <ul key={id} className={`${listClass} list-disc`}>
                  {items.map((item, idx) => (
                    <li key={idx}>{parseInlineElements(item)}</li>
                  ))}
                </ul>
              );
            }
          }

          case 'code': {
            const code = block.data.code || '';
            const language = block.data.language || 'text';
            return (
              <div key={id} className="relative group rounded-xl overflow-hidden border border-[var(--border-subtle)] my-4">
                <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <span>{language}</span>
                </div>
                <pre className="p-4 overflow-x-auto bg-[var(--bg-base)] text-xs font-mono leading-normal text-[var(--text-secondary)] select-all">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          case 'mermaid': {
            const code = block.data.code || '';
            return <MermaidRenderer key={id} code={code} />;
          }

          case 'math': {
            const code = block.data.code || '';
            return <MathRenderer key={id} code={code} block={true} />;
          }

          case 'video': {
            const url = block.data.url || '';
            if (!url) return null;
            let embedSrc = url;
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              const vid = url.includes('v=')
                ? url.split('v=')[1]?.split('&')[0]
                : url.split('/').pop()?.split('?')[0];
              embedSrc = `https://www.youtube.com/embed/${vid}`;
            } else if (url.includes('vimeo.com')) {
              embedSrc = `https://player.vimeo.com/video/${url.split('/').pop()?.split('?')[0]}`;
            }
            return (
              <div key={id} className="my-4 rounded-xl overflow-hidden border border-[var(--border-default)]" style={{ aspectRatio: '16/9' }}>
                <iframe src={embedSrc} className="w-full h-full border-none" allowFullScreen title="Video" />
              </div>
            );
          }

          case 'file': {
            const url = block.data.url || '';
            const filename = block.data.filename || url || 'File';
            if (!url) return null;
            return (
              <a
                key={id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 my-3 px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] transition-colors no-underline"
              >
                <span className="text-lg flex-shrink-0">↓</span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">{filename}</span>
                <span className="text-xs text-[var(--text-faint)] flex-shrink-0">Open →</span>
              </a>
            );
          }

          case 'table': {
            const rows = block.data.rows;
            if (!rows || rows.length === 0) return null;
            const [headerRow, ...bodyRows] = rows;
            return (
              <div key={id} className="my-4 overflow-x-auto rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                      {(headerRow || []).map((cell, ci) => (
                        <th
                          key={ci}
                          className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"
                          style={{ borderRight: ci < headerRow.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                        >{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-[var(--border-subtle)] last:border-0"
                        style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}
                      >
                        {(row || []).map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-[var(--text-secondary)]"
                            style={{ borderRight: ci < row.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                          >{parseInlineElements(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
