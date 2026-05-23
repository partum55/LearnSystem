'use client';

import React, { useState, useEffect } from 'react';
import type { LearningItemDto, LearningItemRequest, LearningItemType } from '../api/canonical.types';
import { Modal, Input, Button } from '@/components';

interface LearningItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: LearningItemRequest) => Promise<void>;
  initialData?: LearningItemDto | null;
  loading: boolean;
}

const LEARNING_ITEM_TYPES: Array<{ value: LearningItemType; label: string }> = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'link', label: 'External Link' },
  { value: 'video', label: 'Video Lecture' },
  { value: 'file', label: 'Downloadable File' },
  { value: 'rte', label: 'Rich Text Article' },
  { value: 'lesson', label: 'Interactive Lesson' },
];

export function LearningItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}: LearningItemFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'link' as LearningItemType,
    order: 1,
    url: '',
    textContent: '',
    downloadable: true,
    visible: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        type: initialData.type || 'link',
        order: initialData.order || 1,
        url: (initialData.settings?.url as string) || '',
        textContent: (initialData.settings?.textContent as string) || '',
        downloadable: initialData.settings?.downloadable !== false,
        visible: initialData.visibilityStatus !== 'HIDDEN',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'link',
        order: 1,
        url: '',
        textContent: '',
        downloadable: true,
        visible: true,
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (['link', 'video', 'pdf', 'file'].includes(formData.type) && !formData.url.trim()) {
      setError(`URL/Link is required for ${formData.type.toUpperCase()} items.`);
      return;
    }

    try {
      const payload: LearningItemRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        order: Number(formData.order),
        visible: formData.visible,
        // Match canonical backend structure where type-specific fields are flattened or nested
        url: ['link', 'video', 'pdf', 'file'].includes(formData.type) ? formData.url.trim() : undefined,
        textContent: formData.type === 'rte' ? formData.textContent.trim() : undefined,
        downloadable: ['pdf', 'file'].includes(formData.type) ? formData.downloadable : undefined,
      };
      
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred while saving the learning item.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Learning Material' : 'Create Learning Material'}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-md p-4"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--fn-error)' }}>
              {error}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="item-type" className="label block mb-1 font-semibold text-sm">
            Material Type
          </label>
          <select
            id="item-type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={loading || Boolean(initialData)}
            className="input w-full"
          >
            {LEARNING_ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {initialData && (
            <p className="text-xs text-[var(--text-faint)] mt-1">
              Type cannot be changed after creation.
            </p>
          )}
        </div>

        <Input
          label="Material Title *"
          id="title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Lecture Slide Deck"
          required
          disabled={loading}
        />

        <div>
          <label htmlFor="description" className="label block mb-1 font-semibold text-sm">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input w-full"
            placeholder="Brief description of this learning resource..."
            disabled={loading}
          />
        </div>

        {['link', 'video', 'pdf', 'file'].includes(formData.type) && (
          <Input
            label="Resource URL / Link *"
            id="url"
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com/resource"
            required
            disabled={loading}
          />
        )}

        {formData.type === 'rte' && (
          <div>
            <label htmlFor="textContent" className="label block mb-1 font-semibold text-sm">
              Article Body Content (Markdown/Text)
            </label>
            <textarea
              id="textContent"
              name="textContent"
              value={formData.textContent}
              onChange={handleChange}
              rows={6}
              className="input w-full font-mono text-sm"
              placeholder="# Introduction..."
              disabled={loading}
            />
          </div>
        )}

        {['pdf', 'file'].includes(formData.type) && (
          <div className="flex items-center">
            <input
              type="checkbox"
              name="downloadable"
              id="downloadable"
              checked={formData.downloadable}
              onChange={handleChange}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--text-primary)' }}
              disabled={loading}
            />
            <label
              htmlFor="downloadable"
              className="ml-2 block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Allow student download
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Order Index"
            id="order"
            type="number"
            name="order"
            value={formData.order}
            onChange={handleChange}
            min={1}
            placeholder="1"
            disabled={loading}
          />

          <div className="flex items-end pb-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="visible"
                id="visible"
                checked={formData.visible}
                onChange={handleChange}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--text-primary)' }}
                disabled={loading}
              />
              <label
                htmlFor="visible"
                className="ml-2 block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Make visible
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {initialData ? 'Save Changes' : 'Create Material'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
