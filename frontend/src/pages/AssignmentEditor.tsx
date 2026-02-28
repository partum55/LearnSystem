import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { extractErrorMessage } from '../api/client';
import { Assignment } from '../types';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import {
  AssignmentEditorTabContent,
} from './assignment-editor/AssignmentEditorTabContent';
import { getAssignmentEditorTabs } from './assignment-editor/assignmentEditorTabs';
import { TabTransition } from '../components/animation';
import {
  AssignmentEditorTab,
  AssignmentFormData,
  buildAssignmentPayload,
  initialAssignmentFormData,
  mapAssignmentResponseToFormData,
} from './assignment-editor/assignmentEditorModel';

const AssignmentEditor: React.FC = () => {
  const params = useParams<{ id?: string; assignmentId?: string; courseId?: string; moduleId?: string }>();
  const assignmentId = params.assignmentId || params.id;
  const [searchParams] = useSearchParams();
  const courseId = params.courseId || searchParams.get('courseId') || '';
  const moduleId = params.moduleId || '';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssignmentEditorTab>('basic');

  const [formData, setFormData] = useState<AssignmentFormData>(initialAssignmentFormData);

  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const initialFormDataRef = useRef<string>(JSON.stringify(initialAssignmentFormData));

  const hasUnsavedChanges = useMemo(() => {
    if (saving) return false;
    return JSON.stringify(formData) !== initialFormDataRef.current;
  }, [formData, saving]);

  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedChanges,
    message: t('assignment.unsavedEditorWarning', 'You have unsaved changes to this assignment. Are you sure you want to leave?'),
  });

  useEffect(() => {
    if (assignmentId) {
      void fetchAssignment();
    }
    void fetchAvailableAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const fetchAvailableAssignments = async () => {
    if (!courseId) return;
    try {
      const response = await api.get<{ content?: Assignment[] }>(`/assessments/assignments/course/${courseId}`);
      setAvailableAssignments(response.data?.content || []);
    } catch (fetchError) {
      console.error('Failed to fetch assignments:', fetchError);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = t('validation.required');
    }

    if (!formData.description.trim()) {
      errors.description = t('validation.required');
    }

    if (formData.max_points <= 0) {
      errors.max_points = t('validation.must_be_positive');
    }

    if (formData.due_date && formData.available_from) {
      if (new Date(formData.due_date) < new Date(formData.available_from)) {
        errors.due_date = t('validation.due_before_available');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`);
      const mappedFormData = mapAssignmentResponseToFormData(response.data);
      setFormData(mappedFormData);
      initialFormDataRef.current = JSON.stringify(mappedFormData);
    } catch (fetchError) {
      setError(extractErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      setError(t('validation.fix_errors'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = buildAssignmentPayload(formData, courseId);

      if (assignmentId) {
        await api.put(`/assessments/assignments/${assignmentId}`, payload);
      } else {
        await api.post('/assessments/assignments', payload);
      }
      if (courseId && moduleId) {
        navigate(`/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`);
      } else {
        navigate(courseId ? `/courses/${courseId}` : `/assignments/${assignmentId}`);
      }
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!assignmentId) return;

    try {
      const response = await api.post<{ id: string; courseId?: string; course_id?: string; moduleId?: string; module_id?: string }>(
        `/assessments/assignments/${assignmentId}/duplicate`,
        {
          targetCourseId: courseId || undefined,
          targetModuleId: moduleId || undefined,
        }
      );
      const duplicatedId = String(response.data.id);
      const duplicatedCourseId = String(response.data.courseId || response.data.course_id || courseId || '');
      const duplicatedModuleId = String(response.data.moduleId || response.data.module_id || moduleId || '');

      if (duplicatedCourseId && duplicatedModuleId) {
        navigate(`/courses/${duplicatedCourseId}/modules/${duplicatedModuleId}/assignments/${duplicatedId}`);
      } else if (duplicatedCourseId) {
        navigate(`/courses/${duplicatedCourseId}`);
      } else {
        navigate(`/assignments/${duplicatedId}`);
      }
    } catch (duplicateError) {
      setError(extractErrorMessage(duplicateError));
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!assignmentId) return;

    try {
      setError(t('assignment.errors.templateNotSupported', 'Save as template is not supported by current backend.'));
    } catch (templateError) {
      setError(extractErrorMessage(templateError));
    }
  };

  const addResource = () => {
    setFormData({
      ...formData,
      resources: [...formData.resources, { name: '', url: '', type: 'document' }],
    });
  };

  const updateResource = (index: number, field: string, value: string) => {
    const newResources = [...formData.resources];
    newResources[index] = { ...newResources[index], [field]: value };
    setFormData({ ...formData, resources: newResources });
  };

  const removeResource = (index: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input: '', expected_output: '', points: 1 }],
    });
  };

  const updateTestCase = (index: number, field: string, value: string | number) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, test_cases: newTestCases });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const tabs = getAssignmentEditorTabs(t);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
      </div>
    );
  }

  return (
    <>
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        isSaving={saving}
        title={t('assignment.unsavedChangesTitle', 'Unsaved Assignment Changes')}
        message={t('assignment.unsavedEditorWarning', 'You have unsaved changes to this assignment. Are you sure you want to leave?')}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {assignmentId ? t('assignment.edit') : t('assignment.create_new')}
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <p style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-t-lg" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  style={
                    activeTab === tab.id
                      ? { background: 'var(--bg-active)', color: 'var(--text-primary)' }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-b-lg p-6" style={{ background: 'var(--bg-surface)' }}>
            <TabTransition tabKey={activeTab}>
              <AssignmentEditorTabContent
                activeTab={activeTab}
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                availableAssignments={availableAssignments}
                assignmentId={assignmentId}
                addResource={addResource}
                updateResource={updateResource}
                removeResource={removeResource}
                addTestCase={addTestCase}
                updateTestCase={updateTestCase}
                removeTestCase={removeTestCase}
                t={t}
              />
            </TabTransition>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex-1 py-3"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>

            {assignmentId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleDuplicate();
                  }}
                  disabled={saving}
                  className="btn py-3"
                  style={{ background: 'var(--fn-success)', color: '#fff' }}
                >
                  {t('assignment.duplicate')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveAsTemplate();
                  }}
                  disabled={saving}
                  className="btn py-3"
                  style={{ background: 'var(--text-secondary)', color: '#fff' }}
                >
                  {t('assignment.save_as_template')}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate(
                courseId && moduleId
                  ? `/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`
                  : courseId ? `/courses/${courseId}` : `/assignments/${assignmentId}`
              )}
              className="btn btn-secondary py-3"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AssignmentEditor;
