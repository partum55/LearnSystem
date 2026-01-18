import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UnsavedChangesPromptProps {
  /** Whether the prompt is visible */
  isOpen: boolean;
  /** Called when user wants to save and leave */
  onSaveAndLeave: () => void;
  /** Called when user wants to leave without saving */
  onLeaveWithoutSaving: () => void;
  /** Called when user wants to stay */
  onStay: () => void;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
}

/**
 * Unsaved changes confirmation prompt.
 * Prevents accidental navigation away from forms with unsaved data.
 */
export const UnsavedChangesPrompt: React.FC<UnsavedChangesPromptProps> = ({
  isOpen,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onStay,
  isSaving = false,
  title,
  message,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onStay} title={title || t('unsavedChanges.title', 'Unsaved Changes')}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message || t('unsavedChanges.message', 'You have unsaved changes. What would you like to do?')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="secondary"
            onClick={onLeaveWithoutSaving}
            disabled={isSaving}
          >
            {t('unsavedChanges.discard', 'Discard changes')}
          </Button>
          <Button
            variant="secondary"
            onClick={onStay}
            disabled={isSaving}
          >
            {t('unsavedChanges.stay', 'Keep editing')}
          </Button>
          <Button
            onClick={onSaveAndLeave}
            isLoading={isSaving}
          >
            {t('unsavedChanges.saveAndLeave', 'Save and leave')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsavedChangesPrompt;

