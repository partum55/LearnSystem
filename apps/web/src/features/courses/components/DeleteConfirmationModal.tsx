'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType?: 'module' | 'material' | 'assignment';
  loading: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'module',
  loading,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      setError('Confirmation text must match DELETE exactly.');
      return;
    }

    try {
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete delete operation.');
    }
  };

  const isModule = itemType === 'module';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete ${isModule ? 'Module' : 'Item'}`}>
      <form onSubmit={handleConfirmSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div
          className="rounded-xl p-4 flex gap-3 border"
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            borderColor: 'rgba(239, 68, 68, 0.15)',
          }}
        >
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" style={{ color: 'var(--fn-error)' }} />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Destructive Action Warning
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You are about to permanently delete the {itemType} <strong className="text-[var(--text-primary)]">"{itemName}"</strong>.
              This action is <span className="font-semibold underline">irreversible</span> and will immediately erase this content from the course structure.
            </p>
          </div>
        </div>

        {/* Informative text about what gets deleted / saved */}
        <div className="text-xs space-y-2 leading-relaxed text-[var(--text-secondary)]">
          {isModule ? (
            <>
              <p>
                ⚠️ <strong>What will be permanently lost:</strong> All learning materials, media links, and custom lesson content blocks hosted within this module.
              </p>
              <p>
                🔒 <strong>What will be preserved:</strong> Course assignments, student attempts, uploaded submissions, and teacher grades are safely retained in the gradebook.
              </p>
            </>
          ) : (
            <p>
              ⚠️ All files, links, settings, or details associated with this item will be removed permanently. Student progress stats may be impacted.
            </p>
          )}
        </div>

        {error && (
          <div
            className="rounded-md p-3 border"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.15)',
            }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--fn-error)' }}>
              {error}
            </p>
          </div>
        )}

        <div className="pt-2">
          <Input
            label="Type DELETE to confirm permanent removal *"
            id="confirmText"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            required
            disabled={loading}
            className="text-xs tracking-wider"
          />
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
            variant="danger"
            isLoading={loading}
            disabled={confirmText !== 'DELETE' || loading}
          >
            Delete Permanently
          </Button>
        </div>
      </form>
    </Modal>
  );
}
