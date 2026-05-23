'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from 'react';
import type { RichContentDocument, RichBlock, RichBlockType } from '../rich-content.types';
import { markdownToRichContent } from '../markdown-parser';
import { MermaidRenderer } from './MermaidRenderer';
import { MathRenderer } from './MathRenderer';

const generateId = () => Math.random().toString(36).substring(2, 9);

// ─── Slash command groups ─────────────────────────────────────────────────────

interface SlashItem {
  type: RichBlockType;
  label: string;
  icon: string;
  level?: number;
  listType?: 'bullet' | 'ordered';
}

const SLASH_GROUPS: Array<{ label: string; items: SlashItem[] }> = [
  {
    label: 'Text',
    items: [
      { type: 'paragraph', label: 'Text',      icon: 'T'   },
      { type: 'heading',   label: 'Heading 1', icon: 'H1', level: 1 },
      { type: 'heading',   label: 'Heading 2', icon: 'H2', level: 2 },
      { type: 'heading',   label: 'Heading 3', icon: 'H3', level: 3 },
    ],
  },
  {
    label: 'Lists',
    items: [
      { type: 'list',  label: 'Bullet List',   icon: '•',  listType: 'bullet'  },
      { type: 'list',  label: 'Numbered List', icon: '1.', listType: 'ordered' },
      { type: 'quote', label: 'Quote',         icon: '"'                        },
    ],
  },
  {
    label: 'Code & Science',
    items: [
      { type: 'code',    label: 'Code Block', icon: '</>' },
      { type: 'math',    label: 'Math',       icon: '∑'   },
      { type: 'mermaid', label: 'Diagram',    icon: '⬡'   },
    ],
  },
  {
    label: 'Media',
    items: [
      { type: 'video', label: 'Video', icon: '▶' },
      { type: 'file',  label: 'File',  icon: '↓' },
    ],
  },
  {
    label: 'Data',
    items: [
      { type: 'table', label: 'Table', icon: '⊞' },
    ],
  },
];

const ALL_SLASH_ITEMS: SlashItem[] = SLASH_GROUPS.flatMap((g) => g.items);

// ─── Editor props ─────────────────────────────────────────────────────────────

interface RichContentEditorProps {
  value?: RichContentDocument;
  onChange: (value: RichContentDocument) => void;
  maxBlocks?: number;
  allowedTypes?: RichBlockType[];
  placeholder?: string;
  className?: string;
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export function RichContentEditor({
  value = { version: 1, blocks: [] },
  onChange,
  maxBlocks,
  allowedTypes = ['paragraph', 'heading', 'list', 'quote', 'code', 'mermaid', 'math', 'video', 'file', 'table'],
  placeholder = 'Start writing… or type / to insert a block',
  className = '',
}: RichContentEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string } | null>(null);
  const [slashMenuFlatIndex, setSlashMenuFlatIndex] = useState(0);
  // Selection toolbar (B/I)
  const [selectionBlockId, setSelectionBlockId] = useState<string | null>(null);

  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  // Map blockId → primary input element (textarea / input[type=text])
  const inputRefs = useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute slash menu filtered list
  const filteredSlashItems: SlashItem[] = slashMenu
    ? ALL_SLASH_ITEMS.filter(
        (item) =>
          allowedTypes.includes(item.type) &&
          (slashMenu.query === '' ||
            item.label.toLowerCase().includes(slashMenu.query.toLowerCase()) ||
            item.type.includes(slashMenu.query.toLowerCase()))
      )
    : [];

  // When filtered list changes, clamp flat index
  useEffect(() => {
    setSlashMenuFlatIndex((i) => Math.min(i, Math.max(filteredSlashItems.length - 1, 0)));
  }, [filteredSlashItems.length]);

  // ── Core block operations ──────────────────────────────────────────────────

  const updateBlocks = useCallback(
    (next: RichBlock[]) => onChange({ ...value, blocks: next }),
    [value, onChange]
  );

  const updateBlockData = useCallback(
    (id: string, data: Partial<RichBlock['data']>) =>
      updateBlocks(value.blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b))),
    [value.blocks, updateBlocks]
  );

  const focusBlock = useCallback((id: string, atEnd = false) => {
    setTimeout(() => {
      const el = inputRefs.current.get(id);
      if (el) {
        el.focus();
        if (atEnd && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === 'text'))) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }
    }, 20);
  }, []);

  const deleteBlock = useCallback(
    (id: string) => {
      const idx = value.blocks.findIndex((b) => b.id === id);
      updateBlocks(value.blocks.filter((b) => b.id !== id));
      if (idx > 0) focusBlock(value.blocks[idx - 1].id, true);
    },
    [value.blocks, updateBlocks, focusBlock]
  );

  const insertBlock = useCallback(
    (afterId: string | null, type: RichBlockType, extra?: Partial<RichBlock['data']>): string | null => {
      if (maxBlocks && value.blocks.length >= maxBlocks) return null;
      const newBlock: RichBlock = {
        id: generateId(),
        type,
        data: {
          text: ['paragraph', 'heading', 'quote'].includes(type) ? '' : undefined,
          level: type === 'heading' ? 1 : undefined,
          listType: type === 'list' ? 'bullet' : undefined,
          items: type === 'list' ? [''] : undefined,
          code: ['code', 'mermaid', 'math'].includes(type) ? '' : undefined,
          language: type === 'code' ? 'javascript' : undefined,
          url: ['video', 'file'].includes(type) ? '' : undefined,
          filename: type === 'file' ? '' : undefined,
          rows: type === 'table'
            ? [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]
            : undefined,
          ...extra,
        },
      };
      const next = [...value.blocks];
      if (afterId === null) {
        next.push(newBlock);
      } else {
        const idx = next.findIndex((b) => b.id === afterId);
        next.splice(idx + 1, 0, newBlock);
      }
      updateBlocks(next);
      focusBlock(newBlock.id, false);
      return newBlock.id;
    },
    [value.blocks, maxBlocks, updateBlocks, focusBlock]
  );

  const moveBlock = useCallback(
    (id: string, dir: 'up' | 'down') => {
      const idx = value.blocks.findIndex((b) => b.id === id);
      const to = dir === 'up' ? idx - 1 : idx + 1;
      if (to < 0 || to >= value.blocks.length) return;
      const next = [...value.blocks];
      [next[idx], next[to]] = [next[to], next[idx]];
      updateBlocks(next);
    },
    [value.blocks, updateBlocks]
  );

  // ── Slash command apply ────────────────────────────────────────────────────

  const applySlashItem = useCallback(
    (item: SlashItem, blockId: string) => {
      setSlashMenu(null);
      const idx = value.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const extra: Partial<RichBlock['data']> = {};
      if (item.type === 'heading') extra.level = item.level ?? 1;
      if (item.type === 'list') { extra.listType = item.listType ?? 'bullet'; extra.items = ['']; }
      if (['code', 'mermaid', 'math'].includes(item.type)) {
        extra.code = '';
        if (item.type === 'code') extra.language = 'javascript';
      }
      if (['video', 'file'].includes(item.type)) extra.url = '';
      if (item.type === 'file') extra.filename = '';
      if (item.type === 'table') extra.rows = [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']];

      const updated: RichBlock = {
        ...value.blocks[idx],
        type: item.type,
        data: {
          text: ['paragraph', 'heading', 'quote'].includes(item.type) ? '' : undefined,
          ...extra,
        },
      };
      const next = [...value.blocks];
      next[idx] = updated;
      updateBlocks(next);
      focusBlock(blockId, false);
    },
    [value.blocks, updateBlocks, focusBlock]
  );

  // ── Inline formatting (bold / italic) ─────────────────────────────────────

  const wrapSelection = useCallback(
    (blockId: string, prefix: string, suffix: string) => {
      const el = inputRefs.current.get(blockId);
      if (!el) return;
      const block = value.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const text = block.data.text ?? '';
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const newText = text.slice(0, start) + prefix + text.slice(start, end) + suffix + text.slice(end);
      updateBlockData(blockId, { text: newText });
      setTimeout(() => {
        const fresh = inputRefs.current.get(blockId);
        if (fresh) fresh.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    },
    [value.blocks, updateBlockData]
  );

  // ── Text change + slash detection ─────────────────────────────────────────

  const handleTextChange = useCallback(
    (blockId: string, text: string) => {
      if (text === '/') {
        setSlashMenu({ blockId, query: '' });
        setSlashMenuFlatIndex(0);
      } else if (text.startsWith('/') && slashMenu?.blockId === blockId) {
        setSlashMenu({ blockId, query: text.slice(1) });
        setSlashMenuFlatIndex(0);
      } else if (slashMenu?.blockId === blockId) {
        setSlashMenu(null);
      }
      updateBlockData(blockId, { text });
    },
    [slashMenu, updateBlockData]
  );

  // ── Shared keyboard handler ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, block: RichBlock) => {
      const idx = value.blocks.findIndex((b) => b.id === block.id);

      // Inline formatting shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === 'b' && ['paragraph', 'heading', 'quote'].includes(block.type)) {
          e.preventDefault();
          wrapSelection(block.id, '**', '**');
          return;
        }
        if (e.key === 'i' && ['paragraph', 'heading', 'quote'].includes(block.type)) {
          e.preventDefault();
          wrapSelection(block.id, '_', '_');
          return;
        }
      }

      // Slash menu navigation
      if (slashMenu?.blockId === block.id && filteredSlashItems.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSlashMenuFlatIndex((i) => Math.min(i + 1, filteredSlashItems.length - 1)); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashMenuFlatIndex((i) => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter')     { e.preventDefault(); applySlashItem(filteredSlashItems[slashMenuFlatIndex], block.id); return; }
        if (e.key === 'Escape')    { setSlashMenu(null); return; }
      }

      // Enter → split / new paragraph (skip for code/mermaid/math)
      if (e.key === 'Enter' && !e.shiftKey && !['code', 'mermaid', 'math', 'video', 'file', 'table'].includes(block.type)) {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement | HTMLInputElement;
        const pos = target.selectionStart ?? 0;
        const before = (block.data.text ?? '').slice(0, pos);
        const after  = (block.data.text ?? '').slice(pos);
        updateBlockData(block.id, { text: before });
        insertBlock(block.id, 'paragraph', { text: after });
        return;
      }

      // Backspace on empty → delete block
      if (e.key === 'Backspace' && value.blocks.length > 1) {
        const isEmpty =
          (!block.data.text || block.data.text === '') &&
          (!block.data.code || block.data.code === '') &&
          (!block.data.url  || block.data.url  === '') &&
          (!block.data.items || block.data.items.every((i) => i === ''));
        if (isEmpty) { e.preventDefault(); deleteBlock(block.id); return; }
      }

      // Arrow up/down to navigate blocks
      if (e.key === 'ArrowUp' && idx > 0) {
        const target = e.target as HTMLTextAreaElement;
        if ((target.selectionStart ?? 0) === 0) {
          e.preventDefault(); focusBlock(value.blocks[idx - 1].id, true);
        }
      }
      if (e.key === 'ArrowDown' && idx < value.blocks.length - 1) {
        const target = e.target as HTMLTextAreaElement;
        if ((target.selectionStart ?? 0) === target.value.length) {
          e.preventDefault(); focusBlock(value.blocks[idx + 1].id, false);
        }
      }
    },
    [value.blocks, slashMenu, filteredSlashItems, slashMenuFlatIndex,
     applySlashItem, wrapSelection, updateBlockData, insertBlock, deleteBlock, focusBlock]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent, blockId: string) => {
      const text = e.clipboardData.getData('text');
      const looksLikeMarkdown =
        text.includes('#') || text.includes('```') || text.includes('$$') ||
        text.includes('> ') || (text.includes('- ') && text.includes('\n'));
      if (looksLikeMarkdown) {
        e.preventDefault();
        const parsed = markdownToRichContent(text);
        if (parsed.blocks.length > 0) {
          const idx = value.blocks.findIndex((b) => b.id === blockId);
          let incoming = parsed.blocks;
          if (maxBlocks) incoming = incoming.slice(0, Math.max(0, maxBlocks - value.blocks.length + 1));
          const next = [...value.blocks];
          next.splice(idx, 1, ...incoming);
          updateBlocks(next);
        }
      }
    },
    [value.blocks, maxBlocks, updateBlocks]
  );

  // Close slash menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSlashMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isLimitReached = maxBlocks ? value.blocks.length >= maxBlocks : false;
  const lastBlockId = value.blocks[value.blocks.length - 1]?.id ?? null;

  if (value.blocks.length === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ cursor: 'text', padding: '4px 0', minHeight: '48px' }}
        onClick={() => !isLimitReached && insertBlock(null, 'paragraph')}
      >
        <p style={{ color: 'var(--text-faint)', fontSize: '0.9375rem', lineHeight: 1.75, fontFamily: 'var(--font-body)', userSelect: 'none' }}>
          {placeholder}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ paddingLeft: '36px', paddingRight: '28px', position: 'relative' }}
    >
      {value.blocks.map((block, idx) => {
        const isHovered  = hoveredBlockId === block.id;
        const isFocused  = focusedBlockId === block.id;
        const hasSelection = selectionBlockId === block.id;
        const isTextBlock = ['paragraph', 'heading', 'quote'].includes(block.type);

        return (
          <div
            key={block.id}
            data-block-id={block.id}
            ref={(el) => { if (el) blockRefs.current.set(block.id, el); else blockRefs.current.delete(block.id); }}
            style={{ position: 'relative', margin: block.type === 'heading' ? '18px 0 4px' : '3px 0' }}
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
          >
            {/* ── Left handle ─────────────────────────────────── */}
            <div style={{
              position: 'absolute', left: '-32px', top: '4px',
              display: 'flex', flexDirection: 'column', gap: '1px',
              opacity: isHovered ? 1 : 0, transition: 'opacity 120ms',
              pointerEvents: isHovered ? 'auto' : 'none',
            }}>
              <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} title="Move up"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '1px 3px', fontSize: '9px', opacity: idx === 0 ? 0.2 : 0.7, lineHeight: 1 }}>▲</button>
              <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={idx === value.blocks.length - 1} title="Move down"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: '1px 3px', fontSize: '9px', opacity: idx === value.blocks.length - 1 ? 0.2 : 0.7, lineHeight: 1 }}>▼</button>
            </div>

            {/* ── Selection toolbar (B/I) ──────────────────────── */}
            {hasSelection && isTextBlock && (
              <div style={{
                position: 'absolute', top: '-32px', left: 0, zIndex: 20,
                display: 'flex', alignItems: 'center',
                background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                borderRadius: '99px', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              }}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); wrapSelection(block.id, '**', '**'); }}
                  style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', borderRight: '1px solid var(--border-subtle)' }}
                  title="Bold (⌘B)"
                >B</button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); wrapSelection(block.id, '_', '_'); }}
                  style={{ padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-primary)' }}
                  title="Italic (⌘I)"
                >I</button>
              </div>
            )}

            {/* ── Block content ────────────────────────────────── */}
            <BlockEditor
              block={block}
              isFocused={isFocused}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={() => { setFocusedBlockId(null); setSelectionBlockId(null); }}
              onSelect={(blockId, hasSelection) => setSelectionBlockId(hasSelection ? blockId : null)}
              onTextChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onUpdateData={updateBlockData}
              registerInput={(blockId, el) => {
                if (el) inputRefs.current.set(blockId, el);
                else inputRefs.current.delete(blockId);
              }}
            />

            {/* ── Delete button ────────────────────────────────── */}
            {isHovered && value.blocks.length > 1 && (
              <button type="button" onClick={() => deleteBlock(block.id)} title="Delete block"
                style={{
                  position: 'absolute', right: '-24px', top: '6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-faint)', padding: '2px 4px', fontSize: '11px', lineHeight: 1,
                  opacity: 0.5, transition: 'opacity 120ms',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '0.5')}
              >✕</button>
            )}

            {/* ── Slash menu ───────────────────────────────────── */}
            {slashMenu?.blockId === block.id && (
              <SlashMenu
                query={slashMenu.query}
                groups={SLASH_GROUPS}
                allowedTypes={allowedTypes}
                filteredItems={filteredSlashItems}
                activeIndex={slashMenuFlatIndex}
                onSelect={(item) => applySlashItem(item, block.id)}
                onHover={(i) => setSlashMenuFlatIndex(i)}
              />
            )}
          </div>
        );
      })}

      {/* Add block */}
      {!isLimitReached && (
        <button
          type="button"
          onClick={() => insertBlock(lastBlockId, 'paragraph')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginTop: '8px', padding: '3px 8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', fontSize: '12px',
            borderRadius: '4px', transition: 'all 120ms',
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none'; }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1, fontWeight: 300 }}>+</span>
          <span>Add block</span>
        </button>
      )}

      {maxBlocks && (
        <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {value.blocks.length} / {maxBlocks}
          {isLimitReached && <span style={{ color: 'var(--fn-warning)', marginLeft: '6px' }}>limit reached</span>}
        </p>
      )}
    </div>
  );
}

// ─── Slash menu component ──────────────────────────────────────────────────────

interface SlashMenuProps {
  query: string;
  groups: typeof SLASH_GROUPS;
  allowedTypes: RichBlockType[];
  filteredItems: SlashItem[];
  activeIndex: number;
  onSelect: (item: SlashItem) => void;
  onHover: (flatIndex: number) => void;
}

function SlashMenu({ query, groups, allowedTypes, filteredItems, activeIndex, onSelect, onHover }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-slash-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // When query is non-empty, show flat filtered list (no group headers)
  const showFlat = query.length > 0;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute', top: '100%', left: 0, zIndex: 50,
        marginTop: '4px', width: '200px', maxHeight: '320px', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '8px', boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        scrollbarWidth: 'none',
      }}
    >
      {showFlat ? (
        filteredItems.length === 0 ? (
          <p style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-faint)' }}>No results</p>
        ) : (
          filteredItems.map((item, fi) => (
            <SlashMenuItem key={`${item.type}-${item.label}`} item={item} flatIndex={fi} isActive={fi === activeIndex} onSelect={onSelect} onHover={onHover} />
          ))
        )
      ) : (
        groups.map((group, gi) => {
          const visible = group.items.filter((i) => allowedTypes.includes(i.type));
          if (visible.length === 0) return null;
          // Compute flat index offset for this group
          const offset = groups.slice(0, gi).reduce((sum, g) => sum + g.items.filter((i) => allowedTypes.includes(i.type)).length, 0);
          return (
            <div key={group.label} style={{ borderTop: gi > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
              <p style={{ padding: '7px 10px 3px', fontSize: '9px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {group.label}
              </p>
              {visible.map((item, li) => (
                <SlashMenuItem key={`${item.type}-${item.label}`} item={item} flatIndex={offset + li} isActive={offset + li === activeIndex} onSelect={onSelect} onHover={onHover} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function SlashMenuItem({ item, flatIndex, isActive, onSelect, onHover }: {
  item: SlashItem; flatIndex: number; isActive: boolean;
  onSelect: (item: SlashItem) => void; onHover: (i: number) => void;
}) {
  return (
    <button
      type="button"
      data-slash-index={flatIndex}
      onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
      onMouseEnter={() => onHover(flatIndex)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '5px 10px',
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 80ms',
      }}
    >
      <span style={{
        width: '18px', height: '18px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', border: '1px solid var(--border-default)',
        borderRadius: '3px', fontSize: '9px', fontWeight: 700,
        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
      }}>{item.icon}</span>
      <span style={{ fontSize: '12px', fontWeight: 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {item.label}
      </span>
    </button>
  );
}

// ─── Block editor component ────────────────────────────────────────────────────

interface BlockEditorProps {
  block: RichBlock;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: (blockId: string, hasSelection: boolean) => void;
  onTextChange: (blockId: string, text: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, block: RichBlock) => void;
  onPaste: (e: React.ClipboardEvent, blockId: string) => void;
  onUpdateData: (blockId: string, data: Partial<RichBlock['data']>) => void;
  registerInput: (blockId: string, el: HTMLTextAreaElement | HTMLInputElement | null) => void;
}

const autoResize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const BASE_TA: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', resize: 'none', overflow: 'hidden',
  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
  padding: 0, margin: 0, display: 'block', lineHeight: 1.7,
};

const BASE_IN: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)', padding: 0, margin: 0, display: 'block',
};

function BlockEditor({
  block, isFocused, onFocus, onBlur, onSelect,
  onTextChange, onKeyDown, onPaste, onUpdateData, registerInput,
}: BlockEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { autoResize(taRef.current); }, [block.data.text]);

  // Register primary input
  useEffect(() => {
    registerInput(block.id, taRef.current);
    return () => registerInput(block.id, null);
  }, [block.id, registerInput]);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    onSelect(block.id, (target.selectionStart ?? 0) !== (target.selectionEnd ?? 0));
  };

  // ── Heading ──────────────────────────────────────────────────────────────────
  if (block.type === 'heading') {
    const level = block.data.level ?? 1;
    const sizes: Record<number, string> = { 1: '1.875rem', 2: '1.375rem', 3: '1.125rem' };
    const weights: Record<number, number> = { 1: 800, 2: 700, 3: 600 };
    return (
      <div>
        <input
          ref={(el) => registerInput(block.id, el)}
          type="text"
          value={block.data.text ?? ''}
          placeholder={`Heading ${level}`}
          onChange={(e) => onTextChange(block.id, e.target.value)}
          onKeyDown={(e) => onKeyDown(e as any, block)}
          onPaste={(e) => onPaste(e, block.id)}
          onFocus={onFocus} onBlur={onBlur}
          onSelect={handleSelect}
          style={{ ...BASE_IN, fontSize: sizes[level] ?? '1.875rem', fontWeight: weights[level] ?? 800, letterSpacing: '-0.025em', lineHeight: 1.25, paddingBottom: level === 1 ? '8px' : '2px', borderBottom: level === 1 ? '1px solid var(--border-subtle)' : 'none' }}
        />
        {isFocused && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
            {[1, 2, 3].map((l) => (
              <button key={l} type="button"
                onMouseDown={(e) => { e.preventDefault(); onUpdateData(block.id, { level: l }); }}
                style={{ padding: '1px 7px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-default)', borderRadius: '3px', fontFamily: 'var(--font-mono)', background: block.data.level === l ? 'var(--bg-elevated)' : 'transparent', color: block.data.level === l ? 'var(--text-primary)' : 'var(--text-faint)' }}
              >H{l}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Paragraph ────────────────────────────────────────────────────────────────
  if (block.type === 'paragraph') {
    return (
      <textarea
        ref={(el) => { (taRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; registerInput(block.id, el); }}
        rows={1}
        value={block.data.text ?? ''}
        placeholder="Type something… or / for commands"
        onChange={(e) => { autoResize(e.target); onTextChange(block.id, e.target.value); }}
        onKeyDown={(e) => onKeyDown(e, block)}
        onPaste={(e) => onPaste(e, block.id)}
        onFocus={onFocus} onBlur={onBlur}
        onSelect={handleSelect}
        style={{ ...BASE_TA, fontSize: '0.9375rem', minHeight: '28px' }}
      />
    );
  }

  // ── Quote ────────────────────────────────────────────────────────────────────
  if (block.type === 'quote') {
    return (
      <div style={{ borderLeft: '3px solid var(--border-strong)', paddingLeft: '14px', margin: '4px 0' }}>
        <textarea
          ref={(el) => { (taRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; registerInput(block.id, el); }}
          rows={1}
          value={block.data.text ?? ''}
          placeholder="Quote or callout…"
          onChange={(e) => { autoResize(e.target); onTextChange(block.id, e.target.value); }}
          onKeyDown={(e) => onKeyDown(e, block)}
          onPaste={(e) => onPaste(e, block.id)}
          onFocus={onFocus} onBlur={onBlur}
          onSelect={handleSelect}
          style={{ ...BASE_TA, fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-secondary)', minHeight: '28px' }}
        />
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  if (block.type === 'list') {
    const items = block.data.items ?? [''];
    return (
      <div>
        {isFocused && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
            {(['bullet', 'ordered'] as const).map((lt) => (
              <button key={lt} type="button"
                onMouseDown={(e) => { e.preventDefault(); onUpdateData(block.id, { listType: lt }); }}
                style={{ padding: '1px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-default)', borderRadius: '3px', textTransform: 'capitalize', background: block.data.listType === lt ? 'var(--bg-elevated)' : 'transparent', color: block.data.listType === lt ? 'var(--text-primary)' : 'var(--text-faint)' }}
              >{lt}</button>
            ))}
          </div>
        )}
        {items.map((item, ii) => (
          <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '1px' }}>
            <span style={{ minWidth: '18px', flexShrink: 0, color: 'var(--text-faint)', fontSize: block.data.listType === 'ordered' ? '12px' : '1rem', fontFamily: block.data.listType === 'ordered' ? 'var(--font-mono)' : 'inherit', lineHeight: 1.7, paddingTop: block.data.listType === 'ordered' ? '1px' : 0 }}>
              {block.data.listType === 'ordered' ? `${ii + 1}.` : '•'}
            </span>
            <textarea
              rows={1}
              value={item}
              placeholder="List item…"
              onChange={(e) => { autoResize(e.target); const next = [...items]; next[ii] = e.target.value; onUpdateData(block.id, { items: next }); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const next = [...items]; next.splice(ii + 1, 0, '');
                  onUpdateData(block.id, { items: next });
                  setTimeout(() => {
                    const wrapper = document.querySelector(`[data-block-id="${block.id}"]`);
                    const inputs = wrapper?.querySelectorAll<HTMLTextAreaElement>('textarea');
                    if (inputs?.[ii + 1]) inputs[ii + 1].focus();
                  }, 20);
                  return;
                }
                if (e.key === 'Backspace' && item === '' && items.length > 1) {
                  e.preventDefault();
                  onUpdateData(block.id, { items: items.filter((_, i) => i !== ii) });
                  return;
                }
                onKeyDown(e, block);
              }}
              onFocus={onFocus} onBlur={onBlur}
              style={{ ...BASE_TA, flex: 1, fontSize: '0.9375rem', minHeight: '28px' }}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Code ─────────────────────────────────────────────────────────────────────
  if (block.type === 'code') {
    return (
      <div style={{ borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden', background: 'var(--bg-base)', margin: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <input
            type="text"
            value={block.data.language ?? 'javascript'}
            onChange={(e) => onUpdateData(block.id, { language: e.target.value })}
            onFocus={onFocus}
            style={{ ...BASE_IN, fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100px' }}
          />
        </div>
        <textarea
          ref={(el) => registerInput(block.id, el)}
          rows={4}
          value={block.data.code ?? ''}
          placeholder="// Write code here…"
          onChange={(e) => { autoResize(e.target); onUpdateData(block.id, { code: e.target.value }); }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const code = (block.data.code ?? '').slice(0, s) + '  ' + (block.data.code ?? '').slice(s);
              onUpdateData(block.id, { code });
              setTimeout(() => e.currentTarget.setSelectionRange(s + 2, s + 2), 0);
              return;
            }
            if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onKeyDown(e, { ...block, type: 'paragraph', data: { text: '' } }); }
          }}
          onFocus={onFocus} onBlur={onBlur}
          style={{ ...BASE_TA, fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', padding: '10px 12px', minHeight: '80px' }}
        />
      </div>
    );
  }

  // ── Math ─────────────────────────────────────────────────────────────────────
  if (block.type === 'math') {
    return (
      <div style={{ margin: '4px 0' }}>
        <div style={{ borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden', background: 'var(--bg-base)' }}>
          <div style={{ padding: '3px 10px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LaTeX</span>
          </div>
          <textarea
            ref={(el) => registerInput(block.id, el)}
            rows={2}
            value={block.data.code ?? ''}
            placeholder="\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}"
            onChange={(e) => { autoResize(e.target); onUpdateData(block.id, { code: e.target.value }); }}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...BASE_TA, fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '8px 10px', minHeight: '48px' }}
          />
        </div>
        {block.data.code && (
          <div style={{ padding: '12px 4px 4px' }}>
            <MathRenderer code={block.data.code} block={true} />
          </div>
        )}
      </div>
    );
  }

  // ── Mermaid ───────────────────────────────────────────────────────────────────
  if (block.type === 'mermaid') {
    return (
      <div style={{ margin: '4px 0' }}>
        <div style={{ borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden', background: 'var(--bg-base)' }}>
          <div style={{ padding: '3px 10px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mermaid Diagram</span>
          </div>
          <textarea
            ref={(el) => registerInput(block.id, el)}
            rows={4}
            value={block.data.code ?? ''}
            placeholder={'graph TD;\n  A-->B;\n  B-->C;'}
            onChange={(e) => { autoResize(e.target); onUpdateData(block.id, { code: e.target.value }); }}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...BASE_TA, fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '8px 10px', minHeight: '80px' }}
          />
        </div>
        {block.data.code && (
          <div style={{ padding: '12px 4px 4px' }}>
            <MermaidRenderer code={block.data.code} />
          </div>
        )}
      </div>
    );
  }

  // ── Video ─────────────────────────────────────────────────────────────────────
  if (block.type === 'video') {
    const url = block.data.url ?? '';
    let embedSrc = '';
    if (url) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const vid = url.includes('v=')
          ? url.split('v=')[1]?.split('&')[0]
          : url.split('/').pop()?.split('?')[0];
        embedSrc = `https://www.youtube.com/embed/${vid}`;
      } else if (url.includes('vimeo.com')) {
        embedSrc = `https://player.vimeo.com/video/${url.split('/').pop()?.split('?')[0]}`;
      } else {
        embedSrc = url;
      }
    }
    return (
      <div style={{ margin: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: embedSrc ? '8px' : 0 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>▶</span>
          <input
            ref={(el) => registerInput(block.id, el)}
            type="text"
            value={url}
            placeholder="Paste YouTube or Vimeo URL…"
            onChange={(e) => onUpdateData(block.id, { url: e.target.value })}
            onKeyDown={(e) => onKeyDown(e, block)}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...BASE_IN, fontSize: '0.875rem', color: url ? 'var(--text-primary)' : 'var(--text-faint)' }}
          />
        </div>
        {embedSrc && (
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-default)', aspectRatio: '16/9' }}>
            <iframe src={embedSrc} className="w-full h-full border-none" allowFullScreen title="Video preview" />
          </div>
        )}
      </div>
    );
  }

  // ── File ──────────────────────────────────────────────────────────────────────
  if (block.type === 'file') {
    const url = block.data.url ?? '';
    const filename = block.data.filename ?? '';
    return (
      <div style={{ margin: '4px 0' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <input
            ref={(el) => registerInput(block.id, el)}
            type="text"
            value={filename}
            placeholder="Label / filename"
            onChange={(e) => onUpdateData(block.id, { filename: e.target.value })}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...BASE_IN, flex: 1, fontSize: '0.875rem', fontWeight: 500 }}
          />
          <span style={{ color: 'var(--text-faint)', fontSize: '12px', alignSelf: 'center' }}>·</span>
          <input
            type="text"
            value={url}
            placeholder="URL"
            onChange={(e) => onUpdateData(block.id, { url: e.target.value })}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...BASE_IN, flex: 2, fontSize: '0.875rem', color: 'var(--text-faint)' }}
          />
        </div>
        {url && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px' }}>↓</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{filename || url}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────────
  if (block.type === 'table') {
    const rows = block.data.rows ?? [['', '', ''], ['', '', '']];
    const colCount = rows[0]?.length ?? 3;

    const setCell = (ri: number, ci: number, val: string) => {
      const next = rows.map((row) => [...row]);
      if (!next[ri]) next[ri] = [];
      next[ri][ci] = val;
      onUpdateData(block.id, { rows: next });
    };

    const addRow = () => onUpdateData(block.id, { rows: [...rows, Array(colCount).fill('')] });
    const removeRow = () => rows.length > 1 && onUpdateData(block.id, { rows: rows.slice(0, -1) });
    const addCol = () => onUpdateData(block.id, { rows: rows.map((row) => [...row, '']) });
    const removeCol = () => colCount > 1 && onUpdateData(block.id, { rows: rows.map((row) => row.slice(0, -1)) });

    return (
      <div style={{ margin: '4px 0' }}>
        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${colCount * 100}px` }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: ri === 0 ? 'var(--bg-elevated)' : 'transparent' }}>
                  {(row || []).map((cell, ci) => (
                    <td key={ci} style={{ padding: 0, borderRight: ci < colCount - 1 ? '1px solid var(--border-subtle)' : 'none', minWidth: '90px' }}>
                      <input
                        type="text"
                        value={cell}
                        placeholder={ri === 0 ? `Column ${ci + 1}` : ''}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{
                          width: '100%', border: 'none', outline: 'none',
                          background: 'transparent', padding: '6px 10px',
                          fontSize: ri === 0 ? '11px' : '12px',
                          fontWeight: ri === 0 ? 700 : 400,
                          color: ri === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isFocused && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            {[
              { label: '+ Row', action: addRow },
              { label: '− Row', action: removeRow },
              { label: '+ Col', action: addCol },
              { label: '− Col', action: removeCol },
            ].map(({ label, action }) => (
              <button
                key={label} type="button"
                onMouseDown={(e) => { e.preventDefault(); action(); }}
                style={{ padding: '2px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border-default)', borderRadius: '3px', background: 'transparent', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}
              >{label}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
