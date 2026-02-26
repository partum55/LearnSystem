import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Assignment } from '../../../types';
import api from '../../../api/client';
import { WizardFormData } from '../wizardTypes';
import { apiResponseToWizardData } from '../wizardMapper';

interface TemplatePickerModalProps {
  courseId: string;
  onSelect: (data: Partial<WizardFormData>) => void;
  onClose: () => void;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  courseId,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Assignment[]>([]);
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
  const loading = Boolean(courseId) && loadedCourseId !== courseId;

  useEffect(() => {
    if (!courseId) return;

    let active = true;
    api.get<{ content?: Assignment[] }>(`/assessments/assignments/course/${courseId}`, {
      params: { isTemplate: true },
    })
      .then((res) => {
        if (!active) return;
        const data = res.data?.content || [];
        setTemplates(data.filter((a: Assignment) => (a as unknown as Record<string, unknown>).is_template || (a as unknown as Record<string, unknown>).isTemplate));
      })
      .catch(() => {
        if (!active) return;
        setTemplates([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadedCourseId(courseId);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const visibleTemplates = courseId ? templates : [];

  const handleSelect = async (assignment: Assignment) => {
    try {
      const response = await api.get<Record<string, unknown>>(`/assessments/assignments/${assignment.id}`);
      const wizardData = apiResponseToWizardData(response.data);
      // Clear IDs so it creates a new assignment
      onSelect({ ...wizardData, is_template: false });
      onClose();
    } catch {
      // silently fail
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg p-6 space-y-4 max-h-[70vh] flex flex-col"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {t('templates.picker.title', 'Choose a Template')}
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-active)]">
              <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full" style={{ borderBottom: '2px solid var(--text-primary)' }} />
              </div>
            ) : visibleTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('templates.picker.empty', 'No templates available. Save an assignment as a template first.')}
                </p>
              </div>
            ) : (
              visibleTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => void handleSelect(tmpl)}
                  className="w-full text-left p-3 rounded-lg transition-colors hover:bg-[var(--bg-active)]"
                  style={{ border: '1px solid var(--border-default)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {tmpl.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {tmpl.assignment_type} &middot; {tmpl.max_points} pts
                  </p>
                </button>
              ))
            )}
          </div>

          <button type="button" onClick={onClose} className="btn btn-secondary w-full py-2">
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </>
  );
};

export default TemplatePickerModal;
