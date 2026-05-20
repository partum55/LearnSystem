import React from 'react';
import { useTranslation } from 'react-i18next';
import { WizardStep, WIZARD_STEPS } from './wizardTypes';

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  completedSteps?: WizardStep[];
}

const stepIcons: Record<WizardStep, string> = {
  type: '1',
  content: '2',
  resources: '3',
  settings: '4',
  grading: '5',
  review: '6',
};

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  currentStep,
  onStepClick,
  completedSteps = [],
}) => {
  const { t } = useTranslation();
  const currentIndex = WIZARD_STEPS.indexOf(currentStep);

  const stepLabels: Record<WizardStep, string> = {
    type: t('wizard.steps.type', 'Type'),
    content: t('wizard.steps.content', 'Content'),
    resources: t('wizard.steps.resources', 'Resources'),
    settings: t('wizard.steps.settings', 'Settings'),
    grading: t('wizard.steps.grading', 'Grading'),
    review: t('wizard.steps.review', 'Review'),
  };

  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = step === currentStep;
          const isCompleted = completedSteps.includes(step) || index < currentIndex;
          const isClickable = index <= currentIndex || isCompleted;

          return (
            <li key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={!isClickable}
                className="flex items-center gap-2 w-full group"
              >
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 transition-all"
                  style={{
                    background: isCurrent
                      ? 'var(--text-primary)'
                      : isCompleted
                        ? 'var(--fn-success)'
                        : 'var(--bg-overlay)',
                    color: isCurrent || isCompleted ? 'var(--bg-base)' : 'var(--text-muted)',
                    border: isCurrent ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepIcons[step]
                  )}
                </span>
                <span
                  className="text-sm font-medium hidden sm:block transition-colors"
                  style={{
                    color: isCurrent ? 'var(--text-primary)' : isCompleted ? 'var(--fn-success)' : 'var(--text-muted)',
                  }}
                >
                  {stepLabels[step]}
                </span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className="h-px flex-1 mx-2 hidden sm:block"
                  style={{
                    background: index < currentIndex ? 'var(--fn-success)' : 'var(--border-default)',
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardStepIndicator;
