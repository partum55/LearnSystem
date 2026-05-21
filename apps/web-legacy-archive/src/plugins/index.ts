export { pluginRegistry } from './pluginRegistry';
export { PluginErrorBoundary } from './PluginErrorBoundary';
export { PluginSlot } from './PluginSlot';
export { usePluginApi } from './usePluginApi';
export type * from './types';

import i18n from '../i18n/config';
import { PluginRegistration } from './types';

export function loadPluginTranslations(plugin: PluginRegistration): void {
  if (plugin.translations) {
    Object.entries(plugin.translations).forEach(([locale, keys]) => {
      i18n.addResourceBundle(locale, 'translation', keys, true, true);
    });
  }
}
