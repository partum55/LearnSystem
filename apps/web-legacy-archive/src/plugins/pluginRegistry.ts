import {
  PluginRegistration,
  RouteRegistration,
  NavItemRegistration,
  WidgetRegistration,
  CourseTabExtension,
} from './types';
import { UserRole } from '../types';

class PluginRegistry {
  private plugins: Map<string, PluginRegistration> = new Map();

  register(plugin: PluginRegistration): void {
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  getRoutes(): RouteRegistration[] {
    return Array.from(this.plugins.values()).flatMap(p => p.routes ?? []);
  }

  getNavItems(role: UserRole): NavItemRegistration[] {
    return Array.from(this.plugins.values())
      .flatMap(p => p.navItems ?? [])
      .filter(item => !item.roles || item.roles.includes(role))
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  getWidgets(role: UserRole): WidgetRegistration[] {
    return Array.from(this.plugins.values())
      .flatMap(p => p.widgets ?? [])
      .filter(w => !w.roles || w.roles.includes(role));
  }

  getCourseTabExtensions(role: UserRole): CourseTabExtension[] {
    return Array.from(this.plugins.values())
      .flatMap(p => p.courseTabExtensions ?? [])
      .filter(t => !t.roles || t.roles.includes(role));
  }

  getPlugin(id: string): PluginRegistration | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginRegistry = new PluginRegistry();
