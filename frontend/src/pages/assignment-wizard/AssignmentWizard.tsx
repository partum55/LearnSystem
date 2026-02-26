import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import api, { extractErrorMessage } from '../../api/client';
import { useWizardState } from './useWizardState';
import { apiResponseToWizardData, wizardDataToApiPayload } from './wizardMapper';
import { wizardSlide } from '../../components/animation/variants';
import WizardStepIndicator from './WizardStepIndicator';
import TypeStep from './steps/TypeStep';
import ContentStep from './steps/ContentStep';
import ResourcesStep from './steps/ResourcesStep';
import SettingsStep from './steps/SettingsStep';
import GradingStep from './steps/GradingStep';
import ReviewStep from './steps/ReviewStep';
import { UnsavedChangesPrompt } from '../../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

const AssignmentWizard: React.FC = () => {
  const params = useParams<{ id?: string; assignmentId?: string; courseId?: string; moduleId?: string }>();
  const assignmentId = params.assignmentId || params.id;
  const [searchParams] = useSearchParams();
  const courseId = params.courseId || searchParams.get('courseId') || '';
  const moduleId = params.moduleId || '';
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wizard = useWizardState(courseId, assignmentId);
  const reduced = useReducedMotion();
  const directionRef = useRef(1);
  const prevIndexRef = useRef(wizard.currentStepIndex);

  if (prevIndexRef.current !== wizard.currentStepIndex) {
    directionRef.current = wizard.currentStepIndex > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = wizard.currentStepIndex;
  }

  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: wizard.isDirty && !saving,
    message: t('assignment.unsavedEditorWarning', 'You have unsaved changes. Are you sure you want to leave?'),
  });

  // Load existing assignment in edit mode
  useEffect(() => {
    if (!assignmentId) return;
    const loadAssignment = async () => {
      try {
        setLoading(true);
        const response = await api.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`);
        const wizardData = apiResponseToWizardData(response.data);
        wizard.loadExisting(wizardData);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const payload = wizardDataToApiPayload(
        { ...wizard.formData, is_published: publish },
        courseId,
        moduleId,
      );

      if (assignmentId) {
        await api.put(`/assessments/assignments/${assignmentId}`, payload);
      } else {
        await api.post('/assessments/assignments', payload);
      }

      wizard.clearDraft();

      if (courseId && moduleId) {
        navigate(`/courses/${courseId}`);
      } else if (courseId) {
        navigate(`/courses/${courseId}`);
      } else {
        navigate('/assignments');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const navigateBack = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    } else {
      navigate('/assignments');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full" style={{ borderBottom: '2px solid var(--text-primary)' }} />
      </div>
    );
  }

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'type':
        return (
          <TypeStep
            value={wizard.formData.assignment_type}
            onChange={(type) => wizard.updateFormData({ assignment_type: type })}
          />
        );
      case 'content':
        return (
          <ContentStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
          />
        );
      case 'resources':
        return (
          <ResourcesStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            courseId={courseId}
            moduleId={moduleId}
          />
        );
      case 'settings':
        return (
          <SettingsStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
            courseId={courseId}
          />
        );
      case 'grading':
        return (
          <GradingStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
            courseId={courseId}
            moduleId={moduleId}
          />
        );
      case 'review':
        return (
          <ReviewStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            onSaveDraft={() => void handleSave(false)}
            onPublish={() => void handleSave(true)}
            saving={saving}
          />
        );
    }
  };

  return (
    <>
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        isSaving={saving}
        title={t('assignment.unsavedChangesTitle', 'Unsaved Changes')}
        message={t('assignment.unsavedEditorWarning', 'You have unsaved changes. Are you sure you want to leave?')}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {assignmentId ? t('assignment.edit', 'Edit Assignment') : t('assignment.create_new', 'Create Assignment')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('wizard.subtitle', 'Follow the steps to configure your assignment')}
            </p>
          </div>
          <button
            type="button"
            onClick={navigateBack}
            className="btn btn-ghost text-sm"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 rounded-lg p-4"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
          >
            <p style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        {/* Step indicator */}
        <WizardStepIndicator
          currentStep={wizard.currentStep}
          onStepClick={wizard.goToStep}
        />

        {/* Step content */}
        <div
          className="rounded-lg p-6 overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          {reduced ? (
            renderStep()
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={wizard.currentStep}
                variants={wizardSlide(directionRef.current)}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation buttons */}
        {wizard.currentStep !== 'review' && (
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={wizard.isFirstStep ? navigateBack : wizard.goBack}
              className="btn btn-secondary px-6 py-2.5"
            >
              {wizard.isFirstStep ? t('common.cancel', 'Cancel') : t('common.previous', 'Previous')}
            </button>
            <button
              type="button"
              onClick={wizard.goNext}
              className="btn btn-primary px-6 py-2.5"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignmentWizard;
