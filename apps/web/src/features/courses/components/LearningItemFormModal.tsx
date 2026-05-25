'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LearningItemDto, LearningItemRequest, LearningItemType } from '../api/canonical.types';
import { Modal, Input, Button } from '@/components';

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
  const [order, setOrder] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

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
      setOrder(initialData.order || 1);
    } else {
      setType('LINK');
      setTitle('');
      setUrl('');
      setDownloadable(true);
      setVisible(true);
      setOrder(1);
    }
    setError(null);
    setRedirecting(false);
  }, [initialData, isOpen]);

  const buildPayload = (): LearningItemRequest => ({
    title: title.trim(),
    type: type as LearningItemType,
    order: Number(order),
    visible,
    url: needsUrl ? url.trim() : undefined,
    downloadable: ['PDF', 'FILE'].includes(type) ? downloadable : undefined,
  });

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
    } catch (err: any) {
      setRedirecting(false);
      setError(err?.message || err?.response?.data?.message || 'Failed to save material.');
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
          <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '14px', marginTop: '1px' }}>✦</span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {type === 'RTE'
                ? 'A full-page document editor will open after creation.'
                : 'A page-based lesson builder will open after creation.'}
            </p>
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

        {/* Order + Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Order"
            id="order"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            min={1}
            disabled={loading || redirecting}
          />
          <div className="flex items-end pb-1">
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
          </div>
        </div>

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
