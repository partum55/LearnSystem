import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export interface DashboardWidget {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onSave: (widgets: DashboardWidget[]) => void;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({ widgets, onSave }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);

  const handleOpen = () => {
    setLocalWidgets([...widgets]);
    setIsOpen(true);
  };

  const handleSave = () => {
    onSave(localWidgets);
    setIsOpen(false);
  };

  const toggleWidget = (id: string) => {
    setLocalWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = localWidgets.findIndex(w => w.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === localWidgets.length - 1)
    ) return;

    const newWidgets = [...localWidgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
    newWidgets.forEach((w, i) => { w.order = i; });
    setLocalWidgets(newWidgets);
  };

  return (
    <>
      <Button onClick={handleOpen} variant="secondary" size="sm" className="flex items-center gap-2">
        <Cog6ToothIcon className="h-4 w-4" />
        {t('dashboard.customize', 'Customize Dashboard')}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('dashboard.customizeTitle', 'Customize Your Dashboard')}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard.customizeDesc', 'Choose which widgets to display and arrange their order')}
          </p>

          <div className="space-y-1.5">
            {localWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3 rounded-md"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={() => toggleWidget(widget.id)}
                    className="h-3.5 w-3.5 rounded"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {widget.title}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-faint)' }}
                    title={t('common.moveUp', 'Move up')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === localWidgets.length - 1}
                    className="p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-faint)' }}
                    title={t('common.moveDown', 'Move down')}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
