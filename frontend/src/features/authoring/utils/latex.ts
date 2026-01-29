import DOMPurify from 'dompurify';

export interface LatexRenderOptions {
  displayMode?: boolean;
}

type KatexRenderer = {
  renderToString: (value: string, options?: Record<string, unknown>) => string;
};

declare global {
  interface Window {
    katex?: KatexRenderer;
  }
}

const DELIMITER_PATTERN = /\$\$|\$/g;

export const validateLatex = (value: string) => {
  const issues: string[] = [];
  const delimiters = value.match(DELIMITER_PATTERN) ?? [];
  const inlineCount = delimiters.filter((item) => item === '$').length;
  const blockCount = delimiters.filter((item) => item === '$$').length;

  if (inlineCount % 2 !== 0) {
    issues.push('Inline LaTeX delimiter ($) is unbalanced.');
  }

  if (blockCount % 2 !== 0) {
    issues.push('Block LaTeX delimiter ($$) is unbalanced.');
  }

  if (value.includes('\\begin') && !value.includes('\\end')) {
    issues.push('LaTeX environment is missing a matching \\end.');
  }

  return issues;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const renderLatexToHtml = (value: string, options: LatexRenderOptions = {}) => {
  if (options.displayMode) {
    const html = typeof window !== 'undefined' && window.katex?.renderToString
      ? window.katex.renderToString(value, { displayMode: true, throwOnError: false })
      : `<div class="latex-block">${escapeHtml(value)}</div>`;
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }

  const renderWithKatex = (latex: string, displayMode: boolean) => {
    if (typeof window !== 'undefined' && window.katex?.renderToString) {
      return window.katex.renderToString(latex, { displayMode, throwOnError: false });
    }
    return `<span class="latex-fallback">${escapeHtml(latex)}</span>`;
  };

  let html = escapeHtml(value);

  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    return `<div class="latex-block">${renderWithKatex(latex, true)}</div>`;
  });

  html = html.replace(/\$([^$]+)\$/g, (_, latex) => {
    return `<span class="latex-inline">${renderWithKatex(latex, false)}</span>`;
  });

  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return clean;
};
