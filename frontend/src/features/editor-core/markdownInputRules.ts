import { Extension, InputRule } from '@tiptap/core';

/**
 * Custom markdown-style input rules for BlockEditor custom nodes.
 * StarterKit already handles: headings, lists, blockquote, code block, bold, italic, strike, etc.
 * This extension adds shortcuts for: inline math, math block, callouts, and mermaid diagrams.
 */
export const MarkdownInputRules = Extension.create({
  name: 'markdownInputRules',

  addInputRules() {
    const rules: InputRule[] = [];

    // ── Inline math: $content$ ──
    // Matches $...$ but NOT $$, and requires non-space content.
    // Lookbehind ensures we don't match currency like $50.
    if (this.editor.schema.nodes.mathInline) {
      rules.push(
        new InputRule({
          find: /(?:^|[^$])(\$([^$\s][^$]*[^$\s]|[^$\s])\$)$/,
          handler: ({ state, range, match }) => {
            const latex = match[2];
            if (!latex) return null;

            // Adjust range: the full match may include the char before $
            const fullMatchStart = range.from;
            const dollarStart = fullMatchStart + match[0].indexOf(match[1]);
            const dollarEnd = range.to;

            const node = this.editor.schema.nodes.mathInline.create({ latex });
            state.tr.replaceWith(dollarStart, dollarEnd, node);
          },
        }),
      );
    }

    // ── Math block: $$content$$ on its own line ──
    if (this.editor.schema.nodes.mathBlock) {
      rules.push(
        new InputRule({
          find: /^\$\$([^$]+)\$\$$/,
          handler: ({ state, range, match }) => {
            const latex = match[1];
            if (!latex) return null;

            const node = this.editor.schema.nodes.mathBlock.create({ latex });
            state.tr.replaceWith(range.from, range.to, node);
          },
        }),
      );
    }

    // ── Callout: :::variant  ──
    // Typing ":::info ", ":::warn ", ":::hint ", or ":::example " at start of line
    if (this.editor.schema.nodes.callout) {
      rules.push(
        new InputRule({
          find: /^:::(info|warn|hint|example)\s$/,
          handler: ({ state, range, match }) => {
            const variant = match[1] as 'info' | 'warn' | 'hint' | 'example';
            const node = this.editor.schema.nodes.callout.create(
              { variant },
              this.editor.schema.text(''),
            );
            state.tr.replaceWith(range.from, range.to, node);
          },
        }),
      );
    }

    // ── Mermaid: ```mermaid at start of line ──
    // Must be registered BEFORE CodeBlockLowlight so it matches first.
    if (this.editor.schema.nodes.mermaid) {
      rules.push(
        new InputRule({
          find: /^```mermaid[\s\n]$/,
          handler: ({ state, range }) => {
            const node = this.editor.schema.nodes.mermaid.create({
              code: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[Done]',
            });
            state.tr.replaceWith(range.from, range.to, node);
          },
        }),
      );
    }

    // ── Markdown link: [text](url) ──
    if (this.editor.schema.marks.link) {
      rules.push(
        new InputRule({
          find: /\[([^\]]+)\]\(([^)]+)\)$/,
          handler: ({ state, range, match }) => {
            const text = match[1];
            const href = match[2];
            if (!text || !href) return null;

            const linkMark = this.editor.schema.marks.link.create({
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
            });
            const textNode = this.editor.schema.text(text, [linkMark]);
            state.tr.replaceWith(range.from, range.to, textNode);
          },
        }),
      );
    }

    return rules;
  },
});
