'use client';

import React, { useState, useEffect } from 'react';
import type { LessonBlockDto, LessonBlockReorderRequest } from '@/features/courses/api/canonical.types';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

interface LessonBlockReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: LessonBlockReorderRequest) => Promise<void>;
  blocks: LessonBlockDto[];
  loading: boolean;
}

export function LessonBlockReorderModal({
  isOpen,
  onClose,
  onSubmit,
  blocks,
  loading,
}: LessonBlockReorderModalProps) {
  const [orderedList, setOrderedList] = useState<LessonBlockDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blocks) {
      // Sort blocks by order position originally
      const sorted = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
      setOrderedList(sorted);
    }
    setError(null);
  }, [blocks, isOpen]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === orderedList.length - 1) return;

    const nextList = [...orderedList];
    const swapTarget = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the elements
    const temp = nextList[index];
    nextList[index] = nextList[swapTarget];
    nextList[swapTarget] = temp;

    setOrderedList(nextList);
  };

  const handleSave = async () => {
    setError(null);

    // Build reorder payload
    const requestPayload: LessonBlockReorderRequest = {
      blocks: orderedList.map((block, idx) => ({
        id: block.id,
        order: idx + 1, // 1-indexed order mapping
      })),
    };

    try {
      await onSubmit(requestPayload);
      onClose();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred while saving block order.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      style={{ background: 'color-mix(in srgb, var(--bg-base) 70%, transparent)' }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">Reorder Lesson Steps</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

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

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Rearrange the steps of your lesson by using the controls below to shift elements up or down.
        </p>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {orderedList.length > 0 ? (
            orderedList.map((block, index) => {
              return (
                <div
                  key={block.id}
                  className="flex items-center justify-between border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 rounded-xl gap-4 select-none hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xs font-mono text-[var(--text-faint)] bg-[var(--bg-surface)] border border-[var(--border-default)] px-2 py-0.5 rounded flex-shrink-0">
                      Step {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {block.title || `Untitled ${block.type} step`}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate max-w-xs font-mono">
                        Type: {block.type.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0 || loading}
                      className="rounded bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Step Up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === orderedList.length - 1 || loading}
                      className="rounded bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Step Down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-6">
              No lesson steps available to reorder.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-base)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || orderedList.length === 0}
            className="btn btn-primary"
          >
            {loading ? 'Saving Order...' : 'Save Block Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
