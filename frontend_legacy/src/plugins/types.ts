import React from 'react';
import { UserRole } from '../types';

export type PluginType = 'ACTIVITY' | 'REPORT' | 'BLOCK' | 'INTEGRATION' | 'THEME';
export type PluginStatus = 'ENABLED' | 'DISABLED' | 'ERROR';

export interface PluginRegistration {
  id: string;
  name: string;
  type: PluginType;
  version: string;
  routes?: RouteRegistration[];
  navItems?: NavItemRegistration[];
  widgets?: WidgetRegistration[];
  translations?: Record<string, Record<string, unknown>>;
  courseTabExtensions?: CourseTabExtension[];
}

export interface RouteRegistration {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  roles?: UserRole[];
}

export interface NavItemRegistration {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles?: UserRole[];
  section?: 'main' | 'tools' | 'admin';
  order?: number;
}

export interface WidgetProps {
  courseId?: string;
  userId?: string;
}

export interface WidgetRegistration {
  id: string;
  component: React.ComponentType<WidgetProps>;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'full';
  roles?: UserRole[];
}

export interface CourseTabExtension {
  tabId: string;
  label: string;
  component: React.ComponentType<{ courseId: string }>;
  roles?: UserRole[];
}

// API types matching backend DTOs
export interface InstalledPlugin {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  status: PluginStatus;
  permissions: string[];
  config: Record<string, string>;
  installedAt: string;
}
