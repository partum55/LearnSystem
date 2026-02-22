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
  details?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  thirdAction?: {
    text: string;
    onClick: () => void;
    isLoading?: boolean;
  };
}

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
          iconColor: 'var(--fn-error)',
          defaultIcon: <TrashIcon className="h-5 w-5" />,
          buttonVariant: 'danger' as const,
        };
      case 'warning':
        return {
          iconColor: 'var(--fn-warning)',
          defaultIcon: <ExclamationTriangleIcon className="h-5 w-5" />,
          buttonVariant: 'primary' as const,
        };
      case 'info':
      default:
        return {
          iconColor: 'var(--text-secondary)',
          defaultIcon: <ExclamationTriangleIcon className="h-5 w-5" />,
          buttonVariant: 'primary' as const,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="sm:flex sm:items-start">
        <div
          className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md sm:mx-0"
          style={{ background: 'var(--bg-overlay)', color: styles.iconColor }}
        >
          {icon || styles.defaultIcon}
        </div>

        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {message}
            </p>
            {details && (
              <p
                className="mt-2 text-sm p-2 rounded-md"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-overlay)' }}
              >
                {details}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        {thirdAction && (
          <Button onClick={thirdAction.onClick} isLoading={thirdAction.isLoading}>
            {thirdAction.text}
          </Button>
        )}
        <Button variant={styles.buttonVariant} onClick={onConfirm} isLoading={isLoading}>
          {confirmText || t('common.confirm', 'Confirm')}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={isLoading || thirdAction?.isLoading}>
          {cancelText || t('common.cancel', 'Cancel')}
        </Button>
      </div>
    </Modal>
  );
};

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
        setModalState({ isOpen: true, props, resolve });
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

  return {
    confirm,
    isOpen: modalState.isOpen,
    onClose: handleClose,
    onConfirm: handleConfirmAction,
    ...modalState.props,
  };
};

export default ConfirmModal;
