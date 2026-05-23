'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
}

// Initialise mermaid in the browser environment
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
  });
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !code.trim()) return;

    let isMounted = true;
    setError(null);

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        
        // Parse and validate code syntactically
        try {
          await mermaid.parse(code);
        } catch (err: any) {
          if (isMounted) {
            setError(err?.message || 'Mermaid syntax error.');
            return;
          }
        }

        const { svg: renderedSvg } = await mermaid.render(id, code);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Mermaid rendering error.');
        }
      }
    };

    void renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="p-4 border rounded-xl font-mono text-xs" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--fn-error)' }}>
        <p className="font-bold mb-2">Mermaid Render Warning:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center overflow-x-auto bg-[var(--bg-base)] p-5 rounded-xl border border-[var(--border-subtle)]"
      dangerouslySetInnerHTML={{ __html: svg || '<span class="text-xs text-[var(--text-faint)] italic">Processing Mermaid diagram...</span>' }}
    />
  );
}
