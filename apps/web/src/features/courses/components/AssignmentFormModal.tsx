'use client';

import React, { useState, useEffect } from 'react';
import type { AssignmentDetailDto, AssignmentRequest } from '@/features/assignments/api/canonical.types';
import type { AssignmentType } from '@/features/courses/api/canonical.types';
import { Modal, Input, Button } from '@/components';

interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: AssignmentRequest) => Promise<void>;
  initialData?: (AssignmentDetailDto & { order?: number }) | null;
  loading: boolean;
}

const ASSIGNMENT_TYPES: Array<{ value: AssignmentType; label: string }> = [
  { value: 'FILE_SUBMISSION', label: 'File Submission' },
  { value: 'TEXT_SUBMISSION', label: 'Text/RTE Submission' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'FORM', label: 'Form Feedback' },
  { value: 'VPL', label: 'Virtual Programming Lab (VPL)' },
  { value: 'SEMINAR', label: 'Seminar Attendance' },
];

export function AssignmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}: AssignmentFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    maxPoints: 100,
    type: 'FILE_SUBMISSION' as AssignmentType,
    dueDate: '',
    visible: true,
    order: 1,

    // File submission settings
    allowedFileTypes: '.pdf,.zip,.doc,.docx,.png,.jpg',
    maxFiles: 1,
    maxFileSizeMb: 10,
    allowResubmission: true,

    // RTE settings
    minWords: 0,
    maxWords: 1000,

    // Quiz settings
    attemptLimit: 3,
    timeLimitMinutes: 60,

    // VPL settings
    vplLanguage: 'python',
    vplRuntime: 'python3',
    vplTemplateCode: '# Write your code here\n',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const initialDueDate = initialData.dueDate
        ? new Date(initialData.dueDate).toISOString().slice(0, 16)
        : '';

      const settings = initialData.settings || {};
      const rawType = initialData.type || 'FILE_SUBMISSION';
      // Normalize type to uppercase to match canonical enums
      const normalizedType = rawType.toUpperCase() as AssignmentType;

      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        instructions: initialData.instructions || '',
        maxPoints: initialData.maxPoints ?? 100,
        type: normalizedType,
        dueDate: initialDueDate,
        visible: initialData.visibilityStatus !== 'HIDDEN',
        order: initialData.order || 1,

        // Settings mapping
        allowedFileTypes: Array.isArray((settings as any).allowedFileTypes)
          ? ((settings as any).allowedFileTypes as string[]).join(',')
          : '.pdf,.zip,.doc,.docx,.png,.jpg',
        maxFiles: (settings as any).maxFiles ?? 1,
        maxFileSizeMb: (settings as any).maxFileSizeMb ?? 10,
        allowResubmission: (settings as any).allowResubmission !== false,

        minWords: (settings as any).minWords ?? 0,
        maxWords: (settings as any).maxWords ?? 1000,

        attemptLimit: (settings as any).attemptLimit ?? 3,
        timeLimitMinutes: (settings as any).timeLimitMinutes ?? 60,

        vplLanguage: (settings as any).language ?? 'python',
        vplRuntime: (settings as any).runtime ?? 'python3',
        vplTemplateCode: (settings as any).templateCode ?? '# Write your code here\n',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        instructions: '',
        maxPoints: 100,
        type: 'FILE_SUBMISSION',
        dueDate: '',
        visible: true,
        order: 1,
        allowedFileTypes: '.pdf,.zip,.doc,.docx,.png,.jpg',
        maxFiles: 1,
        maxFileSizeMb: 10,
        allowResubmission: true,
        minWords: 0,
        maxWords: 1000,
        attemptLimit: 3,
        timeLimitMinutes: 60,
        vplLanguage: 'python',
        vplRuntime: 'python3',
        vplTemplateCode: '# Write your code here\n',
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

    if (formData.maxPoints < 0) {
      setError('Maximum points cannot be negative');
      return;
    }

    try {
      const payload: AssignmentRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        instructions: formData.instructions.trim() || undefined,
        type: formData.type,
        maxPoints: Number(formData.maxPoints),
        order: Number(formData.order),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        visible: formData.visible,
      };

      // Set sub-settings matching dynamic assignment type (normalized to uppercase)
      const currentType = formData.type.toUpperCase();
      if (currentType === 'FILE_SUBMISSION') {
        payload.fileSettings = {
          allowedFileTypes: formData.allowedFileTypes.split(',').map((t) => t.trim()).filter(Boolean),
          maxFiles: Number(formData.maxFiles),
          maxFileSizeMb: Number(formData.maxFileSizeMb),
          allowResubmission: formData.allowResubmission,
        };
      } else if (currentType === 'TEXT_SUBMISSION' || currentType === 'RTE_SUBMISSION') {
        // Enforce canonical TEXT_SUBMISSION type on output
        payload.type = 'TEXT_SUBMISSION';
        payload.rteSettings = {
          minWords: Number(formData.minWords),
          maxWords: Number(formData.maxWords),
          allowResubmission: formData.allowResubmission,
        };
      } else if (currentType === 'QUIZ') {
        payload.quizSettings = {
          attemptLimit: Number(formData.attemptLimit),
          timeLimitMinutes: Number(formData.timeLimitMinutes),
        };
      } else if (currentType === 'VPL') {
        payload.vplSettings = {
          language: formData.vplLanguage,
          runtime: formData.vplRuntime,
          templateCode: formData.vplTemplateCode,
        };
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred while saving the assignment.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Assignment' : 'Create Assignment'}>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="assignment-type" className="label block mb-1 font-semibold text-sm">
              Assignment Type
            </label>
            <select
              id="assignment-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={loading || Boolean(initialData)}
              className="input w-full"
            >
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {initialData && (
              <p className="text-xs text-[var(--text-faint)] mt-1">
                Type cannot be modified once created.
              </p>
            )}
          </div>

          <Input
            label="Maximum Score (Pts) *"
            id="maxPoints"
            type="number"
            name="maxPoints"
            value={formData.maxPoints}
            onChange={handleChange}
            min={0}
            required
            disabled={loading}
          />
        </div>

        <Input
          label="Assignment Title *"
          id="title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Lab 1: Python Basics"
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
            rows={2}
            className="input w-full"
            placeholder="A brief overview of the assignment goals..."
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="instructions" className="label block mb-1 font-semibold text-sm">
            Instructions
          </label>
          <textarea
            id="instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            rows={4}
            className="input w-full font-mono text-xs"
            placeholder="Provide exact Markdown steps and expectations for students..."
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date & Time"
            id="dueDate"
            type="datetime-local"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            disabled={loading}
          />

          <Input
            label="Order Placement"
            id="order"
            type="number"
            name="order"
            value={formData.order}
            onChange={handleChange}
            min={1}
            disabled={loading}
          />
        </div>

        {/* Type-Specific Settings Fields */}
        {formData.type === 'FILE_SUBMISSION' && (
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">File Submission Config</h4>
            <Input
              label="Allowed Extensions (comma-separated)"
              type="text"
              name="allowedFileTypes"
              value={formData.allowedFileTypes}
              onChange={handleChange}
              className="text-xs"
              placeholder=".pdf,.zip"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Max File Count"
                type="number"
                name="maxFiles"
                value={formData.maxFiles}
                onChange={handleChange}
                min={1}
                className="text-xs"
              />
              <Input
                label="Max File Size (MB)"
                type="number"
                name="maxFileSizeMb"
                value={formData.maxFileSizeMb}
                onChange={handleChange}
                min={1}
                className="text-xs"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="allowResubmission"
                id="allowResubmission"
                checked={formData.allowResubmission}
                onChange={handleChange}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="allowResubmission" className="ml-2 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                Allow resubmissions
              </label>
            </div>
          </div>
        )}

        {formData.type === 'TEXT_SUBMISSION' && (
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Text Submission Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Minimum Word Limit"
                type="number"
                name="minWords"
                value={formData.minWords}
                onChange={handleChange}
                min={0}
                className="text-xs"
              />
              <Input
                label="Maximum Word Limit"
                type="number"
                name="maxWords"
                value={formData.maxWords}
                onChange={handleChange}
                min={1}
                className="text-xs"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="allowResubmission"
                id="allowResubmission"
                checked={formData.allowResubmission}
                onChange={handleChange}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="allowResubmission" className="ml-2 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                Allow resubmissions
              </label>
            </div>
          </div>
        )}

        {formData.type === 'QUIZ' && (
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Quiz Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Attempt Limit"
                type="number"
                name="attemptLimit"
                value={formData.attemptLimit}
                onChange={handleChange}
                min={1}
                className="text-xs"
              />
              <Input
                label="Time Limit (Minutes)"
                type="number"
                name="timeLimitMinutes"
                value={formData.timeLimitMinutes}
                onChange={handleChange}
                min={1}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {formData.type === 'VPL' && (
          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Virtual Lab Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Language"
                type="text"
                name="vplLanguage"
                value={formData.vplLanguage}
                onChange={handleChange}
                className="text-xs"
              />
              <Input
                label="Runtime Env"
                type="text"
                name="vplRuntime"
                value={formData.vplRuntime}
                onChange={handleChange}
                className="text-xs"
              />
            </div>
            <div>
              <label className="label block text-[10px] uppercase font-bold text-[var(--text-faint)]">
                Starter Template Code
              </label>
              <textarea
                name="vplTemplateCode"
                value={formData.vplTemplateCode}
                onChange={handleChange}
                rows={4}
                className="input w-full mt-1 text-xs font-mono"
              />
            </div>
          </div>
        )}

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
          <label htmlFor="visible" className="ml-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Publish immediately (visible to students)
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
            {initialData ? 'Save Changes' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
