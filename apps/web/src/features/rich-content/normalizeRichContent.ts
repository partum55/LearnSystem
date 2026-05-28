import type { RichBlock, RichBlockType, RichContentDocument } from './rich-content.types';

const SUPPORTED_BLOCK_TYPES: RichBlockType[] = [
  'paragraph',
  'heading',
  'list',
  'quote',
  'code',
  'mermaid',
  'math',
  'video',
  'file',
  'table',
];

const SUPPORTED_BLOCK_TYPE_SET = new Set<string>(SUPPORTED_BLOCK_TYPES);

const generateId = () => Math.random().toString(36).substring(2, 9);

export function normalizeRichContentDocument(value: unknown, fallbackText = ''): RichContentDocument {
  if (isRichContentLike(value)) {
    const blocks = value.blocks
      .map((block, index) => normalizeRichBlock(block, index))
      .filter((block): block is RichBlock => block !== null);

    return {
      version: 1,
      type: 'RICH_CONTENT',
      blocks,
    };
  }

  return {
    version: 1,
    type: 'RICH_CONTENT',
    blocks: fallbackText
      ? [
          {
            id: generateId(),
            type: 'paragraph',
            data: { text: fallbackText },
          },
        ]
      : [],
  };
}

function isRichContentLike(value: unknown): value is { blocks: unknown[] } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { version?: unknown }).version === 1 &&
      Array.isArray((value as { blocks?: unknown }).blocks)
  );
}

function normalizeRichBlock(value: unknown, index: number): RichBlock | null {
  if (!value || typeof value !== 'object') return null;

  const rawBlock = value as { id?: unknown; type?: unknown; data?: unknown };
  if (typeof rawBlock.type !== 'string' || !SUPPORTED_BLOCK_TYPE_SET.has(rawBlock.type)) {
    return null;
  }

  const type = rawBlock.type as RichBlockType;
  const data = rawBlock.data && typeof rawBlock.data === 'object'
    ? (rawBlock.data as Record<string, unknown>)
    : {};

  return {
    id: typeof rawBlock.id === 'string' && rawBlock.id.trim()
      ? rawBlock.id.trim()
      : `ai-${index + 1}-${generateId()}`,
    type,
    data: normalizeBlockData(type, data),
  };
}

function normalizeBlockData(type: RichBlockType, data: Record<string, unknown>): RichBlock['data'] {
  if (type === 'paragraph' || type === 'quote') {
    return { text: stringValue(data.text) };
  }

  if (type === 'heading') {
    const level = Number(data.level);
    return {
      text: stringValue(data.text),
      level: Number.isFinite(level) && level >= 1 && level <= 4 ? level : 1,
    };
  }

  if (type === 'list') {
    const items = Array.isArray(data.items)
      ? data.items.map((item) => stringValue(item)).filter((item) => item.trim())
      : [];
    return {
      items,
      listType: data.listType === 'ordered' ? 'ordered' : 'bullet',
    };
  }

  if (type === 'code') {
    return {
      code: stringValue(data.code),
      language: stringValue(data.language) || 'javascript',
    };
  }

  if (type === 'mermaid' || type === 'math') {
    return { code: stringValue(data.code) };
  }

  if (type === 'video') {
    return { url: stringValue(data.url) };
  }

  if (type === 'file') {
    return {
      url: stringValue(data.url),
      filename: stringValue(data.filename),
    };
  }

  if (type === 'table') {
    return {
      rows: Array.isArray(data.rows)
        ? data.rows.map((row) => Array.isArray(row) ? row.map((cell) => stringValue(cell)) : [])
        : [],
    };
  }

  return {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
