'use client';

import React from 'react';
import type { DashboardLayoutItem } from '../dashboard.types';
import { WIDGET_REGISTRY } from '../dashboardRegistry';
import { EyeIcon } from '@heroicons/react/24/outline';

interface DashboardCustomizePanelProps {
  widgets: DashboardLayoutItem[];
  onToggleWidget: (id: string) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function DashboardCustomizePanel({
  widgets,
  onToggleWidget,
  onReset,
  onCancel,
  onSave,
}: DashboardCustomizePanelProps) {
  const hiddenWidgets = widgets.filter((w) => !w.enabled);

  return (
    <div
      className="card mb-6 border"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface)',
        borderStyle: 'dashed',
      }}
    >
      <div className="card-body space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Customizing Dashboard</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Drag and drop widgets to reorder. Choose predefined sizes using size menus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="btn btn-primary text-xs py-1.5 px-3 font-semibold"
            >
              Save Layout
            </button>
          </div>
        </div>

        <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
            Hidden Widgets
          </p>
          {hiddenWidgets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map((hw) => {
                const definition = WIDGET_REGISTRY[hw.id];
                if (!definition) return null;

                return (
                  <button
                    key={hw.id}
                    type="button"
                    onClick={() => onToggleWidget(hw.id)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-stone-100 dark:hover:bg-stone-900"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-secondary)' }}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    <span>{definition.title}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>
              All available widgets are currently displayed on your dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
