import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import { Assignment } from '../../../types';
import api from '../../../api/client';

interface SettingsStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  validationErrors: Record<string, string>;
  courseId: string;
}

const FILE_TYPE_OPTIONS = ['.pdf', '.docx', '.doc', '.txt', '.zip', '.py', '.java', '.js', '.ts', '.cpp', '.c', '.png', '.jpg', '.jpeg'];

const SettingsStep: React.FC<SettingsStepProps> = ({ formData, onChange, validationErrors, courseId }) => {
  const { t } = useTranslation();
  const isFileUpload = formData.assignment_type === 'FILE_UPLOAD';
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!courseId) return;
    api.get<{ content?: Assignment[] }>(`/assessments/assignments/course/${courseId}`)
      .then(res => setAvailableAssignments(res.data?.content || []))
      .catch(() => {});
  }, [courseId]);

  const toggleFileType = (type: string) => {
    const current = formData.allowed_file_types;
    if (current.includes(type)) {
      onChange({ allowed_file_types: current.filter(t => t !== type) });
    } else {
      onChange({ allowed_file_types: [...current, type] });
    }
  };

  const togglePrerequisite = (id: string) => {
    const current = formData.prerequisites;
    if (current.includes(id)) {
      onChange({ prerequisites: current.filter(p => p !== id) });
    } else {
      onChange({ prerequisites: [...current, id] });
    }
  };

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.settingsTitle', 'Assignment settings')}
      </h2>

      {/* Schedule */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="wizard-available-from">
            {t('assignment.available_from', 'Available from')}
          </label>
          <input
            id="wizard-available-from"
            type="datetime-local"
            value={formData.available_from}
            onChange={(e) => onChange({ available_from: e.target.value })}
            className="input w-full"
          />
        </div>
        <div>
          <label className="label" htmlFor="wizard-due-date">
            {t('assignment.due_date', 'Due date')}
          </label>
          <input
            id="wizard-due-date"
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => onChange({ due_date: e.target.value })}
            className={`input w-full ${validationErrors.due_date ? 'input-error' : ''}`}
          />
          {validationErrors.due_date && (
            <p className="error-text mt-1">{t(`validation.${validationErrors.due_date}`, validationErrors.due_date)}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="wizard-available-until">
            {t('assignments.availableUntil', 'Available until')}
          </label>
          <input
            id="wizard-available-until"
            type="datetime-local"
            value={formData.available_until}
            onChange={(e) => onChange({ available_until: e.target.value })}
            className="input w-full"
          />
        </div>
      </div>

      {/* File upload settings */}
      {isFileUpload && (
        <div
          className="p-4 rounded-lg space-y-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('assignment.file_upload_settings', 'File upload settings')}
          </h3>

          <div>
            <label className="label text-xs">{t('assignment.allowed_file_types', 'Allowed file types')}</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FILE_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFileType(type)}
                  className="px-2.5 py-1 text-xs rounded-full transition-colors"
                  style={{
                    background: formData.allowed_file_types.includes(type) ? 'var(--text-primary)' : 'var(--bg-overlay)',
                    color: formData.allowed_file_types.includes(type) ? 'var(--bg-base)' : 'var(--text-muted)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-xs" htmlFor="wizard-max-files">
                {t('assignment.max_files', 'Max files')}
              </label>
              <input
                id="wizard-max-files"
                type="number"
                min={1}
                max={20}
                value={formData.max_files}
                onChange={(e) => onChange({ max_files: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label text-xs" htmlFor="wizard-max-file-size">
                {t('assignment.max_file_size', 'Max file size (MB)')}
              </label>
              <input
                id="wizard-max-file-size"
                type="number"
                min={1}
                value={Math.round(formData.max_file_size / 1048576)}
                onChange={(e) => onChange({ max_file_size: Number(e.target.value) * 1048576 })}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Late submission */}
      <div
        className="p-4 rounded-lg space-y-3"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {t('assignment.late_submission_settings', 'Late submission settings')}
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allow_late_submission}
            onChange={(e) => onChange({ allow_late_submission: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('assignment.allow_late_submission', 'Allow late submission')}
          </span>
        </label>
        {formData.allow_late_submission && (
          <div className="ml-8">
            <label className="label text-xs" htmlFor="wizard-late-penalty">
              {t('assignment.late_penalty_percent', 'Late penalty (%)')}
            </label>
            <input
              id="wizard-late-penalty"
              type="number"
              min={0}
              max={100}
              value={formData.late_penalty_percent}
              onChange={(e) => onChange({ late_penalty_percent: Number(e.target.value) })}
              className="input w-24"
            />
          </div>
        )}
      </div>

      {/* Additional settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="wizard-duration">
            {t('assignment.estimated_duration', 'Estimated duration (minutes)')}
          </label>
          <input
            id="wizard-duration"
            type="number"
            min={0}
            value={formData.estimated_duration ?? ''}
            onChange={(e) => onChange({ estimated_duration: e.target.value ? Number(e.target.value) : null })}
            placeholder="60"
            className="input w-full"
          />
        </div>
        <div>
          <label className="label" htmlFor="wizard-tags">
            {t('assignment.tags', 'Tags')}
          </label>
          <input
            id="wizard-tags"
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => onChange({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder={t('keyword1, keyword2, keyword3')}
            className="input w-full"
          />
        </div>
      </div>

      {/* Prerequisites */}
      {availableAssignments.length > 0 && (
        <div>
          <label className="label">{t('assignment.prerequisites', 'Prerequisites')}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {availableAssignments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => togglePrerequisite(a.id)}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{
                  background: formData.prerequisites.includes(a.id) ? 'var(--text-primary)' : 'var(--bg-overlay)',
                  color: formData.prerequisites.includes(a.id) ? 'var(--bg-base)' : 'var(--text-muted)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {a.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsStep;
