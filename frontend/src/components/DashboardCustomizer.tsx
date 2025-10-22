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
    setLocalWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    );
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = localWidgets.findIndex(w => w.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === localWidgets.length - 1)
    ) {
      return;
    }

    const newWidgets = [...localWidgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
    
    // Update order
    newWidgets.forEach((w, i) => {
      w.order = i;
    });
    
    setLocalWidgets(newWidgets);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
      >
        <Cog6ToothIcon className="h-4 w-4" />
        {t('dashboard.customize', 'Customize Dashboard')}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('dashboard.customizeTitle', 'Customize Your Dashboard')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.customizeDesc', 'Choose which widgets to display and arrange their order')}
          </p>

          <div className="space-y-2">
            {localWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={() => toggleWidget(widget.id)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {widget.title}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('common.moveUp', 'Move up')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === localWidgets.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
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

