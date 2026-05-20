import { CanonicalDocument, CanonicalNode } from '../../types';

export const createEmptyDocument = (): CanonicalDocument => ({
  version: 1,
  type: 'doc',
  meta: {},
  content: [],
});

export const createParagraphDocument = (text = ''): CanonicalDocument => ({
  version: 1,
  type: 'doc',
  meta: {},
  content: text.trim()
    ? [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ]
    : [],
});

export const isCanonicalDocument = (value: unknown): value is CanonicalDocument => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { type?: unknown; content?: unknown };
  return candidate.type === 'doc' && Array.isArray(candidate.content);
};

export const parseCanonicalDocument = (
  value: unknown,
  fallbackText = '',
): CanonicalDocument => {
  if (isCanonicalDocument(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isCanonicalDocument(parsed)) {
        return parsed;
      }
    } catch {
      return createParagraphDocument(value);
    }
  }

  if (typeof fallbackText === 'string' && fallbackText.trim()) {
    return createParagraphDocument(fallbackText);
  }

  return createEmptyDocument();
};

export const serializeCanonicalDocument = (document: CanonicalDocument): string =>
  JSON.stringify(document);

const collectNodeText = (node: CanonicalNode, values: string[]) => {
  if (typeof node.text === 'string' && node.text.trim()) {
    values.push(node.text.trim());
  }
  if (Array.isArray(node.content)) {
    node.content.forEach((child) => collectNodeText(child, values));
  }
};

export const extractDocumentText = (document: CanonicalDocument): string => {
  const values: string[] = [];
  document.content.forEach((node) => collectNodeText(node, values));
  return values.join(' ').replace(/\s+/g, ' ').trim();
};

export const hasMeaningfulDocumentContent = (document: CanonicalDocument): boolean => {
  if (document.content.length === 0) {
    return false;
  }
  return extractDocumentText(document).length > 0 || document.content.some((node) => node.type !== 'paragraph');
};
