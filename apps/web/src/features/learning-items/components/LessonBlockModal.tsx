'use client';

import React, { useState, useEffect } from 'react';
import type { LessonBlockDto, LessonBlockRequest } from '@/features/courses/api/canonical.types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal, Input, Button } from '@/components';

interface LessonBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: LessonBlockRequest) => Promise<void>;
  initialData?: LessonBlockDto | null;
  loading: boolean;
}

export function LessonBlockModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}: LessonBlockModalProps) {
  const [type, setType] = useState<'text' | 'video' | 'inline_quiz_question'>('text');
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState<number>(1);

  // Type specific states
  const [textContent, setTextContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [quizPrompt, setQuizPrompt] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '']);
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState('0');
  const [quizExplanation, setQuizExplanation] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const blockType = (initialData.type?.toLowerCase() || 'text') as 'text' | 'video' | 'inline_quiz_question';
      setType(blockType);
      setTitle(initialData.title || '');
      setOrder(initialData.order || 1);

      if (blockType === 'text') {
        setTextContent(initialData.content || '');
      } else if (blockType === 'video') {
        const url = (initialData.settings?.url as string) || initialData.content || '';
        setVideoUrl(url);
      } else if (blockType === 'inline_quiz_question') {
        setQuizPrompt(
          (initialData.settings?.prompt as string) || 
          (initialData.settings?.stem as string) || 
          initialData.content || 
          ''
        );
        const opts = initialData.settings?.options || initialData.settings?.choices || initialData.settings?.answers;
        if (Array.isArray(opts)) {
          setQuizOptions(opts.map(o => typeof o === 'string' ? o : String(o?.text || '')));
        } else {
          setQuizOptions(['', '']);
        }
        setQuizCorrectAnswer(String(initialData.settings?.correctAnswer ?? '0'));
        setQuizExplanation((initialData.settings?.explanation as string) || '');
      }
    } else {
      setType('text');
      setTitle('');
      setOrder(1);
      setTextContent('');
      setVideoUrl('');
      setQuizPrompt('');
      setQuizOptions(['', '']);
      setQuizCorrectAnswer('0');
      setQuizExplanation('');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleAddOption = () => {
    setQuizOptions(prev => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (quizOptions.length <= 2) return; // Keep at least 2 options
    setQuizOptions(prev => prev.filter((_, i) => i !== index));
    // If the correct answer was pointing to the removed option or beyond, adjust it
    const correctIdx = parseInt(quizCorrectAnswer, 10);
    if (correctIdx === index) {
      setQuizCorrectAnswer('0');
    } else if (correctIdx > index) {
      setQuizCorrectAnswer(String(correctIdx - 1));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    setQuizOptions(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Common validations
    const reqType = type === 'inline_quiz_question' ? 'INLINE_QUIZ_QUESTION' : type.toUpperCase();
    const payload: LessonBlockRequest = {
      type: reqType,
      title: title.trim() || undefined,
      order: order ? Number(order) : undefined,
    };

    if (type === 'text') {
      if (!textContent.trim()) {
        setError('Text content is required');
        return;
      }
      payload.content = textContent.trim();
    } else if (type === 'video') {
      if (!videoUrl.trim()) {
        setError('Video URL is required');
        return;
      }
      if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
        setError('Video URL must start with http:// or https://');
        return;
      }
      payload.url = videoUrl.trim();
      payload.content = videoUrl.trim(); // populate content as fallback
    } else if (type === 'inline_quiz_question') {
      if (!quizPrompt.trim()) {
        setError('Question prompt is required');
        return;
      }
      
      const filteredOptions = quizOptions.map(o => o.trim());
      if (filteredOptions.some(o => !o)) {
        setError('All choices/options must have text');
        return;
      }

      payload.content = quizPrompt.trim();
      payload.settings = {
        prompt: quizPrompt.trim(),
        options: filteredOptions,
        correctAnswer: quizCorrectAnswer,
        explanation: quizExplanation.trim() || undefined,
      };
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred while saving the lesson block.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Lesson Step' : 'Create Lesson Step'}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="block-type" className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">
              Step Type <span className="text-red-500">*</span>
            </label>
            <select
              id="block-type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="input w-full font-medium text-sm"
              disabled={loading}
            >
              <option value="text">Rich Text / Markdown</option>
              <option value="video">Streaming Video (YouTube, Vimeo, etc.)</option>
              <option value="inline_quiz_question">Interactive Checkpoint Question</option>
            </select>
          </div>

          <Input
            label="Step Title (Optional)"
            id="block-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Overview of Binary Search"
            disabled={loading}
          />
        </div>

        <Input
          label="Step Position Index"
          id="block-order"
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          min={1}
          placeholder="e.g. 1"
          disabled={loading}
        />

        {/* TEXT BLOCK EDITOR */}
        {type === 'text' && (
          <div>
            <label htmlFor="block-text-content" className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">
              Step Markdown Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="block-text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              className="input w-full font-mono text-xs"
              placeholder="Write your lesson content here. Markdown is fully supported..."
              disabled={loading}
              required
            />
          </div>
        )}

        {/* VIDEO BLOCK EDITOR */}
        {type === 'video' && (
          <Input
            label="Video URL *"
            id="block-video-url"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            disabled={loading}
            required
            helperText="Supports YouTube, Vimeo, and direct video file stream URLs."
          />
        )}

        {/* INLINE QUIZ BLOCK EDITOR */}
        {type === 'inline_quiz_question' && (
          <div className="space-y-4 border border-[var(--border-subtle)] p-4 rounded-xl bg-[var(--bg-base)]">
            <div>
              <label htmlFor="quiz-prompt" className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">
                Question Prompt / Stem <span className="text-red-500">*</span>
              </label>
              <textarea
                id="quiz-prompt"
                value={quizPrompt}
                onChange={(e) => setQuizPrompt(e.target.value)}
                rows={3}
                className="input w-full"
                placeholder="What is the time complexity of binary search in the worst case?"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Answer Options / Choices</span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-3xs font-extrabold text-[var(--text-primary)] hover:opacity-80 transition cursor-pointer"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Option
                </button>
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {quizOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-3xs font-mono text-[var(--text-faint)] w-4 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="input w-full py-1.5 text-xs"
                      placeholder={`Choice option ${idx + 1}`}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={loading || quizOptions.length <= 2}
                      className="text-[var(--text-muted)] hover:text-[var(--fn-error)] p-1 transition disabled:opacity-30 disabled:hover:text-[var(--text-muted)] cursor-pointer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="quiz-correct-answer" className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">
                  Correct Option <span className="text-red-500">*</span>
                </label>
                <select
                  id="quiz-correct-answer"
                  value={quizCorrectAnswer}
                  onChange={(e) => setQuizCorrectAnswer(e.target.value)}
                  className="input w-full py-1.5 text-xs font-medium"
                  disabled={loading}
                >
                  {quizOptions.map((_, idx) => (
                    <option key={idx} value={String(idx)}>
                      Option {idx + 1}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Explanation / Solution Hint (Optional)"
                id="quiz-explanation"
                type="text"
                value={quizExplanation}
                onChange={(e) => setQuizExplanation(e.target.value)}
                className="py-1.5 text-xs"
                placeholder="Provide context for correct answer..."
                disabled={loading}
              />
            </div>
          </div>
        )}

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
            {initialData ? 'Save Changes' : 'Create Step'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
