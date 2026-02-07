import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '../Modal';
import { Button } from '../Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** Additional details about consequences */
  details?: string;
  /** Type of action - affects styling */
  variant?: 'danger' | 'warning' | 'info';
  /** Custom confirm button text */
  confirmText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
  /** Icon to show - defaults based on variant */
  icon?: React.ReactNode;
  /** Optional third action (e.g., "Save & Continue") */
  thirdAction?: {
    text: string;
    onClick: () => void;
    isLoading?: boolean;
  };
}

/**
 * A styled confirmation modal to replace native window.confirm()
 * Provides better UX with clear styling, icons, and consequence descriptions.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  variant = 'warning',
  confirmText,
  cancelText,
  isLoading = false,
  icon,
  thirdAction,
}) => {
  const { t } = useTranslation();

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          defaultIcon: <TrashIcon className="h-6 w-6" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          defaultIcon: <ExclamationTriangleIcon className="h-6 w-6" />,
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          defaultIcon: <ExclamationTriangleIcon className="h-6 w-6" />,
        };
    }
  };

  const styles = getVariantStyles();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="sm:flex sm:items-start">
        {/* Icon */}
        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
          <span className={styles.iconColor}>
            {icon || styles.defaultIcon}
          </span>
        </div>

        {/* Content */}
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
            {details && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {details}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        {thirdAction && (
          <Button
            onClick={thirdAction.onClick}
            isLoading={thirdAction.isLoading}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {thirdAction.text}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          isLoading={isLoading}
          className={styles.buttonClass}
        >
          {confirmText || t('common.confirm', 'Confirm')}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading || thirdAction?.isLoading}
        >
          {cancelText || t('common.cancel', 'Cancel')}
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Hook to use ConfirmModal imperatively
 * Returns a function that shows the modal and returns a promise, along with props for the modal.
 * Usage:
 * const { confirm, ...modalProps } = useConfirmModal();
 * ...
 * <ConfirmModal {...modalProps} />
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useConfirmModal = () => {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    props: { title: '', message: '' },
    resolve: null,
  });

  const confirm = React.useCallback(
    (props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          props,
          resolve,
        });
      });
    },
    []
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleClose = React.useCallback(() => {
    modalState.resolve?.(false);
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [modalState.resolve]);

  const handleConfirmAction = React.useCallback(() => {
    modalState.resolve?.(true);
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [modalState.resolve]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Return specific props needed for ConfirmModal
  return {
    confirm,
    isOpen: modalState.isOpen,
    onClose: handleClose,
    onConfirm: handleConfirmAction,
    ...modalState.props,
  };
};

export default ConfirmModal;

