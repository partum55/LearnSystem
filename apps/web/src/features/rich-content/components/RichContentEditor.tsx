'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RichContentDocument, RichBlock, RichBlockType } from '../rich-content.types';
import { markdownToRichContent } from '../markdown-parser';
import { MermaidRenderer } from './MermaidRenderer';
import { MathRenderer } from './MathRenderer';

interface RichContentEditorProps {
  value?: RichContentDocument;
  onChange: (value: RichContentDocument) => void;
  maxBlocks?: number;
  allowedTypes?: RichBlockType[];
  placeholder?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function RichContentEditor({
  value = { version: 1, blocks: [] },
  onChange,
  maxBlocks,
  allowedTypes = ['paragraph', 'heading', 'list', 'quote', 'code', 'mermaid', 'math'],
  placeholder = 'Draft your content here...',
}: RichContentEditorProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close editor on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveBlockId(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const updateBlocks = (nextBlocks: RichBlock[]) => {
    onChange({ ...value, blocks: nextBlocks });
  };

  const addBlock = (type: RichBlockType, insertIndex?: number) => {
    if (maxBlocks && value.blocks.length >= maxBlocks) {
      return;
    }

    const newBlock: RichBlock = {
      id: generateId(),
      type,
      data: {
        text: type === 'list' ? undefined : '',
        level: type === 'heading' ? 1 : undefined,
        listType: type === 'list' ? 'bullet' : undefined,
        items: type === 'list' ? [''] : undefined,
        code: ['code', 'mermaid', 'math'].includes(type) ? '' : undefined,
        language: type === 'code' ? 'javascript' : undefined,
      },
    };

    const nextBlocks = [...value.blocks];
    if (typeof insertIndex === 'number') {
      nextBlocks.splice(insertIndex + 1, 0, newBlock);
    } else {
      nextBlocks.push(newBlock);
    }
    updateBlocks(nextBlocks);
    setActiveBlockId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    updateBlocks(value.blocks.filter((b) => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= value.blocks.length) return;

    const nextBlocks = [...value.blocks];
    const temp = nextBlocks[index];
    nextBlocks[index] = nextBlocks[nextIndex];
    nextBlocks[nextIndex] = temp;
    updateBlocks(nextBlocks);
  };

  const handleFieldChange = (id: string, field: string, fieldValue: any) => {
    updateBlocks(
      value.blocks.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            data: {
              ...b.data,
              [field]: fieldValue,
            },
          };
        }
        return b;
      })
    );
  };

  // Paste markdown listener
  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    const text = e.clipboardData.getData('text');
    if (
      text.includes('#') ||
      text.includes('```') ||
      text.includes('$$') ||
      text.includes('> ') ||
      text.includes('- ')
    ) {
      e.preventDefault();
      const parsed = markdownToRichContent(text);
      if (parsed.blocks.length > 0) {
        // Enforce maxBlocks limit during paste if configured
        let incoming = parsed.blocks;
        if (maxBlocks) {
          const limit = maxBlocks - value.blocks.length + 1;
          incoming = incoming.slice(0, Math.max(0, limit));
        }

        const nextBlocks = [...value.blocks];
        nextBlocks.splice(index, 1, ...incoming);
        updateBlocks(nextBlocks);
        setActiveBlockId(null);
      }
    }
  };

  const isLimitReached = maxBlocks ? value.blocks.length >= maxBlocks : false;

  return (
    <div ref={containerRef} className="rich-content-editor space-y-4">
      {value.blocks.length === 0 ? (
        <div className="py-8 text-center border border-dashed rounded-xl" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}>
          <p className="text-xs text-[var(--text-muted)] italic">{placeholder}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {value.blocks.map((block, idx) => {
            const isActive = activeBlockId === block.id;
            return (
              <div
                key={block.id}
                className={`relative group rounded-xl border p-4 transition-all ${
                  isActive
                    ? 'border-[var(--border-strong)] bg-[var(--bg-surface)] ring-1 ring-[var(--border-strong)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'
                }`}
              >
                {/* Block actions (top-right controls when focused or hovered) */}
                <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1.5 z-10 bg-[var(--bg-surface)] pl-2 rounded-lg py-0.5">
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-xs hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, 'down')}
                    disabled={idx === value.blocks.length - 1}
                    className="p-1 text-xs hover:bg-[var(--bg-elevated)] rounded disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBlockId(isActive ? null : block.id)}
                    className="p-1 text-xs hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] cursor-pointer"
                    title="Edit block"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="p-1 text-xs hover:bg-[var(--bg-elevated)] rounded cursor-pointer"
                    style={{ color: 'var(--fn-error)' }}
                    title="Delete Block"
                  >
                    ✕
                  </button>
                </div>

                {/* Inactive Mode: Render Beautiful Preview */}
                {!isActive && (
                  <div
                    onClick={() => setActiveBlockId(block.id)}
                    className="cursor-pointer min-h-[24px]"
                  >
                    {block.type === 'heading' && (
                      <div className="font-bold text-[var(--text-primary)]">
                        {block.data.level === 1 && <h1 className="text-xl border-b border-[var(--border-subtle)] pb-1">{block.data.text || 'Heading 1'}</h1>}
                        {block.data.level === 2 && <h2 className="text-lg">{block.data.text || 'Heading 2'}</h2>}
                        {block.data.level === 3 && <h3 className="text-base">{block.data.text || 'Heading 3'}</h3>}
                      </div>
                    )}
                    {block.type === 'paragraph' && (
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {block.data.text || <span className="text-[var(--text-faint)] italic">Empty paragraph...</span>}
                      </p>
                    )}
                    {block.type === 'quote' && (
                      <blockquote className="pl-3 py-1 my-1 border-l-4 border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] italic whitespace-pre-wrap">
                        {block.data.text || 'Quote block content...'}
                      </blockquote>
                    )}
                    {block.type === 'list' && (
                      <div className="text-sm text-[var(--text-secondary)] pl-5">
                        {block.data.listType === 'ordered' ? (
                          <ol className="list-decimal space-y-1">
                            {(block.data.items || []).map((item, i) => (
                              <li key={i}>{item || '...'}</li>
                            ))}
                          </ol>
                        ) : (
                          <ul className="list-disc space-y-1">
                            {(block.data.items || []).map((item, i) => (
                              <li key={i}>{item || '...'}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {block.type === 'code' && (
                      <div className="text-xs font-mono bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-subtle)] select-all leading-normal text-[var(--text-secondary)]">
                        <span className="text-[10px] text-[var(--text-faint)] uppercase block mb-1 font-bold">{block.data.language || 'text'}</span>
                        <pre><code>{block.data.code || 'Write code snippet here...'}</code></pre>
                      </div>
                    )}
                    {block.type === 'mermaid' && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[var(--text-faint)] uppercase font-bold">mermaid diagram</span>
                        <MermaidRenderer code={block.data.code || 'graph TD; A-->B;'} />
                      </div>
                    )}
                    {block.type === 'math' && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[var(--text-faint)] uppercase font-bold">LaTeX formula</span>
                        <MathRenderer code={block.data.code || 'E = mc^2'} block={true} />
                      </div>
                    )}
                  </div>
                )}

                {/* Active Mode: Editable specific fields */}
                {isActive && (
                  <div className="space-y-3 pt-2">
                    {block.type === 'heading' && (
                      <div className="flex gap-2 items-center">
                        <select
                          value={block.data.level || 1}
                          onChange={(e) => handleFieldChange(block.id, 'level', Number(e.target.value))}
                          className="input py-1 text-xs font-bold"
                        >
                          <option value={1}>H1</option>
                          <option value={2}>H2</option>
                          <option value={3}>H3</option>
                        </select>
                        <input
                          type="text"
                          value={block.data.text || ''}
                          onChange={(e) => handleFieldChange(block.id, 'text', e.target.value)}
                          onPaste={(e) => handlePaste(e, idx)}
                          placeholder="Heading text..."
                          className="input flex-1 font-bold text-sm"
                          autoFocus
                        />
                      </div>
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        value={block.data.text || ''}
                        onChange={(e) => handleFieldChange(block.id, 'text', e.target.value)}
                        onPaste={(e) => handlePaste(e, idx)}
                        placeholder="Type paragraph content... (Supports **bold**, *italic*, $x^2$ inline math)"
                        className="input w-full min-h-[80px] text-sm"
                        autoFocus
                      />
                    )}

                    {block.type === 'quote' && (
                      <textarea
                        value={block.data.text || ''}
                        onChange={(e) => handleFieldChange(block.id, 'text', e.target.value)}
                        onPaste={(e) => handlePaste(e, idx)}
                        placeholder="Callout/quote text..."
                        className="input w-full min-h-[60px] italic text-sm"
                        autoFocus
                      />
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-2.5 pl-3">
                        <div className="flex gap-2 mb-2 items-center">
                          <button
                            type="button"
                            onClick={() => handleFieldChange(block.id, 'listType', 'bullet')}
                            className={`btn btn-xs py-0.5 px-2 text-2xs cursor-pointer ${block.data.listType === 'bullet' ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            Bulleted
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange(block.id, 'listType', 'ordered')}
                            className={`btn btn-xs py-0.5 px-2 text-2xs cursor-pointer ${block.data.listType === 'ordered' ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            Numbered
                          </button>
                        </div>
                        {(block.data.items || ['']).map((item, itemIdx) => (
                          <div key={itemIdx} className="flex gap-2 items-center">
                            <span className="text-xs text-[var(--text-faint)] font-mono w-4">
                              {block.data.listType === 'ordered' ? `${itemIdx + 1}.` : '•'}
                            </span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const nextItems = [...(block.data.items || [])];
                                nextItems[itemIdx] = e.target.value;
                                handleFieldChange(block.id, 'items', nextItems);
                              }}
                              onPaste={(e) => handlePaste(e, idx)}
                              placeholder="List item..."
                              className="input flex-1 py-1 text-xs"
                              autoFocus={itemIdx === (block.data.items || []).length - 1 && item === ''}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextItems = (block.data.items || []).filter((_, i) => i !== itemIdx);
                                handleFieldChange(block.id, 'items', nextItems.length > 0 ? nextItems : ['']);
                              }}
                              className="text-[var(--text-faint)] hover:text-[var(--fn-error)] text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextItems = [...(block.data.items || []), ''];
                            handleFieldChange(block.id, 'items', nextItems);
                          }}
                          className="btn btn-secondary py-0.5 px-2 text-2xs cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>
                    )}

                    {block.type === 'code' && (
                      <div className="space-y-2 font-mono text-xs">
                        <div className="flex gap-2 items-center">
                          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Lang:</label>
                          <input
                            type="text"
                            value={block.data.language || 'javascript'}
                            onChange={(e) => handleFieldChange(block.id, 'language', e.target.value)}
                            placeholder="e.g. javascript, python"
                            className="input py-0.5 px-2 text-2xs w-28"
                          />
                        </div>
                        <textarea
                          value={block.data.code || ''}
                          onChange={(e) => handleFieldChange(block.id, 'code', e.target.value)}
                          placeholder="// Paste syntax highlighted code here..."
                          className="input w-full min-h-[120px] font-mono text-xs"
                          autoFocus
                        />
                      </div>
                    )}

                    {block.type === 'mermaid' && (
                      <div className="space-y-3 font-mono text-xs">
                        <textarea
                          value={block.data.code || ''}
                          onChange={(e) => handleFieldChange(block.id, 'code', e.target.value)}
                          placeholder="graph TD;&#10;  A-->B;"
                          className="input w-full min-h-[100px] font-mono text-xs"
                          autoFocus
                        />
                        {block.data.code && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-[var(--text-faint)] uppercase font-bold block">live preview</span>
                            <MermaidRenderer code={block.data.code} />
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === 'math' && (
                      <div className="space-y-3 font-mono text-xs">
                        <textarea
                          value={block.data.code || ''}
                          onChange={(e) => handleFieldChange(block.id, 'code', e.target.value)}
                          placeholder="e.g. \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}"
                          className="input w-full min-h-[80px] font-mono text-xs"
                          autoFocus
                        />
                        {block.data.code && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-[var(--text-faint)] uppercase font-bold block">formula preview</span>
                            <MathRenderer code={block.data.code} block={true} />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setActiveBlockId(null)}
                        className="btn btn-primary py-0.5 px-2.5 text-2xs font-bold cursor-pointer"
                      >
                        Done ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Block Toolbar */}
      {!isLimitReached && (
        <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] items-center">
          <span className="text-2xs font-bold uppercase tracking-wider text-[var(--text-faint)] mr-1.5">Insert:</span>
          {allowedTypes.includes('paragraph') && (
            <button
              type="button"
              onClick={() => addBlock('paragraph')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Paragraph
            </button>
          )}
          {allowedTypes.includes('heading') && (
            <button
              type="button"
              onClick={() => addBlock('heading')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Heading
            </button>
          )}
          {allowedTypes.includes('list') && (
            <button
              type="button"
              onClick={() => addBlock('list')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + List
            </button>
          )}
          {allowedTypes.includes('quote') && (
            <button
              type="button"
              onClick={() => addBlock('quote')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Quote
            </button>
          )}
          {allowedTypes.includes('code') && (
            <button
              type="button"
              onClick={() => addBlock('code')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Code
            </button>
          )}
          {allowedTypes.includes('mermaid') && (
            <button
              type="button"
              onClick={() => addBlock('mermaid')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Mermaid
            </button>
          )}
          {allowedTypes.includes('math') && (
            <button
              type="button"
              onClick={() => addBlock('math')}
              className="btn btn-secondary py-1 px-2.5 text-2xs cursor-pointer"
            >
              + Math/LaTeX
            </button>
          )}
        </div>
      )}

      {/* Constraints Indicator */}
      {maxBlocks && (
        <div className="flex justify-between items-center text-3xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          <span>Blocks limit: {value.blocks.length} / {maxBlocks}</span>
          {isLimitReached && <span style={{ color: 'var(--fn-warning)' }}>Limit reached</span>}
        </div>
      )}
    </div>
  );
}
