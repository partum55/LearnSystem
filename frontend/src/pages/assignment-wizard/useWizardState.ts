import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WizardFormData,
  WizardStep,
  WizardStepValidation,
  WIZARD_STEPS,
  initialWizardFormData,
} from './wizardTypes';

const DRAFT_PREFIX = 'draft:assignment:';

function getDraftKey(courseId: string, assignmentId?: string): string {
  return `${DRAFT_PREFIX}${courseId}:${assignmentId || 'new'}`;
}

function validateStep(step: WizardStep, data: WizardFormData): WizardStepValidation {
  const errors: Record<string, string> = {};

  switch (step) {
    case 'type':
      if (!data.assignment_type) errors.assignment_type = 'required';
      break;
    case 'content':
      if (!data.title.trim()) errors.title = 'required';
      if (!data.description.trim()) errors.description = 'required';
      break;
    case 'resources':
      break;
    case 'settings':
      if (data.due_date && data.available_from) {
        if (new Date(data.due_date) < new Date(data.available_from)) {
          errors.due_date = 'due_before_available';
        }
      }
      break;
    case 'grading':
      if (data.max_points <= 0) errors.max_points = 'must_be_positive';
      break;
    case 'review':
      break;
  }

  return { canProceed: Object.keys(errors).length === 0, errors };
}

export function useWizardState(courseId: string, assignmentId?: string) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<WizardFormData>(initialWizardFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<string>(
    JSON.stringify(initialWizardFormData),
  );
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== initialDataSnapshot,
    [formData, initialDataSnapshot],
  );

  // Load draft from localStorage
  useEffect(() => {
    if (!courseId) return;
    const key = getDraftKey(courseId, assignmentId);
    const saved = localStorage.getItem(key);
    if (saved && !assignmentId) {
      try {
        const parsed = JSON.parse(saved) as WizardFormData;
        queueMicrotask(() => {
          setFormData(parsed);
        });
      } catch {
        // ignore corrupt drafts
      }
    }
  }, [courseId, assignmentId]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!courseId || assignmentId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const key = getDraftKey(courseId, assignmentId);
      localStorage.setItem(key, JSON.stringify(formData));
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData, courseId, assignmentId]);

  const updateFormData = useCallback((partial: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...partial }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
    setValidationErrors({});
  }, []);

  const goNext = useCallback(() => {
    const validation = validateStep(currentStep, formData);
    if (!validation.canProceed) {
      setValidationErrors(validation.errors);
      return false;
    }
    setValidationErrors({});
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex]);
    }
    return true;
  }, [currentStep, currentStepIndex, formData]);

  const goBack = useCallback(() => {
    setValidationErrors({});
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const loadExisting = useCallback((data: WizardFormData) => {
    setFormData(data);
    setInitialDataSnapshot(JSON.stringify(data));
  }, []);

  const clearDraft = useCallback(() => {
    if (!courseId) return;
    const key = getDraftKey(courseId, assignmentId);
    localStorage.removeItem(key);
  }, [courseId, assignmentId]);

  const stepValidation = useMemo(
    () => validateStep(currentStep, formData),
    [currentStep, formData],
  );

  return {
    currentStep,
    currentStepIndex,
    formData,
    updateFormData,
    setFormData,
    validationErrors,
    isDirty,
    isFirstStep,
    isLastStep,
    goToStep,
    goNext,
    goBack,
    loadExisting,
    clearDraft,
    stepValidation,
  };
}
