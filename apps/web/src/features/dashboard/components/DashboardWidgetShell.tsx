'use client';

import React, { useState } from 'react';
import type { DashboardWidgetId, WidgetSize } from '../dashboard.types';
import {
  ArrowsUpDownIcon,
  EyeSlashIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';

interface DashboardWidgetShellProps {
  id: DashboardWidgetId;
  title: string;
  w: number;
  h: number;
  allowedSizes: WidgetSize[];
  isCustomizing: boolean;
  onSizeChange: (newW: number, newH: number) => void;
  onHide: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export function DashboardWidgetShell({
  id,
  title,
  w,
  h,
  allowedSizes,
  isCustomizing,
  onSizeChange,
  onHide,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  children,
}: DashboardWidgetShellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeText = (size: WidgetSize) => {
    const [sw, sh] = size;
    if (sw === 1 && sh === 1) return '1x1 Small';
    if (sw === 2 && sh === 1) return '2x1 Wide';
    if (sw === 1 && sh === 2) return '1x2 Tall';
    if (sw === 2 && sh === 2) return '2x2 Large';
    if (sw === 4 && sh === 1) return '4x1 Full';
    if (sw === 4 && sh === 2) return '4x2 Huge';
    return `${sw}x${sh}`;
  };

  // Map widget width/height to CSS Grid spans
  const gridStyle: React.CSSProperties = {
    gridColumn: `span ${w}`,
    gridRow: `span ${h}`,
    transition: 'all 0.2s ease-in-out',
    borderColor: isCustomizing
      ? isHovered
        ? 'var(--text-primary)'
        : 'var(--border-default)'
      : 'var(--border-subtle)',
    borderStyle: isCustomizing ? 'dashed' : 'solid',
    background: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    minHeight: h === 1 ? '160px' : '340px',
  };

  return (
    <article
      draggable={isCustomizing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={() => isCustomizing && setIsHovered(true)}
      onDragLeave={() => isCustomizing && setIsHovered(false)}
      onDrop={(e) => {
        setIsHovered(false);
        onDrop(e);
      }}
      className="card flex h-full flex-col overflow-hidden"
      style={gridStyle}
    >
      <div
        className="card-header flex items-center justify-between border-b px-4 py-3"
        style={{
          borderColor: 'var(--border-subtle)',
          cursor: isCustomizing ? 'grab' : 'default',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCustomizing && (
            <ArrowsUpDownIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
          )}
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>

        {isCustomizing && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Predefined Size Picker Dropdown */}
            <div className="relative flex items-center gap-1 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
              <QueueListIcon className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
              <select
                aria-label="Change widget size"
                value={`${w}-${h}`}
                onChange={(e) => {
                  const [nw, nh] = e.target.value.split('-').map(Number);
                  onSizeChange(nw, nh);
                }}
                className="bg-transparent pr-4 font-medium focus:outline-none cursor-pointer text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {allowedSizes.map(([sw, sh]) => (
                  <option key={`${sw}-${sh}`} value={`${sw}-${sh}`} className="bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                    {sizeText([sw, sh])}
                  </option>
                ))}
              </select>
            </div>

            {/* Hide/Disable Widget Button */}
            <button
              type="button"
              onClick={onHide}
              title="Hide Widget"
              className="rounded p-1 transition-colors hover:bg-stone-200 dark:hover:bg-stone-800"
              style={{ color: 'var(--text-secondary)' }}
            >
              <EyeSlashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="card-body flex-1 overflow-hidden p-4">
        {children}
      </div>
    </article>
  );
}
