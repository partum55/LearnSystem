import React, { useMemo, useState } from 'react';
import TaskMetadataForm from './TaskMetadataForm';
import TaskSettingsForm from './TaskSettingsForm';
import RubricEditor from './RubricEditor';
import QuizBuilder from './QuizBuilder';
import AIReviewPanel from './AIReviewPanel';
import ValidationSummary from './ValidationSummary';
import SaveStateBanner from './SaveStateBanner';
import { createAuthoringApi } from '../api/authoringApi';
import { useAuthoringValidation } from '../hooks/useAuthoringValidation';
import { useTaskDraft } from '../hooks/useTaskDraft';
import { TaskDraft, TaskType, ValidationResult } from '../types';

interface TaskEditorProps {
  taskType: TaskType;
  initialDraft?: Partial<TaskDraft>;
  mode?: 'EDIT' | 'READ_ONLY';
  role?: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  lockedBy?: string | null;
}

const TaskEditor: React.FC<TaskEditorProps> = ({
  taskType,
  initialDraft,
  mode = 'EDIT',
  role = 'INSTRUCTOR',
  lockedBy = null,
}) => {
  const { draft, setDraft, resetDraft, markSaved, lastSaved } = useTaskDraft(taskType, initialDraft);
  const validation = useAuthoringValidation(draft);
  const [remoteValidation, setRemoteValidation] = useState<ValidationResult | null>(null);
  const [saveState, setSaveState] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const readOnly = mode === 'READ_ONLY' || role === 'STUDENT' || Boolean(lockedBy);

  const api = useMemo(() => createAuthoringApi(), []);

  const handleSave = async () => {
    if (readOnly) return;
    setSaveState('SAVING');
    setErrorMessage(undefined);

    try {
      if (!validation.valid) {
        setSaveState('ERROR');
        setErrorMessage('Please resolve validation errors before saving.');
        return;
      }

      const response = draft.id
        ? await api.updateTask(draft.id, draft)
        : await api.createTask(draft);

      if (response.data.warnings?.length) {
        setErrorMessage(response.data.warnings.join(' '));
      }
      markSaved();
      setSaveState('SAVED');
    } catch {
      setSaveState('ERROR');
      setErrorMessage('Unable to save task. Please retry.');
    }
  };

  const handleValidate = async () => {
    try {
      const response = await api.validateTask(draft);
      setRemoteValidation(response.data.data);
    } catch {
      setRemoteValidation({
        valid: false,
        issues: [{ field: 'server', message: 'Validation service unavailable.', severity: 'ERROR' }],
      });
    }
  };

  const handlePreview = async () => {
    try {
      const response = await api.previewTask({ content: draft.metadata.description, format: draft.metadata.format });
      setPreviewHtml(response.data.data);
    } catch {
      setPreviewHtml('<p class="text-red-600">Preview service unavailable.</p>');
    }
  };

  const handleReset = () => {
    if (readOnly) return;
    const confirmed = window.confirm('Reset all unsaved changes? This action cannot be undone.');
    if (confirmed) {
      resetDraft();
    }
  };

  const updateDraft = (partial: Partial<TaskDraft>) => setDraft({ ...draft, ...partial });

  return (
    <div className="space-y-6">
      {lockedBy && (
        <div className="border border-amber-200 bg-amber-50 text-amber-700 px-4 py-2 rounded">
          This draft is locked by {lockedBy}. You have read-only access.
        </div>
      )}
      <SaveStateBanner status={saveState} message={errorMessage} />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={readOnly}
        >
          Save Draft
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleValidate}
        >
          Validate
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePreview}
        >
          Preview
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-transparent rounded"
          style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          onClick={handleReset}
          disabled={readOnly}
        >
          Reset
        </button>
        {lastSaved && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Last saved just now.</span>}
      </div>

      <TaskMetadataForm
        metadata={draft.metadata}
        onChange={(metadata) => updateDraft({ metadata })}
      />

      <TaskSettingsForm
        settings={draft.settings}
        onChange={(settings) => updateDraft({ settings })}
        readOnly={readOnly}
      />

      <RubricEditor
        rubric={draft.rubric}
        onChange={(rubric) => updateDraft({ rubric })}
        readOnly={readOnly}
      />

      <QuizBuilder
        questions={draft.questions}
        onChange={(questions) => updateDraft({ questions })}
        readOnly={readOnly}
      />

      <AIReviewPanel
        drafts={draft.aiDrafts}
        readOnly={readOnly}
        onApprove={(draftId) =>
          updateDraft({
            aiDrafts: draft.aiDrafts.map((item) =>
              item.id === draftId ? { ...item, status: 'APPROVED' } : item
            ),
          })
        }
        onReject={(draftId) =>
          updateDraft({
            aiDrafts: draft.aiDrafts.map((item) =>
              item.id === draftId ? { ...item, status: 'REJECTED' } : item
            ),
          })
        }
        onApply={(draftId) => {
          const selected = draft.aiDrafts.find((item) => item.id === draftId);
          if (!selected) return;
          updateDraft({
            metadata: {
              ...draft.metadata,
              description: selected.content,
            },
          });
        }}
      />

      <section className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Validation</h2>
        <ValidationSummary validation={validation} />
        {remoteValidation && (
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Server validation</p>
            <ValidationSummary validation={remoteValidation} />
          </div>
        )}
      </section>

      <section className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Preview</h2>
        <div
          className="prose max-w-none"
          style={{ color: 'var(--text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color: var(--text-muted)">Run preview to render content.</p>' }}
        />
      </section>
    </div>
  );
};

export default TaskEditor;
