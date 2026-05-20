import React, { useEffect, useRef, useState } from 'react';

export type SlashCommandCategory = 'text' | 'media' | 'advanced' | 'code';

export type SlashCommand = {
  key: string;
  label: string;
  description: string;
  keywords: string[];
  category: SlashCommandCategory;
  icon: React.ReactNode;
  execute: () => void;
};

export { SLASH_COMMAND_ICONS } from './slashCommandIcons';

const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  text: 'Text',
  media: 'Media',
  code: 'Code',
  advanced: 'Advanced',
};

const CATEGORY_ORDER: SlashCommandCategory[] = ['text', 'media', 'code', 'advanced'];

interface SlashCommandPaletteProps {
  commands: SlashCommand[];
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: (command: SlashCommand) => void;
  onClose: () => void;
}

export const SlashCommandPalette: React.FC<SlashCommandPaletteProps> = ({
  commands,
  query,
  onQueryChange,
  onExecute,
  onClose,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const haystack = `${cmd.label} ${cmd.keywords.join(' ')} ${cmd.description}`.toLowerCase();
    return haystack.includes(q);
  });

  // Group by category
  const grouped: { category: SlashCommandCategory; items: SlashCommand[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) {
      grouped.push({ category: cat, items });
    }
  }

  // Flat list for keyboard navigation
  const flatItems = grouped.flatMap((g) => g.items);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const focusedEl = listRef.current?.querySelector('[data-focused="true"]');
    focusedEl?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[focusedIndex]) {
        onExecute(flatItems[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = 0;

  return (
    <div
      className="slash-command-palette"
      onKeyDown={handleKeyDown}
    >
        <div className="slash-palette-search">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Filter blocks..."
            className="slash-palette-input"
          />
        </div>

        <div ref={listRef} className="slash-palette-list">
          {grouped.length === 0 && (
            <div className="slash-palette-empty">No blocks match your filter.</div>
          )}

          {grouped.map(({ category, items }) => (
            <div key={category}>
              <div className="slash-palette-category">{CATEGORY_LABELS[category]}</div>
              {items.map((cmd) => {
                const itemIndex = runningIndex++;
                const isFocused = itemIndex === focusedIndex;
                return (
                  <button
                    key={cmd.key}
                    type="button"
                    className={`slash-palette-item ${isFocused ? 'slash-palette-item-focused' : ''}`}
                    data-focused={isFocused}
                    onClick={() => onExecute(cmd)}
                    onMouseEnter={() => setFocusedIndex(itemIndex)}
                  >
                    <span className="slash-palette-icon">{cmd.icon}</span>
                    <span className="slash-palette-item-text">
                      <span className="slash-palette-item-label">{cmd.label}</span>
                      <span className="slash-palette-item-desc">{cmd.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
    </div>
  );
};
