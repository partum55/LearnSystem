import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Options for the useUnsavedChangesWarning hook
 */
interface UseUnsavedChangesWarningOptions {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Function to save the data before leaving */
  onSave?: () => Promise<void>;
  /** Custom confirmation message */
  message?: string;
}

/**
 * Return type for useUnsavedChangesWarning hook
 */
interface UseUnsavedChangesWarningReturn {
  /** Whether the warning modal is shown */
  isPromptOpen: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Handle save and leave action */
  handleSaveAndLeave: () => void;
  /** Handle leave without saving action */
  handleLeaveWithoutSaving: () => void;
  /** Handle stay action (cancel navigation) */
  handleStay: () => void;
  /** Programmatically attempt navigation with warning check */
  attemptNavigation: (path: string) => void;
}

/**
 * Hook for warning users about unsaved changes before navigation.
 * Works with both in-app navigation (React Router) and browser navigation.
 *
 * Features:
 * - Shows confirmation modal for in-app navigation
 * - Shows browser confirmation for page refresh/close
 * - Supports save-and-leave workflow
 * - Integrates with useAutoSave hook
 *
 * @example
 * const {
 *   isPromptOpen,
 *   isSaving,
 *   handleSaveAndLeave,
 *   handleLeaveWithoutSaving,
 *   handleStay,
 *   attemptNavigation
 * } = useUnsavedChangesWarning({
 *   isDirty: formState.isDirty,
 *   onSave: async () => {
 *     await saveFormData();
 *   },
 * });
 */
export function useUnsavedChangesWarning({
  isDirty,
  onSave,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
  const navigate = useNavigate();

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Handle click on links to intercept navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && isDirty && !isNavigating) {
        const href = link.getAttribute('href');

        // Only intercept internal navigation links
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          e.preventDefault();
          e.stopPropagation();
          setPendingPath(href);
          setIsPromptOpen(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, isNavigating]);

  // Programmatically attempt navigation with warning check
  const attemptNavigation = useCallback((path: string) => {
    if (isDirty && !isNavigating) {
      setPendingPath(path);
      setIsPromptOpen(true);
    } else {
      navigate(path);
    }
  }, [isDirty, isNavigating, navigate]);

  // Handle save and leave
  const handleSaveAndLeave = useCallback(async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
        setIsNavigating(true);
        setIsPromptOpen(false);
        if (pendingPath) {
          navigate(pendingPath);
        }
      } catch (error) {
        console.error('Failed to save before leaving:', error);
        // Keep modal open on save failure
      } finally {
        setIsSaving(false);
        setIsNavigating(false);
      }
    } else {
      // No save function provided, just leave
      setIsNavigating(true);
      setIsPromptOpen(false);
      if (pendingPath) {
        navigate(pendingPath);
      }
      setIsNavigating(false);
    }
  }, [onSave, pendingPath, navigate]);

  // Handle leave without saving
  const handleLeaveWithoutSaving = useCallback(() => {
    setIsNavigating(true);
    setIsPromptOpen(false);
    if (pendingPath) {
      navigate(pendingPath);
    }
    setIsNavigating(false);
    setPendingPath(null);
  }, [pendingPath, navigate]);

  // Handle stay (cancel navigation)
  const handleStay = useCallback(() => {
    setIsPromptOpen(false);
    setPendingPath(null);
  }, []);

  return {
    isPromptOpen,
    isSaving,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
    attemptNavigation,
  };
}

export default useUnsavedChangesWarning;

