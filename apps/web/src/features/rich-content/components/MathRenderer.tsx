'use client';

import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  code: string;
  block?: boolean;
}

export function MathRenderer({ code, block = true }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;
    try {
      setError(null);
      const html = katex.renderToString(code, {
        displayMode: block,
        throwOnError: true,
      });
      containerRef.current.innerHTML = html;
    } catch (err: any) {
      setError(err?.message || 'KaTeX parsing error.');
    }
  }, [code, block]);

  if (error) {
    return (
      <div className="p-3 border rounded-xl font-mono text-xs" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--fn-error)' }}>
        <p className="font-bold mb-1">LaTeX Format Error:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={block ? "overflow-x-auto py-5 text-center my-2 select-all bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)]" : "inline-block px-1"}
    />
  );
}
