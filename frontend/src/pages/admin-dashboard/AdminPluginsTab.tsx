import React, { useCallback, useEffect, useState } from 'react';
import {
  Cog6ToothIcon,
  SparklesIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  disablePlugin,
  enablePlugin,
  getInstalledPlugins,
  getPluginConfig,
  type InstalledPlugin,
  type PluginConfig,
  type PluginStatus,
  type PluginType,
  uninstallPlugin,
  updatePluginConfig,
} from '../../api/plugins';
import {
  diagnosePlugin,
  generateAndInstallPlugin,
  suggestPluginConfig,
  type PluginDiagnosisResponse,
  type PluginConfigSuggestionResponse,
} from '../../api/aiPlugins';
import { Loading } from '../../components/Loading';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PluginStatus, { label: string; color: string; bg: string; border: string }> = {
  ENABLED: {
    label: 'Enabled',
    color: 'var(--fn-success)',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.20)',
  },
  DISABLED: {
    label: 'Disabled',
    color: 'var(--text-muted)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'var(--border-default)',
  },
  ERROR: {
    label: 'Error',
    color: 'var(--fn-error)',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.20)',
  },
};

const TYPE_LABELS: Record<PluginType, string> = {
  ACTIVITY: 'Activity',
  REPORT: 'Report',
  BLOCK: 'Block',
  INTEGRATION: 'Integration',
  THEME: 'Theme',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: PluginStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DISABLED;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
};

interface TypeBadgeProps {
  type: PluginType;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    style={{
      color: 'var(--text-secondary)',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid var(--border-subtle)',
    }}
  >
    {TYPE_LABELS[type] ?? type}
  </span>
);

// ─── Plugin Settings Modal ────────────────────────────────────────────────────

interface PluginSettingsModalProps {
  plugin: InstalledPlugin;
  onClose: () => void;
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

const PluginSettingsModal: React.FC<PluginSettingsModalProps> = ({ plugin, onClose, onFeedback }) => {
  const [config, setConfig] = useState<PluginConfig>(plugin.config);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await getPluginConfig(plugin.pluginId);
        if (!cancelled) setConfig(data);
      } catch {
        if (!cancelled) setConfig(plugin.config);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchConfig();
    return () => { cancelled = true; };
  }, [plugin.pluginId, plugin.config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePluginConfig(plugin.pluginId, config);
      onFeedback('success', `Config for "${plugin.name}" saved.`);
      onClose();
    } catch {
      onFeedback('error', `Failed to save config for "${plugin.name}".`);
    } finally {
      setSaving(false);
    }
  };

  const configKeys = Object.keys(config);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={`Settings for ${plugin.name}`}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {plugin.name} — Settings
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              v{plugin.version} by {plugin.author}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close settings"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <Loading />
          ) : configKeys.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              This plugin has no configurable settings.
            </p>
          ) : (
            configKeys.map((key) => {
              const currentValue = config[key] ?? '';
              return (
                <div key={key}>
                  <label className="block">
                    <span
                      className="text-xs font-medium block mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {key}
                    </span>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={String(currentValue)}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </label>
                </div>
              );
            })
          )}
        </div>

        {!loading && (
          <div
            className="flex justify-end gap-2 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={saving}
            >
              Cancel
            </button>
            {configKeys.length > 0 && (
              <button
                type="button"
                onClick={() => { void handleSave(); }}
                className="btn btn-primary btn-sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AI Generate Plugin Modal ────────────────────────────────────────────────

interface AiGenerateModalProps {
  onClose: () => void;
  onFeedback: (type: 'success' | 'error', message: string) => void;
  onInstalled: () => void;
}

const AiGenerateModal: React.FC<AiGenerateModalProps> = ({ onClose, onFeedback, onInstalled }) => {
  const [description, setDescription] = useState('');
  const [pluginName, setPluginName] = useState('');
  const [pluginType, setPluginType] = useState('OTHER');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    try {
      const result = await generateAndInstallPlugin({
        description,
        pluginName: pluginName || undefined,
        pluginType,
      });
      if (result.installed) {
        onFeedback('success', `Plugin "${result.pluginName}" generated and installed.`);
        onInstalled();
        onClose();
      } else {
        onFeedback('error', result.installMessage);
      }
    } catch {
      onFeedback('error', 'Failed to generate plugin.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="AI Plugin Generator"
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
            <h3
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              AI Plugin Generator
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Plugin Name (optional)
            </span>
            <input
              type="text"
              className="input w-full text-sm"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              placeholder="e.g. Course Analytics Dashboard"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Plugin Type
            </span>
            <select
              className="input w-full text-sm"
              value={pluginType}
              onChange={(e) => setPluginType(e.target.value)}
            >
              <option value="ANALYTICS">Analytics</option>
              <option value="CONTENT">Content</option>
              <option value="ASSESSMENT">Assessment</option>
              <option value="INTEGRATION">Integration</option>
              <option value="NOTIFICATION">Notification</option>
              <option value="THEME">Theme</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Description *
            </span>
            <textarea
              className="input w-full text-sm"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the plugin should do..."
            />
          </label>
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={generating}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleGenerate(); }}
            className="btn btn-primary btn-sm"
            disabled={generating || !description.trim()}
          >
            {generating ? 'Generating...' : 'Generate & Install'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Diagnostics Modal ────────────────────────────────────────────────────

interface AiDiagnosticsModalProps {
  plugin: InstalledPlugin;
  onClose: () => void;
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

const AiDiagnosticsModal: React.FC<AiDiagnosticsModalProps> = ({ plugin, onClose, onFeedback }) => {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState<PluginDiagnosisResponse | null>(null);
  const [configSuggestion, setConfigSuggestion] = useState<PluginConfigSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'diagnose' | 'config'>('diagnose');

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      const result = await diagnosePlugin(plugin.pluginId, { symptoms, recentLogLines: 100 });
      setDiagnosis(result);
    } catch {
      onFeedback('error', 'Failed to diagnose plugin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestConfig = async () => {
    setLoading(true);
    try {
      const result = await suggestPluginConfig(plugin.pluginId, {});
      setConfigSuggestion(result);
    } catch {
      onFeedback('error', 'Failed to get config suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'var(--fn-error)';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return 'var(--fn-warning)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={`AI Diagnostics for ${plugin.name}`}
    >
      <div
        className="w-full max-w-2xl rounded-xl shadow-xl"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
            <h3
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              AI Diagnostics — {plugin.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3">
          {(['diagnose', 'config'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{
                background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                border: tab === t ? '1px solid var(--border-default)' : '1px solid transparent',
              }}
              onClick={() => setTab(t)}
            >
              {t === 'diagnose' ? 'Health Diagnosis' : 'Config Suggestions'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {tab === 'diagnose' && (
            <>
              <label className="block">
                <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Describe symptoms (optional)
                </span>
                <textarea
                  className="input w-full text-sm"
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Plugin returns 500 errors on /report endpoint..."
                />
              </label>
              <button
                type="button"
                onClick={() => { void handleDiagnose(); }}
                className="btn btn-primary btn-sm"
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Run Diagnosis'}
              </button>

              {diagnosis && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Severity:</span>
                    <span className="text-xs font-semibold" style={{ color: severityColor(diagnosis.severity) }}>
                      {diagnosis.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Root Cause</span>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{diagnosis.rootCause}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Suggested Fixes</span>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnosis.suggestedFixes.map((fix, i) => (
                        <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                  {diagnosis.explanation && (
                    <div>
                      <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Explanation</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{diagnosis.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'config' && (
            <>
              <button
                type="button"
                onClick={() => { void handleSuggestConfig(); }}
                className="btn btn-primary btn-sm"
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Get AI Config Suggestions'}
              </button>

              {configSuggestion && (
                <div className="space-y-2 mt-3">
                  <div>
                    <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Suggested Configuration</span>
                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)' }}>
                      {Object.entries(configSuggestion.suggestedConfig).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1">
                          <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {configSuggestion.reasoning && (
                    <div>
                      <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Reasoning</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{configSuggestion.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="flex justify-end px-5 py-4"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Plugin Row ───────────────────────────────────────────────────────────────

interface PluginRowProps {
  plugin: InstalledPlugin;
  actionLoadingId: string | null;
  onToggle: (plugin: InstalledPlugin) => void;
  onSettings: (plugin: InstalledPlugin) => void;
  onDiagnose: (plugin: InstalledPlugin) => void;
  onUninstall: (plugin: InstalledPlugin) => void;
}

const PluginRow: React.FC<PluginRowProps> = ({
  plugin,
  actionLoadingId,
  onToggle,
  onSettings,
  onDiagnose,
  onUninstall,
}) => {
  const isActing = actionLoadingId === plugin.pluginId;

  return (
    <tr>
      <td>
        <div style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">
          {plugin.name}
        </div>
        {plugin.description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {plugin.description}
          </div>
        )}
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
          by {plugin.author}
        </div>
      </td>

      <td>
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          v{plugin.version}
        </span>
      </td>

      <td>
        <TypeBadge type={plugin.type} />
      </td>

      <td>
        <StatusBadge status={plugin.status} />
      </td>

      <td>
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => onToggle(plugin)}
            disabled={isActing || plugin.status === 'ERROR'}
            className="btn btn-secondary btn-xs"
            title={plugin.status === 'ENABLED' ? 'Disable plugin' : 'Enable plugin'}
          >
            {isActing
              ? '...'
              : plugin.status === 'ENABLED'
              ? 'Disable'
              : 'Enable'}
          </button>

          <button
            type="button"
            onClick={() => onDiagnose(plugin)}
            disabled={isActing}
            className="btn btn-secondary btn-xs"
            title="AI Diagnostics"
            aria-label={`AI Diagnostics for ${plugin.name}`}
          >
            <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSettings(plugin)}
            disabled={isActing}
            className="btn btn-secondary btn-xs"
            title="Plugin settings"
            aria-label={`Settings for ${plugin.name}`}
          >
            <Cog6ToothIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onUninstall(plugin)}
            disabled={isActing}
            className="btn btn-xs"
            title="Uninstall plugin"
            aria-label={`Uninstall ${plugin.name}`}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: 'var(--fn-error)',
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminPluginsTabProps {
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const AdminPluginsTab: React.FC<AdminPluginsTabProps> = ({ onFeedback }) => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [settingsPlugin, setSettingsPlugin] = useState<InstalledPlugin | null>(null);
  const [diagnosticsPlugin, setDiagnosticsPlugin] = useState<InstalledPlugin | null>(null);
  const [showAiGenerate, setShowAiGenerate] = useState(false);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstalledPlugins();
      setPlugins(data);
    } catch {
      onFeedback('error', 'Failed to load plugins.');
    } finally {
      setLoading(false);
    }
  }, [onFeedback]);

  useEffect(() => { void loadPlugins(); }, [loadPlugins]);

  const handleToggle = useCallback(async (plugin: InstalledPlugin) => {
    setActionLoadingId(plugin.pluginId);
    try {
      if (plugin.status === 'ENABLED') {
        await disablePlugin(plugin.pluginId);
        onFeedback('success', `"${plugin.name}" disabled.`);
      } else {
        await enablePlugin(plugin.pluginId);
        onFeedback('success', `"${plugin.name}" enabled.`);
      }
      await loadPlugins();
    } catch {
      onFeedback('error', `Failed to change status for "${plugin.name}".`);
    } finally {
      setActionLoadingId(null);
    }
  }, [loadPlugins, onFeedback]);

  const handleUninstall = useCallback(async (plugin: InstalledPlugin) => {
    if (!window.confirm(`Uninstall plugin "${plugin.name}"? This action cannot be undone.`)) return;
    setActionLoadingId(plugin.pluginId);
    try {
      await uninstallPlugin(plugin.pluginId);
      onFeedback('success', `"${plugin.name}" uninstalled.`);
      await loadPlugins();
    } catch {
      onFeedback('error', `Failed to uninstall "${plugin.name}".`);
    } finally {
      setActionLoadingId(null);
    }
  }, [loadPlugins, onFeedback]);

  const total = plugins.length;
  const enabled = plugins.filter((p) => p.status === 'ENABLED').length;
  const disabled = plugins.filter((p) => p.status === 'DISABLED').length;
  const errored = plugins.filter((p) => p.status === 'ERROR').length;

  return (
    <div className="space-y-4">
      {settingsPlugin && (
        <PluginSettingsModal
          plugin={settingsPlugin}
          onClose={() => setSettingsPlugin(null)}
          onFeedback={onFeedback}
        />
      )}
      {diagnosticsPlugin && (
        <AiDiagnosticsModal
          plugin={diagnosticsPlugin}
          onClose={() => setDiagnosticsPlugin(null)}
          onFeedback={onFeedback}
        />
      )}
      {showAiGenerate && (
        <AiGenerateModal
          onClose={() => setShowAiGenerate(false)}
          onFeedback={onFeedback}
          onInstalled={() => { void loadPlugins(); }}
        />
      )}

      {loading && plugins.length === 0 ? (
        <Loading />
      ) : (
        <>
          {/* Header with AI Generate button */}
          <div className="flex items-center justify-between">
            <div className="grid gap-3 md:grid-cols-4 flex-1">
              {[
                { label: 'Total', value: total, color: undefined as string | undefined },
                { label: 'Enabled', value: enabled, color: 'var(--fn-success)' as string | undefined },
                { label: 'Disabled', value: disabled, color: undefined as string | undefined },
                {
                  label: 'Errors',
                  value: errored,
                  color: (errored > 0 ? 'var(--fn-error)' : undefined) as string | undefined,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg p-4"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                  <p
                    className="text-lg font-semibold mt-0.5"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: stat.color ?? 'var(--text-primary)',
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Generate button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAiGenerate(true)}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            >
              <SparklesIcon className="h-4 w-4" />
              AI Generate Plugin
            </button>
          </div>

          {plugins.length === 0 ? (
            <div
              className="rounded-lg p-12 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No plugins installed
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Installed plugins will appear here once added to the system.
              </p>
            </div>
          ) : (
            <div
              className="table-container rounded-lg"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Plugin</th>
                    <th>Version</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plugins.map((plugin) => (
                    <PluginRow
                      key={plugin.pluginId}
                      plugin={plugin}
                      actionLoadingId={actionLoadingId}
                      onToggle={(p) => { void handleToggle(p); }}
                      onSettings={setSettingsPlugin}
                      onDiagnose={setDiagnosticsPlugin}
                      onUninstall={(p) => { void handleUninstall(p); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {plugins.length > 0 && (
            <div className="text-right text-xs" style={{ color: 'var(--text-faint)' }}>
              {total} plugin{total !== 1 ? 's' : ''} installed
            </div>
          )}
        </>
      )}
    </div>
  );
};
