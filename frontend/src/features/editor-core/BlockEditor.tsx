import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EditorContent,
  JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);
import TableRow from '@tiptap/extension-table-row';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { CitationModal } from './modals/CitationModal';
import { TestCaseModal } from './modals/TestCaseModal';
import { MathInputModal } from './modals/MathInputModal';
import { EmbedModal } from './modals/EmbedModal';
import { CodeBlockModal } from './modals/CodeBlockModal';
import { FootnoteModal } from './modals/FootnoteModal';
import { CanonicalDocument, CanonicalNode } from '../../types';
import { resolveSafeEmbed } from './embedSecurity';
import {
  CalloutNode,
  CitationNode,
  FootnoteNode,
  NumberedParagraphNode,
  TestCaseNode,
  EmbedNode,
  ImageNode,
  MermaidNode,
  MathBlockNode,
  MathInlineNode,
  InteractiveWidgetNode,
} from './nodes';
import {
  SlashCommandPalette,
  SlashCommand,
  SLASH_COMMAND_ICONS,
} from './SlashCommandPalette';
import { EditorBubbleToolbar } from './EditorBubbleToolbar';
import { EditorSidebar, MobileToolsDrawer } from './EditorSidebar';
import { MarkdownInputRules } from './markdownInputRules';
import './block-editor.css';

type EditorMode = 'full' | 'lite';

interface BlockEditorProps {
  value: CanonicalDocument;
  onChange: (doc: CanonicalDocument) => void;
  readOnly?: boolean;
  mode?: EditorMode;
  placeholder?: string;
  onUploadMedia?: (file: File) => Promise<{ url: string; contentType?: string }>;
  mobileToolsDrawer?: boolean;
  hotkeysProfile?: 'standard' | 'extended';
  showSidebarTabs?: boolean;
}

type SidebarTab = 'blocks' | 'structure' | 'assets' | 'history';

type BlockAction = {
  key: string;
  label: string;
  hint: string;
  execute: () => void;
  shortcut?: string;
};

type TextStyleAction = {
  key: string;
  label: string;
  execute: () => void;
  isActive?: boolean;
  shortcut?: string;
};

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s/m,           // headings
  /```[\s\S]*?```/,       // fenced code blocks
  /\[.+?\]\(.+?\)/,       // links
  /(\*\*|__).+?\1/,       // bold
  /(\*|_)[^*_]+?\1/,      // italic
  /^[-*+]\s/m,            // unordered list items
  /^\d+\.\s/m,            // ordered list items
  /^>\s/m,                // blockquotes
  /^---$/m,               // horizontal rules
  /!\[.*?\]\(.*?\)/,      // images
];

const looksLikeMarkdown = (text: string): boolean => {
  let hits = 0;
  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(text)) hits++;
    if (hits >= 2) return true;
  }
  return false;
};

const sanitizeImportedHtml = (rawHtml: string): string =>
  DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img', 'figure', 'figcaption', 'div',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class',
      'data-type', 'data-variant', 'data-sequence', 'data-latex',
      'data-provider', 'data-url', 'data-embed-url', 'data-caption',
      'data-alignment', 'data-citation-type', 'data-author', 'data-year',
      'data-key', 'data-ordinal', 'data-score', 'data-input', 'data-output',
      'data-visibility', 'data-code', 'style',
    ],
    KEEP_CONTENT: true,
  });

export const BlockEditor: React.FC<BlockEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  mode = 'full',
  placeholder,
  onUploadMedia,
  mobileToolsDrawer = true,
  hotkeysProfile = 'extended',
  showSidebarTabs = true,
}) => {
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Modal states
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState<false | 'block' | 'inline'>(false);
  const [showEmbedModal, setShowEmbedModal] = useState<false | 'youtube' | 'pdf'>(false);
  const [showCodeBlockModal, setShowCodeBlockModal] = useState(false);
  const [showFootnoteModal, setShowFootnoteModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('blocks');
  const [historyEvents, setHistoryEvents] = useState<string[]>([]);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const historyTickRef = useRef<number>(0);

  useEffect(() => {
    if (!mobileToolsDrawer || !isMobileToolsOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isMobileToolsOpen, mobileToolsDrawer]);

  useEffect(() => {
    if (!mobileToolsDrawer || !isMobileToolsOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileToolsOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isMobileToolsOpen, mobileToolsDrawer]);

  const toTiptapDocument = (doc: CanonicalDocument): JSONContent => ({
    type: 'doc',
    content: (doc.content as unknown as JSONContent[]) ?? [],
  });

  const toCanonicalDocument = (doc: JSONContent, source: CanonicalDocument): CanonicalDocument => ({
    version: source.version || 1,
    type: 'doc',
    meta: source.meta ?? {},
    content: (doc.content as unknown as CanonicalNode[]) ?? [],
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, codeBlock: false }),
      Placeholder.configure({ placeholder: placeholder || 'Type / for block commands...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      MarkdownInputRules,
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CalloutNode,
      CitationNode,
      FootnoteNode,
      NumberedParagraphNode,
      TestCaseNode,
      EmbedNode,
      ImageNode,
      MermaidNode,
      MathBlockNode,
      MathInlineNode,
      InteractiveWidgetNode,
    ],
    editable: !readOnly,
    content: toTiptapDocument(value),
    onUpdate({ editor: tiptapEditor }) {
      onChange(toCanonicalDocument(tiptapEditor.getJSON(), value));
      if (!readOnly) {
        const now = Date.now();
        setLastAutoSavedAt(new Date(now).toLocaleTimeString());
        if (now - historyTickRef.current > 12000) {
          historyTickRef.current = now;
          setHistoryEvents((prev) => [
            `${new Date(now).toLocaleTimeString()} · Updated`,
            ...prev,
          ].slice(0, 8));
        }
      }
    },
    editorProps: {
      attributes: {
        class: readOnly
          ? 'p-2 outline-none max-w-none text-[var(--text-primary)] leading-7'
          : 'min-h-[320px] p-4 outline-none max-w-none text-[var(--text-primary)] leading-7',
      },
      transformPastedHTML: (html) => sanitizeImportedHtml(html),
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData('text/html');
        if (html) return false; // let TipTap handle native HTML paste

        const text = event.clipboardData?.getData('text/plain');
        if (!text || !looksLikeMarkdown(text)) return false;

        const parsed = marked.parse(text, { async: false, gfm: true, breaks: true });
        const sanitized = sanitizeImportedHtml(parsed as string);
        editor?.commands.insertContent(sanitized);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.isComposing || readOnly || !editor) return false;

        if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
          // Disable slash commands inside code blocks
          if (editor.isActive('codeBlock')) return false;
          event.preventDefault();
          setSlashQuery('');
          setShowSlashCommands(true);
          return true;
        }

        // Shift+Enter = soft break (newline within current block)
        // Enter = create new block (default TipTap behavior for most nodes)
        if (event.key === 'Enter' && event.shiftKey && !editor.isActive('codeBlock')) {
          event.preventDefault();
          editor.chain().focus().setHardBreak().run();
          return true;
        }

        if (event.key === 'Escape' && showSlashCommands) {
          event.preventDefault();
          setShowSlashCommands(false);
          return true;
        }

        const key = event.key.toLowerCase();
        const hasPrimaryModifier = event.metaKey || event.ctrlKey;

        if (hasPrimaryModifier && !event.altKey) {
          if (key === 'b' && !event.shiftKey) {
            event.preventDefault();
            editor.chain().focus().toggleBold().run();
            return true;
          }
          if (key === 'i' && !event.shiftKey) {
            event.preventDefault();
            editor.chain().focus().toggleItalic().run();
            return true;
          }
          if (key === 'k' && !event.shiftKey) {
            event.preventDefault();
            setLinkFromSelection();
            return true;
          }
        }

        if (event.altKey && !event.metaKey && !event.ctrlKey) {
          if (hotkeysProfile === 'extended') {
            if (!event.shiftKey && key === '1') { event.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); return true; }
            if (!event.shiftKey && key === '2') { event.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); return true; }
            if (!event.shiftKey && key === 'd') { event.preventDefault(); duplicateCurrentBlock(); return true; }
            if (event.shiftKey && key === '7') { event.preventDefault(); editor.chain().focus().toggleOrderedList().run(); return true; }
            if (event.shiftKey && key === '8') { event.preventDefault(); editor.chain().focus().toggleBulletList().run(); return true; }
            if (event.shiftKey && key === 'x') { event.preventDefault(); editor.chain().focus().toggleTaskList().run(); return true; }
            if (event.shiftKey && key === 'q') { event.preventDefault(); editor.chain().focus().toggleBlockquote().run(); return true; }
          }

          if (!event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            const direction = event.key === 'ArrowUp' ? -1 : 1;
            const current = editor.getJSON();
            const blocks: JSONContent[] = Array.isArray(current.content) ? [...(current.content as JSONContent[])] : [];
            if (blocks.length < 2) return true;

            const cursor = editor.state.selection.from;
            let selectedIndex = -1;
            editor.state.doc.forEach((node, offset, index) => {
              const start = offset + 1;
              const end = start + node.nodeSize - 1;
              if (cursor >= start && cursor <= end) selectedIndex = index;
            });

            if (selectedIndex === -1) return true;
            const targetIndex = selectedIndex + direction;
            if (targetIndex < 0 || targetIndex >= blocks.length) return true;

            const [moved] = blocks.splice(selectedIndex, 1);
            blocks.splice(targetIndex, 0, moved);
            editor.commands.setContent({ type: 'doc', content: blocks }, { emitUpdate: true });
            editor.commands.focus();
            return true;
          }
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    const incoming = toTiptapDocument(value);
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  // ── Insert helpers ──

  const insertInlineMath = () => { if (!editor || readOnly) return; setShowMathModal('inline'); };
  const insertMathBlock = () => { if (!editor || readOnly) return; setShowMathModal('block'); };

  const handleMathInsert = useCallback((latex: string) => {
    if (!editor) return;
    const type = showMathModal === 'inline' ? 'mathInline' : 'mathBlock';
    editor.chain().focus().insertContent({ type, attrs: { latex } }).run();
  }, [editor, showMathModal]);

  const insertCallout = (variant: 'info' | 'warn' | 'example' | 'hint' = 'info') => {
    if (!editor || readOnly) return;
    editor.chain().focus().insertContent({
      type: 'callout', attrs: { variant },
      content: [{ type: 'text', text: 'Callout text' }],
    }).run();
  };

  const insertCitation = () => { if (!editor || readOnly) return; setShowCitationModal(true); };

  const handleCitationInsert = useCallback((data: { author: string; title: string; year: number | null; url: string; citationType: string }) => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'citation', attrs: data }).run();
  }, [editor]);

  const insertFootnote = () => { if (!editor || readOnly) return; setShowFootnoteModal(true); };

  const handleFootnoteInsert = useCallback((key: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'footnote', attrs: { key: key || null },
      content: [{ type: 'text', text: 'Footnote text' }],
    }).run();
  }, [editor]);

  const insertNumberedParagraph = () => {
    if (!editor || readOnly) return;
    editor.chain().focus().insertContent({
      type: 'numberedParagraph',
      content: [{ type: 'text', text: 'Numbered paragraph text' }],
    }).run();
  };

  const insertTestCase = () => { if (!editor || readOnly) return; setShowTestCaseModal(true); };

  const handleTestCaseInsert = useCallback((data: { input: string; output: string; visibility: string; score: number }) => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'testCase', attrs: data }).run();
  }, [editor]);

  const insertEmbed = (provider: 'youtube' | 'pdf') => {
    if (!editor || readOnly) return;
    setShowEmbedModal(provider);
  };

  const handleEmbedInsert = useCallback((data: { provider: 'youtube' | 'pdf'; url: string; title: string }) => {
    if (!editor) return;
    const safeEmbed = resolveSafeEmbed(data.provider, data.url);
    if (!safeEmbed) {
      window.alert(
        data.provider === 'youtube'
          ? 'Only allowlisted YouTube URLs are supported.'
          : 'PDF embeds are restricted to allowlisted domains and .pdf URLs.'
      );
      return;
    }
    editor.chain().focus().insertContent({
      type: 'embed',
      attrs: { provider: data.provider, url: safeEmbed.sourceUrl, embedUrl: safeEmbed.embedUrl, title: data.title },
    }).run();
  }, [editor]);

  const insertInteractiveWidget = () => {
    if (!editor || readOnly) return;
    editor.chain().focus().insertContent({
      type: 'interactiveWidget',
      attrs: { code: '', prompt: '', title: '', conversationHistory: '[]' },
    }).run();
  };

  const insertMermaid = () => {
    if (!editor || readOnly) return;
    editor.chain().focus().insertContent({
      type: 'mermaid',
      attrs: { code: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[Done]' },
    }).run();
  };

  const duplicateCurrentBlock = () => {
    if (!editor || readOnly) return;
    const current = editor.getJSON();
    const blocks: JSONContent[] = Array.isArray(current.content) ? [...(current.content as JSONContent[])] : [];
    if (blocks.length === 0) return;

    const cursor = editor.state.selection.from;
    let selectedIndex = -1;
    editor.state.doc.forEach((node, offset, index) => {
      const start = offset + 1;
      const end = start + node.nodeSize - 1;
      if (cursor >= start && cursor <= end) selectedIndex = index;
    });

    if (selectedIndex < 0 || selectedIndex >= blocks.length) return;
    const clone = JSON.parse(JSON.stringify(blocks[selectedIndex])) as JSONContent;
    blocks.splice(selectedIndex + 1, 0, clone);
    editor.commands.setContent({ type: 'doc', content: blocks }, { emitUpdate: true });
    editor.commands.focus();
  };

  const triggerImageUpload = () => { if (readOnly) return; imageInputRef.current?.click(); };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || readOnly) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (onUploadMedia) {
      setIsUploading(true);
      try {
        const uploaded = await onUploadMedia(file);
        editor.chain().focus().insertContent({
          type: 'image',
          attrs: { src: uploaded.url, alt: file.name, caption: '', alignment: 'center' },
        }).run();
        return;
      } catch (error) {
        console.error('Image upload failed', error);
      } finally {
        setIsUploading(false);
      }
    }

    const fallbackUrl = window.prompt('Image URL', 'https://');
    if (!fallbackUrl || !fallbackUrl.trim()) return;
    editor.chain().focus().insertContent({
      type: 'image',
      attrs: { src: fallbackUrl.trim(), alt: file.name, caption: '', alignment: 'center' },
    }).run();
  };

  const insertCodeBlock = () => { if (!editor || readOnly) return; setShowCodeBlockModal(true); };

  const handleCodeBlockInsert = useCallback((language: string) => {
    if (!editor) return;
    editor.chain().focus().setNode('codeBlock', { language }).run();
  }, [editor]);

  // ── Slash commands (with descriptions, categories, icons) ──

  const slashCommands = useMemo<SlashCommand[]>(() => {
    if (!editor || readOnly) return [];

    const baseCommands: SlashCommand[] = [
      { key: 'paragraph', label: 'Paragraph', description: 'Plain text block', keywords: ['text', 'p'], category: 'text', icon: SLASH_COMMAND_ICONS.paragraph, execute: () => editor.chain().focus().setParagraph().run() },
      { key: 'heading1', label: 'Heading 1', description: 'Large section title', keywords: ['h1', 'title'], category: 'text', icon: SLASH_COMMAND_ICONS.heading1, execute: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
      { key: 'heading2', label: 'Heading 2', description: 'Medium section title', keywords: ['h2', 'subtitle'], category: 'text', icon: SLASH_COMMAND_ICONS.heading2, execute: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { key: 'heading3', label: 'Heading 3', description: 'Small section title', keywords: ['h3'], category: 'text', icon: SLASH_COMMAND_ICONS.heading3, execute: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { key: 'bulletList', label: 'Bulleted List', description: 'Unordered list of items', keywords: ['list', 'bullet'], category: 'text', icon: SLASH_COMMAND_ICONS.bulletList, execute: () => editor.chain().focus().toggleBulletList().run() },
      { key: 'orderedList', label: 'Numbered List', description: 'Ordered list of items', keywords: ['list', 'ordered'], category: 'text', icon: SLASH_COMMAND_ICONS.orderedList, execute: () => editor.chain().focus().toggleOrderedList().run() },
      { key: 'taskList', label: 'Checklist', description: 'Trackable todo items', keywords: ['task', 'todo'], category: 'text', icon: SLASH_COMMAND_ICONS.taskList, execute: () => editor.chain().focus().toggleTaskList().run() },
      { key: 'quote', label: 'Quote', description: 'Blockquote text', keywords: ['blockquote'], category: 'text', icon: SLASH_COMMAND_ICONS.quote, execute: () => editor.chain().focus().toggleBlockquote().run() },
      { key: 'codeBlock', label: 'Code Block', description: 'Formatted code snippet', keywords: ['code', 'snippet'], category: 'code', icon: SLASH_COMMAND_ICONS.codeBlock, execute: insertCodeBlock },
      { key: 'mathInline', label: 'Inline Math', description: 'LaTeX inline formula', keywords: ['latex', 'math'], category: 'code', icon: SLASH_COMMAND_ICONS.mathInline, execute: insertInlineMath },
      { key: 'mathBlock', label: 'Math Block', description: 'LaTeX display equation', keywords: ['latex', 'equation'], category: 'code', icon: SLASH_COMMAND_ICONS.mathBlock, execute: insertMathBlock },
      { key: 'table3x3', label: 'Table 3×3', description: 'Small data table', keywords: ['table', 'small'], category: 'media', icon: SLASH_COMMAND_ICONS.table, execute: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { key: 'table4x4', label: 'Table 4×4', description: 'Medium data table', keywords: ['table', 'medium'], category: 'media', icon: SLASH_COMMAND_ICONS.table, execute: () => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
      { key: 'table5x5', label: 'Table 5×5', description: 'Large data table', keywords: ['table', 'large'], category: 'media', icon: SLASH_COMMAND_ICONS.table, execute: () => editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run() },
      { key: 'table6x3', label: 'Table 6×3', description: 'Wide table (6 cols)', keywords: ['table', 'wide'], category: 'media', icon: SLASH_COMMAND_ICONS.table, execute: () => editor.chain().focus().insertTable({ rows: 3, cols: 6, withHeaderRow: true }).run() },
      { key: 'table8x4', label: 'Table 8×4', description: 'Extra wide table (8 cols)', keywords: ['table', 'extra', 'xl'], category: 'media', icon: SLASH_COMMAND_ICONS.table, execute: () => editor.chain().focus().insertTable({ rows: 4, cols: 8, withHeaderRow: true }).run() },
      { key: 'image', label: 'Image', description: 'Upload or link image', keywords: ['media', 'upload'], category: 'media', icon: SLASH_COMMAND_ICONS.image, execute: triggerImageUpload },
    ];

    if (mode === 'lite') return baseCommands;

    return [
      ...baseCommands,
      { key: 'calloutInfo', label: 'Callout (Info)', description: 'Informational note', keywords: ['callout', 'info'], category: 'advanced', icon: SLASH_COMMAND_ICONS.calloutInfo, execute: () => insertCallout('info') },
      { key: 'calloutWarn', label: 'Callout (Warn)', description: 'Warning notice', keywords: ['callout', 'warn'], category: 'advanced', icon: SLASH_COMMAND_ICONS.calloutWarn, execute: () => insertCallout('warn') },
      { key: 'calloutExample', label: 'Callout (Example)', description: 'Example highlight', keywords: ['callout', 'example'], category: 'advanced', icon: SLASH_COMMAND_ICONS.calloutExample, execute: () => insertCallout('example') },
      { key: 'calloutHint', label: 'Callout (Hint)', description: 'Helpful hint', keywords: ['callout', 'hint'], category: 'advanced', icon: SLASH_COMMAND_ICONS.calloutHint, execute: () => insertCallout('hint') },
      { key: 'citation', label: 'Citation', description: 'Academic reference', keywords: ['reference', 'bibliography'], category: 'advanced', icon: SLASH_COMMAND_ICONS.citation, execute: insertCitation },
      { key: 'footnote', label: 'Footnote', description: 'Reference note', keywords: ['reference', 'note'], category: 'advanced', icon: SLASH_COMMAND_ICONS.footnote, execute: insertFootnote },
      { key: 'numberedParagraph', label: 'Numbered Paragraph', description: 'Legal numbering style', keywords: ['law', 'legal', 'numbering'], category: 'advanced', icon: SLASH_COMMAND_ICONS.numberedParagraph, execute: insertNumberedParagraph },
      { key: 'testCase', label: 'TestCase', description: 'Input/output evaluator', keywords: ['stem', 'programming', 'grading'], category: 'advanced', icon: SLASH_COMMAND_ICONS.testCase, execute: insertTestCase },
      { key: 'youtube', label: 'YouTube Embed', description: 'Embedded video', keywords: ['video', 'embed', 'youtube'], category: 'media', icon: SLASH_COMMAND_ICONS.youtube, execute: () => insertEmbed('youtube') },
      { key: 'pdf', label: 'PDF Embed', description: 'Embedded document', keywords: ['pdf', 'embed'], category: 'media', icon: SLASH_COMMAND_ICONS.pdf, execute: () => insertEmbed('pdf') },
      { key: 'mermaid', label: 'Mermaid Diagram', description: 'Diagram as code', keywords: ['diagram', 'flowchart', 'mermaid'], category: 'code', icon: SLASH_COMMAND_ICONS.mermaid, execute: insertMermaid },
      { key: 'interactiveWidget', label: 'Interactive Widget', description: 'AI-generated interactive element', keywords: ['widget', 'interactive', 'simulation', 'ai', 'html'], category: 'advanced', icon: SLASH_COMMAND_ICONS.interactiveWidget, execute: insertInteractiveWidget },
    ];
  }, [editor, mode, readOnly]);

  const blockActions = useMemo<BlockAction[]>(() => {
    if (!editor || readOnly) return [];

    const actions: BlockAction[] = [
      { key: 'paragraph', label: 'Paragraph', hint: 'Basic text block', execute: () => editor.chain().focus().setParagraph().run() },
      { key: 'heading1', label: 'Heading 1', hint: 'Primary section title', execute: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+1' : undefined },
      { key: 'heading2', label: 'Heading 2', hint: 'Secondary section title', execute: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+2' : undefined },
      { key: 'heading3', label: 'Heading 3', hint: 'Tertiary section title', execute: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { key: 'bulletList', label: 'Bulleted List', hint: 'Unordered list', execute: () => editor.chain().focus().toggleBulletList().run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+8' : undefined },
      { key: 'orderedList', label: 'Numbered List', hint: 'Ordered list', execute: () => editor.chain().focus().toggleOrderedList().run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+7' : undefined },
      { key: 'taskList', label: 'Checklist', hint: 'Trackable items', execute: () => editor.chain().focus().toggleTaskList().run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+X' : undefined },
      { key: 'quote', label: 'Quote', hint: 'Quote block', execute: () => editor.chain().focus().toggleBlockquote().run(), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+Q' : undefined },
      { key: 'codeBlock', label: 'Code Block', hint: 'Formatted code', execute: insertCodeBlock },
      { key: 'table', label: 'Table 3×3', hint: 'Small table', execute: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { key: 'table4x4', label: 'Table 4×4', hint: 'Medium table', execute: () => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
      { key: 'table5x5', label: 'Table 5×5', hint: 'Large table', execute: () => editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run() },
      { key: 'tableBig', label: 'Table 8×4', hint: 'Extra wide', execute: () => editor.chain().focus().insertTable({ rows: 4, cols: 8, withHeaderRow: true }).run() },
      { key: 'image', label: isUploading ? 'Uploading...' : 'Image', hint: 'Upload image media', execute: triggerImageUpload },
      { key: 'mathInline', label: 'Inline Math', hint: 'LaTeX inline formula', execute: insertInlineMath },
      { key: 'mathBlock', label: 'Math Block', hint: 'LaTeX equation block', execute: insertMathBlock },
      { key: 'duplicate', label: 'Duplicate Block', hint: 'Copy current block below', execute: duplicateCurrentBlock, shortcut: hotkeysProfile === 'extended' ? 'Alt+D' : undefined },
    ];

    if (mode === 'full') {
      actions.push(
        { key: 'calloutInfo', label: 'Callout', hint: 'Highlighted note block', execute: () => insertCallout('info') },
        { key: 'citation', label: 'Citation', hint: 'Academic citation', execute: insertCitation },
        { key: 'footnote', label: 'Footnote', hint: 'Reference note', execute: insertFootnote },
        { key: 'numberedParagraph', label: 'Numbered Paragraph', hint: 'Legal numbering style', execute: insertNumberedParagraph },
        { key: 'testCase', label: 'TestCase', hint: 'Input/output evaluator', execute: insertTestCase },
        { key: 'youtube', label: 'YouTube Embed', hint: 'Embedded YouTube video', execute: () => insertEmbed('youtube') },
        { key: 'pdf', label: 'PDF Embed', hint: 'Embedded PDF document', execute: () => insertEmbed('pdf') },
        { key: 'mermaid', label: 'Mermaid Diagram', hint: 'Diagram as code', execute: insertMermaid },
        { key: 'interactiveWidget', label: 'Interactive Widget', hint: 'AI-generated interactive element', execute: insertInteractiveWidget },
      );
    }

    return actions;
  }, [editor, hotkeysProfile, isUploading, mode, readOnly]);

  const headingOutline = useMemo(() => {
    const list: Array<{ text: string; level: number }> = [];
    const walk = (nodes: CanonicalNode[] | undefined) => {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.type === 'heading') {
          const level = typeof node.attrs?.level === 'number' ? node.attrs.level : Number(node.attrs?.level || 1);
          const text = node.content?.filter((child) => child.type === 'text' && child.text).map((child) => child.text).join(' ').trim() || `Heading ${list.length + 1}`;
          list.push({ text, level: Number.isFinite(level) ? Math.max(1, Math.min(level, 6)) : 1 });
        }
        if (node.content?.length) walk(node.content);
      }
    };
    walk(value.content);
    return list;
  }, [value.content]);

  const assetStats = useMemo(() => {
    let images = 0, embeds = 0, tables = 0, codeBlocks = 0;
    const walk = (nodes: CanonicalNode[] | undefined) => {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.type === 'image') images += 1;
        if (node.type === 'embed') embeds += 1;
        if (node.type === 'table') tables += 1;
        if (node.type === 'codeBlock') codeBlocks += 1;
        if (node.content?.length) walk(node.content);
      }
    };
    walk(value.content);
    return { images, embeds, tables, codeBlocks };
  }, [value.content]);

  const runSlashCommand = (command: SlashCommand) => {
    command.execute();
    setShowSlashCommands(false);
    setSlashQuery('');
  };

  const setLinkFromSelection = useCallback(() => {
    if (!editor || readOnly) return;
    const currentHref = editor.getAttributes('link')?.href as string | undefined;
    const nextHref = window.prompt('Link URL', currentHref || 'https://');
    if (nextHref === null) return;
    if (!nextHref.trim()) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: nextHref.trim(), target: '_blank', rel: 'noopener noreferrer' }).run();
  }, [editor, readOnly]);

  const executeSidebarBlockAction = useCallback((execute: () => void) => {
    execute();
    if (mobileToolsDrawer) setIsMobileToolsOpen(false);
  }, [mobileToolsDrawer]);

  const textStyleActions = useMemo<TextStyleAction[]>(() => {
    if (!editor || readOnly) return [];
    return [
      { key: 'bold', label: 'Bold', execute: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold'), shortcut: 'Cmd/Ctrl+B' },
      { key: 'italic', label: 'Italic', execute: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic'), shortcut: 'Cmd/Ctrl+I' },
      { key: 'h1', label: 'H1', execute: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }), shortcut: hotkeysProfile === 'extended' ? 'Alt+1' : undefined },
      { key: 'h2', label: 'H2', execute: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }), shortcut: hotkeysProfile === 'extended' ? 'Alt+2' : undefined },
      { key: 'link', label: 'Link', execute: setLinkFromSelection, isActive: editor.isActive('link'), shortcut: 'Cmd/Ctrl+K' },
      { key: 'list', label: 'List', execute: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList'), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+8' : undefined },
      { key: 'quote', label: 'Quote', execute: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote'), shortcut: hotkeysProfile === 'extended' ? 'Alt+Shift+Q' : undefined },
    ];
  }, [editor, hotkeysProfile, readOnly, setLinkFromSelection]);

  // ── Render ──

  if (!editor) {
    return <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border-default)' }}>Loading editor...</div>;
  }

  const sidebarProps = {
    editor,
    showTabs: showSidebarTabs,
    sidebarTab,
    onTabChange: setSidebarTab,
    blockActions,
    textStyleActions,
    headingOutline,
    assetStats,
    historyEvents,
    isUploading,
    onTriggerImageUpload: triggerImageUpload,
    onExecuteBlockAction: executeSidebarBlockAction,
    collapsed: sidebarCollapsed,
    onToggleCollapse: () => setSidebarCollapsed((prev: boolean) => !prev),
  };

  return (
    <div className="editor-root">
      {!readOnly && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(event) => { void handleImageUpload(event); }}
        />
      )}

      <div className={readOnly ? 'min-w-0' : `editor-layout ${sidebarCollapsed ? 'editor-layout-collapsed' : ''}`}>
        {!readOnly && (
          <aside className={`editor-aside ${mobileToolsDrawer ? 'hidden md:flex' : 'flex'}`}>
            <EditorSidebar {...sidebarProps} />
          </aside>
        )}

        <section className="editor-main">
          {!readOnly && (
            <div className="editor-topbar">
              <div className="flex items-center gap-2">
                {mobileToolsDrawer && (
                  <button
                    type="button"
                    className="editor-tools-button md:hidden"
                    onClick={() => setIsMobileToolsOpen(true)}
                  >
                    Tools
                  </button>
                )}
                <span style={{ color: 'var(--text-muted)' }}>Type <kbd className="editor-kbd">/</kbd> for command palette</span>
              </div>
              <span style={{ color: 'var(--text-faint)' }}>
                {lastAutoSavedAt ? `Autosaved at ${lastAutoSavedAt}` : 'Draft autosave enabled'}
              </span>
            </div>
          )}

          {showSlashCommands && !readOnly && (
            <div className="m-3">
              <SlashCommandPalette
                commands={slashCommands}
                query={slashQuery}
                onQueryChange={setSlashQuery}
                onExecute={runSlashCommand}
                onClose={() => setShowSlashCommands(false)}
              />
            </div>
          )}

          {!readOnly && (
            <EditorBubbleToolbar
              editor={editor}
              hotkeysProfile={hotkeysProfile}
              onLinkClick={setLinkFromSelection}
            />
          )}

          <div className={readOnly ? 'p-2' : 'p-3'}>
            <EditorContent editor={editor} />
          </div>
        </section>
      </div>

      {!readOnly && mobileToolsDrawer && (
        <MobileToolsDrawer
          isOpen={isMobileToolsOpen}
          onClose={() => setIsMobileToolsOpen(false)}
        >
          <EditorSidebar {...sidebarProps} />
        </MobileToolsDrawer>
      )}

      <CitationModal isOpen={showCitationModal} onClose={() => setShowCitationModal(false)} onInsert={handleCitationInsert} />
      <TestCaseModal isOpen={showTestCaseModal} onClose={() => setShowTestCaseModal(false)} onInsert={handleTestCaseInsert} />
      <MathInputModal isOpen={!!showMathModal} onClose={() => setShowMathModal(false)} onInsert={handleMathInsert} displayMode={showMathModal === 'block'} title={showMathModal === 'block' ? 'Insert Math Block' : 'Insert Inline Math'} />
      <EmbedModal isOpen={!!showEmbedModal} onClose={() => setShowEmbedModal(false)} onInsert={handleEmbedInsert} defaultProvider={showEmbedModal || 'youtube'} />
      <CodeBlockModal isOpen={showCodeBlockModal} onClose={() => setShowCodeBlockModal(false)} onInsert={handleCodeBlockInsert} />
      <FootnoteModal isOpen={showFootnoteModal} onClose={() => setShowFootnoteModal(false)} onInsert={handleFootnoteInsert} />
    </div>
  );
};
