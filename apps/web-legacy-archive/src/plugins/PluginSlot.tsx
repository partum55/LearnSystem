import React from 'react';
import { pluginRegistry } from './pluginRegistry';
import { PluginErrorBoundary } from './PluginErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

interface PluginSlotProps {
  name: 'dashboard-widgets' | 'course-tabs';
  courseId?: string;
}

export function PluginSlot({ name, courseId }: PluginSlotProps): React.ReactElement | null {
  const user = useAuthStore(state => state.user);
  const role: UserRole | undefined = user?.role;

  if (!role) return null;

  if (name === 'dashboard-widgets') {
    const widgets = pluginRegistry.getWidgets(role);

    if (widgets.length === 0) return null;

    return (
      <>
        {widgets.map(widget => (
          <PluginErrorBoundary key={widget.id} pluginId={widget.id}>
            <widget.component courseId={courseId} userId={user?.id} />
          </PluginErrorBoundary>
        ))}
      </>
    );
  }

  if (name === 'course-tabs') {
    const tabs = pluginRegistry.getCourseTabExtensions(role);

    if (tabs.length === 0) return null;

    if (!courseId) {
      console.warn('[PluginSlot] course-tabs slot requires a courseId prop.');
      return null;
    }

    return (
      <>
        {tabs.map(tab => (
          <PluginErrorBoundary key={tab.tabId} pluginId={tab.tabId}>
            <tab.component courseId={courseId} />
          </PluginErrorBoundary>
        ))}
      </>
    );
  }

  return null;
}
