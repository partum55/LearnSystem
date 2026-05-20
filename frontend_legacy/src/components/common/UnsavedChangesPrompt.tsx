import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UnsavedChangesPromptProps {
  isOpen: boolean;
  onSaveAndLeave: () => void;
  onLeaveWithoutSaving: () => void;
  onStay: () => void;
  isSaving?: boolean;
  title?: string;
  message?: string;
}

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
          <div
            className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
            style={{ background: 'var(--bg-overlay)', color: 'var(--fn-warning)' }}
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {message || t('unsavedChanges.message', 'You have unsaved changes. What would you like to do?')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="secondary" onClick={onLeaveWithoutSaving} disabled={isSaving}>
            {t('unsavedChanges.discard', 'Discard changes')}
          </Button>
          <Button variant="secondary" onClick={onStay} disabled={isSaving}>
            {t('unsavedChanges.stay', 'Keep editing')}
          </Button>
          <Button onClick={onSaveAndLeave} isLoading={isSaving}>
            {t('unsavedChanges.saveAndLeave', 'Save and leave')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsavedChangesPrompt;
