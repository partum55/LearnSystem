'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { BoltIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ApiError, extractErrorMessage, normalizeApiError } from '@/api/client';
import { aiErrorMessage } from '@/features/ai/components/AiErrorDisplay';
import { useAiSettings, useDeleteAiApiKey, useSaveAiApiKey, useTestAiConnection } from '@/features/ai/hooks/useAiSettings';

type Message = { type: 'success' | 'error'; text: string } | null;

export function AiSettingsPanel() {
  const { data: settings, isLoading } = useAiSettings();
  const saveKey = useSaveAiApiKey();
  const deleteKey = useDeleteAiApiKey();
  const testConnection = useTestAiConnection();
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (settings) {
      setApiKey('');
    }
  }, [settings]);

  const status = useMemo(() => {
    if (!settings) return { label: 'No key configured', className: 'badge' };
    if (!settings.aiEnabled) return { label: 'AI disabled', className: 'badge badge-warning' };
    if (settings.effectiveKeySource === 'SYSTEM_KEY') {
      return { label: 'Admin using system Gemini key', className: 'badge badge-success' };
    }
    if (settings.hasUserApiKey) return { label: 'User key active', className: 'badge badge-success' };
    return { label: 'No key configured', className: 'badge' };
  }, [settings]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await saveKey.mutateAsync({ provider: 'GEMINI', apiKey });
      setApiKey('');
      setMessage({ type: 'success', text: 'Gemini API key saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: extractErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    setMessage(null);
    try {
      await deleteKey.mutateAsync();
      setApiKey('');
      setMessage({ type: 'success', text: 'Gemini API key deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: extractErrorMessage(error) });
    }
  };

  const handleTestConnection = async () => {
    setMessage(null);
    try {
      const result = await testConnection.mutateAsync();
      setMessage({ type: 'success', text: result.status === 'OK' ? 'Gemini connection OK.' : result.message });
    } catch (error) {
      const normalized = normalizeApiError(error);
      setMessage({
        type: 'error',
        text: aiErrorMessage(new ApiError(normalized)),
      });
    }
  };

  return (
    <section id="ai-settings" className="card">
      <div className="card-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-base font-semibold">AI Settings</h2>
        </div>
        <span className={status.className}>{status.label}</span>
      </div>

      <div className="card-body space-y-4">
        {message && (
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
              background: message.type === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              color: message.type === 'success' ? 'var(--fn-success)' : 'var(--fn-error)',
            }}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <label className="input-group">
            <span className="label">Provider</span>
            <select className="input" value="GEMINI" disabled>
              <option value="GEMINI">Gemini</option>
            </select>
          </label>

          <div className="input-group">
            <span className="label">Current key</span>
            <div
              className="flex min-h-10 items-center rounded-md border px-3 text-sm"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}
            >
              {isLoading ? (
                <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
              ) : settings?.maskedKey ? (
                <span className="font-mono">{settings.maskedKey}</span>
              ) : settings?.effectiveKeySource === 'SYSTEM_KEY' ? (
                <span style={{ color: 'var(--text-muted)' }}>System Gemini key available for admin</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No personal key saved</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="input-group">
            <span className="label">{settings?.hasUserApiKey ? 'Replace Gemini API key' : 'Gemini API key'}</span>
            <input
              className="input font-mono"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              required
            />
          </label>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your key is encrypted and never shown again after saving.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            Create a Gemini API key in Google AI Studio.
          </a>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={testConnection.isPending || isLoading}
            >
              <BoltIcon className="h-4 w-4" />
              {testConnection.isPending ? 'Testing...' : 'Test connection'}
            </button>
            {settings?.hasUserApiKey && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteKey.isPending}
              >
                <TrashIcon className="h-4 w-4" />
                {deleteKey.isPending ? 'Deleting...' : 'Delete key'}
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saveKey.isPending || !apiKey.trim()}>
              <KeyIcon className="h-4 w-4" />
              {saveKey.isPending ? 'Saving...' : settings?.hasUserApiKey ? 'Replace key' : 'Save key'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
