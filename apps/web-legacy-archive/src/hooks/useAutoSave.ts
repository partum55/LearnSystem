import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Options for the useAutoSave hook
 */
interface UseAutoSaveOptions<T> {
  /** Data to auto-save */
  data: T;
  /** Function to save the data */
  onSave: (data: T) => Promise<void>;
  /** Interval in milliseconds between saves (default: 30000 = 30s) */
  interval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when save succeeds */
  onSuccess?: () => void;
  /** Callback when save fails */
  onError?: (error: Error) => void;
  /** Debounce delay in milliseconds (default: 1000) */
  debounceDelay?: number;
}

/**
 * Return type for useAutoSave hook
 */
interface UseAutoSaveReturn {
  /** Whether data has been modified since last save */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Last save timestamp */
  lastSaved: Date | null;
  /** Error from last save attempt */
  saveError: Error | null;
  /** Manually trigger a save */
  save: () => Promise<void>;
  /** Mark data as saved (reset dirty flag) */
  markSaved: () => void;
  /** Mark data as dirty */
  markDirty: () => void;
}

/**
 * Hook for auto-saving data at regular intervals.
 * Useful for quiz answers, grading forms, and other forms where data loss is critical.
 *
 * Features:
 * - Periodic auto-save at configurable intervals
 * - Debounced saves to prevent excessive API calls
 * - Dirty tracking to avoid unnecessary saves
 * - Error handling with retry capability
 * - Manual save trigger
 *
 * @example
 * const { isDirty, isSaving, lastSaved, save } = useAutoSave({
 *   data: answers,
 *   onSave: async (data) => {
 *     await api.post('/save-answers', data);
 *   },
 *   interval: 30000, // 30 seconds
 * });
 */
export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000,
  enabled = true,
  onSuccess,
  onError,
  debounceDelay = 1000,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const lastDataRef = useRef<string>(JSON.stringify(data));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect changes in data
  useEffect(() => {
    const currentData = JSON.stringify(data);
    if (currentData !== lastDataRef.current) {
      setIsDirty(true);
      lastDataRef.current = currentData;
    }
  }, [data]);

  // Save function
  const save = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(data);
      setIsDirty(false);
      setLastSaved(new Date());
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Save failed');
      setSaveError(err);
      onError?.(err);
    } finally {
      setIsSaving(false);
    }
  }, [data, isDirty, isSaving, onSave, onSuccess, onError]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled || !isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      save();
    }, debounceDelay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, isDirty, save, debounceDelay]);

  // Periodic auto-save
  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      if (isDirty && !isSaving) {
        save();
      }
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, interval, isDirty, isSaving, save]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSaved(new Date());
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    isDirty,
    isSaving,
    lastSaved,
    saveError,
    save,
    markSaved,
    markDirty,
  };
}

export default useAutoSave;
