import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FormField {
  fieldId: string;
  fieldType: string;
  label: string;
  required: boolean;
  placeholder: string;
  options: string;
}

interface RepeatableGroup {
  groupId: string;
  label: string;
  minItems: number;
  maxItems: number;
  fields: FormField[];
}

interface FormSubmissionRendererProps {
  fields: FormField[];
  groups: RepeatableGroup[];
  onSubmit: (formData: Record<string, unknown>) => void;
  submitting?: boolean;
}

const FormSubmissionRenderer: React.FC<FormSubmissionRendererProps> = ({
  fields,
  groups,
  onSubmit,
  submitting = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [groupData, setGroupData] = useState<Record<string, Array<Record<string, unknown>>>>(() => {
    const initial: Record<string, Array<Record<string, unknown>>> = {};
    for (const group of groups) {
      initial[group.groupId] = [{}];
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const updateGroupField = (groupId: string, entryIndex: number, fieldId: string, value: unknown) => {
    setGroupData((prev) => {
      const entries = [...(prev[groupId] || [])];
      entries[entryIndex] = { ...entries[entryIndex], [fieldId]: value };
      return { ...prev, [groupId]: entries };
    });
  };

  const addGroupEntry = (groupId: string, maxItems: number) => {
    setGroupData((prev) => {
      const entries = prev[groupId] || [];
      if (entries.length >= maxItems) return prev;
      return { ...prev, [groupId]: [...entries, {}] };
    });
  };

  const removeGroupEntry = (groupId: string, index: number, minItems: number) => {
    setGroupData((prev) => {
      const entries = prev[groupId] || [];
      if (entries.length <= minItems) return prev;
      return { ...prev, [groupId]: entries.filter((_, i) => i !== index) };
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.fieldId];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          newErrors[field.fieldId] = t('validation.required', 'Required field');
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const allData = { ...formData };
    for (const [groupId, entries] of Object.entries(groupData)) {
      allData[groupId] = entries;
    }
    onSubmit(allData);
  };

  const renderField = (field: FormField, value: unknown, onChange: (val: unknown) => void) => {
    const commonProps = {
      className: `input w-full ${errors[field.fieldId] ? 'input-error' : ''}`,
      placeholder: field.placeholder,
    };

    switch (field.fieldType) {
      case 'text-single':
        return (
          <input
            type="text"
            {...commonProps}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'text-multi':
        return (
          <textarea
            {...commonProps}
            rows={4}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            {...commonProps}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            {...commonProps}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{field.label}</span>
          </label>
        );
      case 'dropdown': {
        const options = field.options.split(',').map((o) => o.trim()).filter(Boolean);
        return (
          <select {...commonProps} value={String(value || '')} onChange={(e) => onChange(e.target.value)}>
            <option value="">{field.placeholder || t('common.select', 'Select')}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      case 'file':
        return (
          <input
            type="file"
            className="input w-full"
            onChange={(e) => onChange(e.target.files?.[0]?.name || '')}
          />
        );
      default:
        return (
          <input
            type="text"
            {...commonProps}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Regular fields */}
      {fields.map((field) => (
        <div key={field.fieldId}>
          {field.fieldType !== 'checkbox' && (
            <label className="label" style={{ color: 'var(--text-secondary)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--fn-error)' }}> *</span>}
            </label>
          )}
          {renderField(field, formData[field.fieldId], (val) => updateField(field.fieldId, val))}
          {errors[field.fieldId] && (
            <p className="text-xs mt-1" style={{ color: 'var(--fn-error)' }}>{errors[field.fieldId]}</p>
          )}
        </div>
      ))}

      {/* Repeatable groups */}
      {groups.map((group) => (
        <div
          key={group.groupId}
          className="rounded-lg p-4"
          style={{ border: '1px dashed var(--border-default)' }}
        >
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {group.label}
          </h4>
          {(groupData[group.groupId] || []).map((entry, entryIndex) => (
            <div
              key={entryIndex}
              className="rounded p-3 mb-2 space-y-3"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  #{entryIndex + 1}
                </span>
                {(groupData[group.groupId]?.length || 0) > group.minItems && (
                  <button
                    type="button"
                    className="text-xs"
                    style={{ color: 'var(--fn-error)' }}
                    onClick={() => removeGroupEntry(group.groupId, entryIndex, group.minItems)}
                  >
                    {t('common.delete', 'Remove')}
                  </button>
                )}
              </div>
              {group.fields.map((field) => (
                <div key={field.fieldId}>
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {field.label}
                    {field.required && <span style={{ color: 'var(--fn-error)' }}> *</span>}
                  </label>
                  {renderField(field, entry[field.fieldId], (val) =>
                    updateGroupField(group.groupId, entryIndex, field.fieldId, val)
                  )}
                </div>
              ))}
            </div>
          ))}
          {(groupData[group.groupId]?.length || 0) < group.maxItems && (
            <button
              type="button"
              className="btn btn-xs mt-2"
              onClick={() => addGroupEntry(group.groupId, group.maxItems)}
            >
              + {t('form.addAnother', 'Add another')}
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? t('submission.submitting', 'Submitting...') : t('submission.submit', 'Submit')}
      </button>
    </div>
  );
};

export default FormSubmissionRenderer;
