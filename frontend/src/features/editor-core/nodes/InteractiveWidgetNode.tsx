import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../../api/ai';
import {
  clampWidgetIframeHeight,
  withWidgetAutoResize,
  WIDGET_IFRAME_DEFAULT_HEIGHT,
} from '../widgetIframe';

// ── Interactive Widget View (Editor) ──

const InteractiveWidgetView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [emptyMode, setEmptyMode] = useState<'prompt' | 'code'>('prompt');
  const [directCode, setDirectCode] = useState('');
  const [iframeHeight, setIframeHeight] = useState(WIDGET_IFRAME_DEFAULT_HEIGHT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isEditable = editor.isEditable;

  const code = String(node.attrs.code || '');
  const title = String(node.attrs.title || '');
  const conversationHistory: Array<{ role: string; content: string }> = (() => {
    try {
      const raw = node.attrs.conversationHistory;
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  })();
  const widgetSrcDoc = useMemo(() => withWidgetAutoResize(code), [code]);

  // Listen for resize messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === 'resize' &&
        typeof event.data.height === 'number'
      ) {
        setIframeHeight(clampWidgetIframeHeight(event.data.height));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    setIframeHeight(WIDGET_IFRAME_DEFAULT_HEIGHT);
  }, [code]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.generateWidget({
        prompt: prompt.trim(),
        existingCode: code || undefined,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      });

      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: prompt.trim() },
        { role: 'assistant', content: result.summary || 'Generated widget' },
      ];

      updateAttributes({
        code: result.html,
        prompt: prompt.trim(),
        title: title || result.summary || prompt.trim().slice(0, 60),
        conversationHistory: JSON.stringify(newHistory),
      });
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [prompt, code, conversationHistory, title, updateAttributes]);

  const handleCodeSave = useCallback(() => {
    updateAttributes({ code: codeDraft });
    setShowCode(false);
  }, [codeDraft, updateAttributes]);

  const handleDirectCodeCreate = useCallback(() => {
    if (!directCode.trim()) return;
    updateAttributes({ code: directCode, title: t('interactiveWidget.manualWidget') });
  }, [directCode, updateAttributes, t]);

  // Empty state — show prompt input or code editor
  if (!code && isEditable) {
    return (
      <NodeViewWrapper className="editor-interactive-widget">
        <div className="editor-widget-empty">
          <div className="editor-widget-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div className="editor-widget-empty-label">{t('interactiveWidget.title')}</div>

          <div className="editor-widget-mode-toggle">
            <button
              type="button"
              className={`editor-widget-mode-btn ${emptyMode === 'prompt' ? 'editor-widget-mode-active' : ''}`}
              onClick={() => setEmptyMode('prompt')}
            >
              {t('interactiveWidget.aiPrompt')}
            </button>
            <button
              type="button"
              className={`editor-widget-mode-btn ${emptyMode === 'code' ? 'editor-widget-mode-active' : ''}`}
              onClick={() => setEmptyMode('code')}
            >
              {t('interactiveWidget.code')}
            </button>
          </div>

          {emptyMode === 'prompt' ? (
            <>
              <div className="editor-widget-empty-hint">{t('interactiveWidget.promptHint')}</div>
              <textarea
                className="editor-widget-prompt-input"
                placeholder={t('interactiveWidget.promptPlaceholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
                rows={3}
              />
              {error && <div className="editor-widget-error">{error}</div>}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={loading || !prompt.trim()}
                onClick={() => void handleGenerate()}
              >
                {loading ? t('interactiveWidget.generating') : t('interactiveWidget.generate')}
              </button>
            </>
          ) : (
            <>
              <div className="editor-widget-empty-hint">{t('interactiveWidget.codeHint')}</div>
              <textarea
                className="editor-widget-code-textarea"
                placeholder={t('interactiveWidget.codePlaceholder')}
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleDirectCodeCreate();
                  }
                }}
                rows={8}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!directCode.trim()}
                onClick={handleDirectCodeCreate}
              >
                {t('interactiveWidget.createWidget')}
              </button>
            </>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // Generated state
  return (
    <NodeViewWrapper className="editor-interactive-widget">
      {title && <div className="editor-widget-title">{title}</div>}

      {code && (
        <iframe
          ref={iframeRef}
          className="editor-widget-iframe"
          srcDoc={widgetSrcDoc}
          sandbox="allow-scripts"
          title={title || 'Interactive widget'}
          style={{ height: `${iframeHeight}px` }}
        />
      )}

      {isEditable && (
        <div className="editor-widget-toolbar">
          <div className="editor-widget-refine">
            <input
              type="text"
              className="editor-widget-refine-input"
              placeholder="Refine: describe changes..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-xs"
              disabled={loading || !prompt.trim()}
              onClick={() => void handleGenerate()}
            >
              {loading ? '...' : 'Refine'}
            </button>
          </div>
          <div className="editor-widget-actions">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setCodeDraft(code);
                setShowCode(!showCode);
              }}
            >
              {showCode ? 'Hide Code' : 'Edit Code'}
            </button>
          </div>
          {error && <div className="editor-widget-error">{error}</div>}
        </div>
      )}

      {showCode && isEditable && (
        <div className="editor-widget-code-editor">
          <textarea
            className="editor-widget-code-textarea"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            rows={12}
          />
          <div className="editor-widget-code-actions">
            <button type="button" className="btn btn-primary btn-xs" onClick={handleCodeSave}>
              Save Code
            </button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowCode(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// ── TipTap Node Definition ──

export const InteractiveWidgetNode = Node.create({
  name: 'interactiveWidget',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: '' },
      prompt: { default: '' },
      title: { default: '' },
      conversationHistory: { default: '[]' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="interactive-widget"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'interactive-widget',
        class: 'editor-interactive-widget',
      }),
      String(HTMLAttributes.title || 'Interactive Widget'),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InteractiveWidgetView);
  },
});
