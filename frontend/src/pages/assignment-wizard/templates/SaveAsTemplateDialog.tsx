import React from 'react';
import { useTranslation } from 'react-i18next';

interface SaveAsTemplateDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({ onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-lg p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {t('templates.save.title', 'Save as Template')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('templates.save.desc', 'This assignment will be saved as a reusable template. You can use it to quickly create similar assignments in the future.')}
          </p>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="button" onClick={onConfirm} className="btn btn-primary flex-1 py-2">
              {t('templates.save.confirm', 'Save Template')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SaveAsTemplateDialog;
