'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LearningItemDto, LearningItemRequest, LearningItemType } from '../api/canonical.types';
import { Modal, Input, Button } from '@/components';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
import { AiGenerationPreview } from '@/features/ai/components/AiGenerationPreview';
import { AiErrorDisplay } from '@/features/ai/components/AiErrorDisplay';
import { normalizeRichContentDocument } from '@/features/rich-content/normalizeRichContent';
import { extractErrorMessage } from '@/api/client';

interface LearningItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: LearningItemRequest) => Promise<void>;
  onCreateEditorItem?: (request: LearningItemRequest) => Promise<string>;
  courseId?: string;
  initialData?: LearningItemDto | null;
  loading: boolean;
}

type SimpleType = 'PDF' | 'LINK' | 'VIDEO' | 'FILE';
type EditorType = 'RTE' | 'LESSON';
type AnyType = SimpleType | EditorType;

const TYPE_CARDS: Array<{
  value: AnyType;
  icon: string;
  label: string;
  description: string;
  group: 'simple' | 'editor';
}> = [
  { value: 'LINK', icon: '🔗', label: 'Link', description: 'External URL', group: 'simple' },
  { value: 'VIDEO', icon: '▶', label: 'Video', description: 'Video stream', group: 'simple' },
  { value: 'PDF', icon: '📄', label: 'PDF', description: 'PDF document', group: 'simple' },
  { value: 'FILE', icon: '📁', label: 'File', description: 'Downloadable', group: 'simple' },
  { value: 'RTE', icon: '✦', label: 'Article', description: 'Rich text page', group: 'editor' },
  { value: 'LESSON', icon: '⬡', label: 'Lesson', description: 'Step-by-step lesson', group: 'editor' },
];

export function LearningItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  onCreateEditorItem,
  courseId,
  initialData,
  loading,
}: LearningItemFormModalProps) {
  const router = useRouter();

  const [type, setType] = useState<AnyType>('LINK');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [downloadable, setDownloadable] = useState(true);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const aiTask = useAiTask<{ title: string; contentJson: unknown }>();
  const resetAiTask = aiTask.reset;

  const isEditorType = type === 'RTE' || type === 'LESSON';
  const needsUrl = ['LINK', 'VIDEO', 'PDF', 'FILE'].includes(type);
  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setType((initialData.type?.toUpperCase() as AnyType) || 'LINK');
      setTitle(initialData.title || '');
      setUrl((initialData.settings?.url as string) || '');
      setDownloadable(initialData.settings?.downloadable !== false);
      setVisible(initialData.visibilityStatus !== 'HIDDEN');
    } else {
      setType('LINK');
      setTitle('');
      setUrl('');
      setDownloadable(true);
      setVisible(true);
    }
    setError(null);
    setRedirecting(false);
    setShowAiPanel(false);
    setAiPrompt('');
    resetAiTask();
  }, [initialData, isOpen, resetAiTask]);

  const buildRteTextContent = () => {
    if (type !== 'RTE') return undefined;

    if (aiTask.data?.output) {
      return JSON.stringify(normalizeRichContentDocument(aiTask.data.output.contentJson));
    }

    return isEditing ? undefined : JSON.stringify(normalizeRichContentDocument(undefined));
  };

  const buildPayload = (): LearningItemRequest => ({
    title: title.trim(),
    type: type as LearningItemType,
    visible,
    url: needsUrl ? url.trim() : undefined,
    downloadable: ['PDF', 'FILE'].includes(type) ? downloadable : undefined,
    textContent: buildRteTextContent(),
  });

  const buildAiDraftPayload = (): LearningItemRequest | null => {
    const output = aiTask.data?.output;
    if (!output) return null;

    return {
      title: output.title?.trim() || 'AI Generated Document',
      type: 'RTE',
      visible: false,
      textContent: JSON.stringify(normalizeRichContentDocument(output.contentJson)),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Title is required.'); return; }
    if (needsUrl && !url.trim()) { setError(`URL is required for ${type.toUpperCase()}.`); return; }

    try {
      if (isEditorType && !isEditing && onCreateEditorItem) {
        setRedirecting(true);
        const newId = await onCreateEditorItem(buildPayload());
        onClose();
        router.push(`/learning-items/${newId}${courseId ? `?courseId=${courseId}` : ''}`);
        return;
      }

      await onSubmit(buildPayload());
      onClose();
    } catch (err: unknown) {
      setRedirecting(false);
      setError(extractErrorMessage(err) || 'Failed to save material.');
    }
  };

  const submitLabel = () => {
    if (redirecting) return 'Opening editor…';
    if (loading) return isEditing ? 'Saving…' : 'Creating…';
    if (isEditorType && !isEditing) return 'Create & Open Editor →';
    return isEditing ? 'Save Changes' : 'Create';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Learning Material' : 'Add Learning Material'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        {!isEditing && (
          <div className="space-y-3">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAiPanel((current) => !current)}>
              Generate material with AI
            </button>
            {showAiPanel && (
              <AiFeatureGate compact>
                <div className="rounded-lg border p-3 bg-[var(--bg-base)]">
                  <AiErrorDisplay error={aiTask.error} />
                  {!aiTask.data ? (
                    <>
                      <label className="input-group mb-3">
                        <span className="label">Topic or instructions for AI</span>
                        <input
                          className="input text-xs"
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          placeholder="e.g. Explain binary search trees"
                          disabled={aiTask.isLoading}
                        />
                      </label>
                      <button 
                        type="button"
                        className="btn btn-primary btn-sm" 
                        onClick={async () => {
                          if (!aiPrompt) return;
                          await aiTask.executeTask({
                            type: 'GENERATE_RTE_MATERIAL',
                            context: courseId ? { courseId } : undefined,
                            input: { topic: aiPrompt }
                          });
                        }}
                        disabled={!aiPrompt || aiTask.isLoading}
                      >
                        {aiTask.isLoading ? 'Generating...' : 'Generate with AI'}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <AiGenerationPreview
                        data={aiTask.data.output}
                        isAccepting={loading || redirecting}
                        onAccept={async () => {
                          const payload = buildAiDraftPayload();
                          if (!payload || !onCreateEditorItem) return;
                          try {
                            setRedirecting(true);
                            const newId = await onCreateEditorItem(payload);
                            onClose();
                            router.push(`/learning-items/${newId}${courseId ? `?courseId=${courseId}` : ''}`);
                          } catch (err: unknown) {
                            setRedirecting(false);
                            setError(extractErrorMessage(err) || 'Failed to save AI material draft.');
                          }
                        }}
                        onReject={() => { aiTask.reset(); setAiPrompt(''); }}
                      />
                    </div>
                  )}
                </div>
              </AiFeatureGate>
            )}
          </div>
        )}

        {/* Type selector */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)', letterSpacing: '0.06em' }}>Type</p>
          <div className="grid grid-cols-6 gap-1.5">
            {TYPE_CARDS.map((card) => {
              const isSelected = type === card.value;
              const locked = isEditing;
              return (
                <button
                  key={card.value}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setType(card.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '4px', padding: '8px 4px',
                    border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px', cursor: locked ? 'default' : 'pointer',
                    background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    transition: 'all 120ms',
                    opacity: locked && !isSelected ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{card.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? 'var(--text-primary)' : 'var(--text-faint)', letterSpacing: '0.02em' }}>
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
          {isEditing && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>Type cannot be changed after creation.</p>
          )}
        </div>

        {/* Editor type hint */}
        {isEditorType && !isEditing && (
          <div>
            <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '14px', marginTop: '1px' }}>*</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {type === 'RTE'
                  ? 'A full-page document editor will open after creation.'
                  : 'A page-based lesson builder will open after creation.'}
              </p>
            </div>
          </div>
        )}

        {/* Title */}
        <Input
          label="Title *"
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'RTE' ? 'e.g. Introduction to Recursion' : type === 'LESSON' ? 'e.g. Week 3: Sorting Algorithms' : 'e.g. Lecture Slides'}
          required
          disabled={loading || redirecting}
        />

        {/* URL field (simple types only) */}
        {needsUrl && (
          <Input
            label="URL *"
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            required
            disabled={loading || redirecting}
          />
        )}

        {/* Downloadable (PDF/file) */}
        {['PDF', 'FILE'].includes(type) && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={downloadable}
              onChange={(e) => setDownloadable(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--text-primary)' }}
              disabled={loading || redirecting}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Allow student download</span>
          </label>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="h-4 w-4 rounded"
            style={{ accentColor: 'var(--text-primary)' }}
            disabled={loading || redirecting}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Visible</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading || redirecting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading || redirecting}>
            {submitLabel()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
