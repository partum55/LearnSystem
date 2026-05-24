'use client';

import React, { useState, useEffect } from 'react';
import type { DashboardLayout, DashboardType, DashboardWidgetId } from '../dashboard.types';
import {
  loadDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
  computeGridPositions,
} from '../dashboardLayouts';
import { WIDGET_REGISTRY } from '../dashboardRegistry';
import { DashboardWidgetShell } from './DashboardWidgetShell';
import { DashboardCustomizePanel } from './DashboardCustomizePanel';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface DashboardGridProps {
  dashboardType: DashboardType;
}

export function DashboardGrid({ dashboardType }: DashboardGridProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedId, setDraggedId] = useState<DashboardWidgetId | null>(null);

  // Load layout on mount
  useEffect(() => {
    setLayout(loadDashboardLayout(dashboardType));
  }, [dashboardType]);

  if (!layout) return null;

  const handleSizeChange = (id: DashboardWidgetId, w: number, h: number) => {
    const updated = layout.widgets.map((item) =>
      item.id === id ? { ...item, w, h } : item
    );
    setLayout({
      ...layout,
      widgets: computeGridPositions(updated),
    });
  };

  const handleHideWidget = (id: DashboardWidgetId) => {
    const updated = layout.widgets.map((item) =>
      item.id === id ? { ...item, enabled: false } : item
    );
    setLayout({
      ...layout,
      widgets: computeGridPositions(updated),
    });
  };

  const handleToggleWidgetVisibility = (id: string) => {
    const widgetId = id as DashboardWidgetId;
    const updated = layout.widgets.map((item) =>
      item.id === widgetId ? { ...item, enabled: !item.enabled } : item
    );
    setLayout({
      ...layout,
      widgets: computeGridPositions(updated),
    });
  };

  const handleReset = () => {
    setLayout(resetDashboardLayout(dashboardType));
  };

  const handleCancel = () => {
    setLayout(loadDashboardLayout(dashboardType));
    setIsCustomizing(false);
  };

  const handleSave = () => {
    saveDashboardLayout(dashboardType, layout);
    setIsCustomizing(false);
  };

  // Drag & Drop event handlers
  const handleDragStart = (e: React.DragEvent, id: DashboardWidgetId) => {
    if (!isCustomizing) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isCustomizing) return;
    e.preventDefault();
  };

  const handleDrop = (targetId: DashboardWidgetId) => {
    if (!isCustomizing || !draggedId || draggedId === targetId) return;

    const currentWidgets = [...layout.widgets];
    const fromIndex = currentWidgets.findIndex((w) => w.id === draggedId);
    const toIndex = currentWidgets.findIndex((w) => w.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      // Reorder items in the array
      const [removed] = currentWidgets.splice(fromIndex, 1);
      currentWidgets.splice(toIndex, 0, removed);

      setLayout({
        ...layout,
        widgets: computeGridPositions(currentWidgets),
      });
    }
    setDraggedId(null);
  };

  const activeWidgets = layout.widgets.filter((w) => w.enabled);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      {!isCustomizing && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsCustomizing(true)}
            className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Customize dashboard
          </button>
        </div>
      )}

      {/* Customization control panel */}
      {isCustomizing && (
        <DashboardCustomizePanel
          widgets={layout.widgets}
          onToggleWidget={handleToggleWidgetVisibility}
          onReset={handleReset}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      )}

      {/* Invisible 4-column layout grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        style={{
          minHeight: '200px',
        }}
      >
        {activeWidgets.map((item) => {
          const definition = WIDGET_REGISTRY[item.id];
          if (!definition) return null;

          const WidgetComponent = definition.component;

          return (
            <DashboardWidgetShell
              key={item.id}
              id={item.id}
              title={definition.title}
              w={item.w}
              h={item.h}
              allowedSizes={definition.allowedSizes}
              isCustomizing={isCustomizing}
              onSizeChange={(nw, nh) => handleSizeChange(item.id, nw, nh)}
              onHide={() => handleHideWidget(item.id)}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(item.id)}
            >
              <WidgetComponent size={[item.w, item.h]} isCustomizing={isCustomizing} />
            </DashboardWidgetShell>
          );
        })}
      </div>
    </div>
  );
}
