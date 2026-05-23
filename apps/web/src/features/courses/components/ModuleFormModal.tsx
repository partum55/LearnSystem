'use client';

import React, { useState, useEffect } from 'react';
import type { CourseModuleDto, ModuleRequest } from '../api/canonical.types';
import { Modal, Input, Button } from '@/components';

interface ModuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ModuleRequest) => Promise<void>;
  initialData?: CourseModuleDto | null;
  loading: boolean;
}

export function ModuleFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}: ModuleFormModalProps) {
  const [formData, setFormData] = useState<Required<ModuleRequest>>({
    title: '',
    description: '',
    order: 1,
    visible: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        order: initialData.order || 1,
        visible: initialData.availabilityStatus !== 'HIDDEN',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        order: 1,
        visible: true,
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        order: Number(formData.order),
        visible: formData.visible,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred while saving the module.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Module' : 'Create Module'}>
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

        <Input
          label="Module Title *"
          id="title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Introduction to Programming"
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
            rows={4}
            className="input w-full"
            placeholder="Provide a brief summary of the module content..."
            disabled={loading}
          />
        </div>

        <Input
          label="Order Position"
          id="order"
          type="number"
          name="order"
          value={formData.order}
          onChange={handleChange}
          min={1}
          placeholder="1"
          disabled={loading}
        />

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
            Make visible immediately
          </label>
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
            {initialData ? 'Save Changes' : 'Create Module'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
