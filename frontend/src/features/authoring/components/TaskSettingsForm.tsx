import React from 'react';
import { Input } from '../../../components/Input';
import { TaskSettings } from '../types';

interface TaskSettingsFormProps {
  settings: TaskSettings;
  onChange: (value: TaskSettings) => void;
  readOnly?: boolean;
}

const TaskSettingsForm: React.FC<TaskSettingsFormProps> = ({ settings, onChange, readOnly = false }) => {
  const updateField = (field: keyof TaskSettings, value: TaskSettings[keyof TaskSettings]) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Time Limit (minutes)"
          type="number"
          min={0}
          value={settings.timeLimitMinutes ?? ''}
          disabled={readOnly}
          onChange={(event) => updateField('timeLimitMinutes', event.target.value ? Number(event.target.value) : undefined)}
        />
        <Input
          label="Attempts Allowed"
          type="number"
          min={1}
          value={settings.attemptsAllowed ?? 1}
          disabled={readOnly}
          onChange={(event) => updateField('attemptsAllowed', Number(event.target.value))}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grading Mode</label>
          <select
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2"
            value={settings.gradingMode}
            disabled={readOnly}
            onChange={(event) => updateField('gradingMode', event.target.value as TaskSettings['gradingMode'])}
          >
            <option value="AUTO">Auto</option>
            <option value="MANUAL">Manual</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.allowLateSubmission ?? false}
            disabled={readOnly}
            onChange={(event) => updateField('allowLateSubmission', event.target.checked)}
          />
          Allow late submission
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.draftState === 'PUBLISHED'}
            disabled={readOnly}
            onChange={(event) => updateField('draftState', event.target.checked ? 'PUBLISHED' : 'DRAFT')}
          />
          Published
        </label>
      </div>
    </section>
  );
};

export default TaskSettingsForm;
