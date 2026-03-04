import mermaid from 'mermaid';

let mermaidInitialized = false;

export const ensureMermaidInitialized = (): void => {
  if (mermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    suppressErrorRendering: true,
  });

  mermaidInitialized = true;
};
