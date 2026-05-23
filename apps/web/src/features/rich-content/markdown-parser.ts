import { RichBlock, RichContentDocument } from './rich-content.types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export function markdownToRichContent(markdown: string): RichContentDocument {
  const doc: RichContentDocument = {
    version: 1,
    blocks: [],
  };

  if (!markdown || !markdown.trim()) {
    return doc;
  }

  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeLines: string[] = [];
  let listItems: string[] = [];
  let listType: 'bullet' | 'ordered' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      doc.blocks.push({
        id: generateId(),
        type: 'list',
        data: {
          items: [...listItems],
          listType,
        },
      });
      listItems = [];
      listType = null;
    }
  };

  const flushCode = () => {
    if (inCodeBlock) {
      const codeText = codeLines.join('\n');
      let type: 'code' | 'mermaid' | 'math' = 'code';
      if (codeBlockLang === 'mermaid') {
        type = 'mermaid';
      } else if (codeBlockLang === 'math' || codeBlockLang === 'latex') {
        type = 'math';
      }

      doc.blocks.push({
        id: generateId(),
        type,
        data: {
          code: codeText,
          language: type === 'code' ? codeBlockLang : undefined,
        },
      });
      codeLines = [];
      inCodeBlock = false;
      codeBlockLang = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim().toLowerCase();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (trimmed.startsWith('$$')) {
      flushList();
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        const formula = trimmed.substring(2, trimmed.length - 2).trim();
        doc.blocks.push({
          id: generateId(),
          type: 'math',
          data: { code: formula },
        });
      } else {
        const mathLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        doc.blocks.push({
          id: generateId(),
          type: 'math',
          data: { code: mathLines.join('\n') },
        });
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      flushList();
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        doc.blocks.push({
          id: generateId(),
          type: 'heading',
          data: { text, level },
        });
        continue;
      }
    }

    if (trimmed.startsWith('>')) {
      flushList();
      const quoteLines = [trimmed.substring(1).trim()];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        quoteLines.push(lines[i].trim().substring(1).trim());
      }
      doc.blocks.push({
        id: generateId(),
        type: 'quote',
        data: { text: quoteLines.filter(Boolean).join('\n') },
      });
      continue;
    }

    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== 'bullet') {
        flushList();
        listType = 'bullet';
      }
      listItems.push(bulletMatch[3].trim());
      continue;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (listType !== 'ordered') {
        flushList();
        listType = 'ordered';
      }
      listItems.push(orderedMatch[3].trim());
      continue;
    }

    if (trimmed === '') {
      flushList();
      continue;
    }

    flushList();
    const paragraphLines = [line.trim()];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() !== '' &&
      !lines[i + 1].trim().startsWith('#') &&
      !lines[i + 1].trim().startsWith('>') &&
      !lines[i + 1].trim().startsWith('```') &&
      !lines[i + 1].trim().startsWith('$$') &&
      !lines[i + 1].match(/^\s*([-*+])\s+/) &&
      !lines[i + 1].match(/^\s*(\d+)\.\s+/)
    ) {
      i++;
      paragraphLines.push(lines[i].trim());
    }

    doc.blocks.push({
      id: generateId(),
      type: 'paragraph',
      data: { text: paragraphLines.join(' ') },
    });
  }

  flushList();
  if (inCodeBlock) {
    flushCode();
  }

  return doc;
}

export function richContentToMarkdown(doc: RichContentDocument): string {
  if (!doc || !doc.blocks || doc.blocks.length === 0) {
    return '';
  }
  return doc.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `${'#'.repeat(block.data.level || 1)} ${block.data.text}`;
        case 'paragraph':
          return block.data.text;
        case 'quote':
          return (block.data.text || '')
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n');
        case 'list':
          if (block.data.listType === 'ordered') {
            return (block.data.items || [])
              .map((item, idx) => `${idx + 1}. ${item}`)
              .join('\n');
          } else {
            return (block.data.items || [])
              .map((item) => `- ${item}`)
              .join('\n');
          }
        case 'code':
          return `\`\`\`${block.data.language || ''}\n${block.data.code || ''}\n\`\`\``;
        case 'mermaid':
          return `\`\`\`mermaid\n${block.data.code || ''}\n\`\`\``;
        case 'math':
          return `$$\n${block.data.code || ''}\n$$`;
        default:
          return '';
      }
    })
    .join('\n\n');
}
