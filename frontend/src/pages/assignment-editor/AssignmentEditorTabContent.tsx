import React from 'react';
import { TFunction } from 'i18next';
import { Assignment } from '../../types';
import CodeEditor from '../../components/CodeEditor';
import RichTextEditor from '../../components/RichTextEditor';
import { AssignmentEditorTab, AssignmentFormData } from './assignmentEditorModel';

interface AssignmentEditorTabContentProps {
  activeTab: AssignmentEditorTab;
  formData: AssignmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AssignmentFormData>>;
  validationErrors: Record<string, string>;
  availableAssignments: Assignment[];
  assignmentId?: string;
  addResource: () => void;
  updateResource: (index: number, field: string, value: string) => void;
  removeResource: (index: number) => void;
  addTestCase: () => void;
  updateTestCase: (index: number, field: string, value: string | number) => void;
  removeTestCase: (index: number) => void;
  t: TFunction;
}

export const getAssignmentEditorTabs = (t: TFunction): Array<{ id: AssignmentEditorTab; label: string; icon: string }> => [
  { id: 'basic', label: t('assignment.tabs.basic'), icon: '📝' },
  { id: 'content', label: t('assignment.tabs.content'), icon: '📄' },
  { id: 'settings', label: t('assignment.tabs.settings'), icon: '⚙️' },
  { id: 'grading', label: t('assignment.tabs.grading'), icon: '✓' },
  { id: 'advanced', label: t('assignment.tabs.advanced'), icon: '🔧' },
];

export const AssignmentEditorTabContent: React.FC<AssignmentEditorTabContentProps> = ({
  activeTab,
  formData,
  setFormData,
  validationErrors,
  availableAssignments,
  assignmentId,
  addResource,
  updateResource,
  removeResource,
  addTestCase,
  updateTestCase,
  removeTestCase,
  t,
}) => {
  const renderBasicTab = () => (
    <div className="space-y-6">
      <div>
        <label className="label">
          {t('assignment.title')} *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(event) => setFormData({ ...formData, title: event.target.value })}
          className={`input w-full ${
            validationErrors.title ? 'border-red-500' : ''
          }`}
          required
        />
        {validationErrors.title && (
          <p className="mt-1 error-text">{validationErrors.title}</p>
        )}
      </div>

      <div>
        <label className="label">
          {t('assignment.type')} *
        </label>
        <select
          value={formData.assignment_type}
          onChange={(event) => setFormData({ ...formData, assignment_type: event.target.value })}
          className="input w-full"
        >
          <option value="FILE_UPLOAD">{t('assignment.types.file_upload')}</option>
          <option value="TEXT">{t('assignment.types.text')}</option>
          <option value="CODE">{t('assignment.types.code')}</option>
          <option value="VIRTUAL_LAB">{t('assignment.types.virtual_lab')}</option>
          <option value="URL">{t('assignment.types.url')}</option>
          <option value="QUIZ">{t('assignment.types.quiz')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="label">
            {t('assignment.max_points')} *
          </label>
          <input
            type="number"
            value={formData.max_points}
            onChange={(event) => setFormData({ ...formData, max_points: parseFloat(event.target.value) })}
            min="0"
            step="0.01"
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="label">
            {t('assignment.available_from')}
          </label>
          <input
            type="datetime-local"
            value={formData.available_from}
            onChange={(event) => setFormData({ ...formData, available_from: event.target.value })}
            className="input w-full"
          />
        </div>

        <div>
          <label className="label">
            {t('assignment.due_date')}
          </label>
          <input
            type="datetime-local"
            value={formData.due_date}
            onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
            className="input w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderContentTab = () => (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label">
            {t('assignment.description')} *
          </label>
          <select
            value={formData.description_format}
            onChange={(event) => setFormData({ ...formData, description_format: event.target.value })}
            className="input text-sm"
          >
            <option value="PLAIN">Plain Text</option>
            <option value="MARKDOWN">Markdown</option>
            <option value="RICH">Rich Text (LaTeX &amp; Code)</option>
          </select>
        </div>
        <RichTextEditor
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder={t('assignment.description_placeholder')}
          height="200px"
          enableLatex={formData.description_format === 'RICH'}
          enableCode={formData.description_format === 'RICH' || formData.description_format === 'MARKDOWN'}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label">
            {t('assignment.instructions')}
          </label>
          <select
            value={formData.instructions_format}
            onChange={(event) => setFormData({ ...formData, instructions_format: event.target.value })}
            className="input text-sm"
          >
            <option value="PLAIN">Plain Text</option>
            <option value="MARKDOWN">Markdown</option>
            <option value="RICH">Rich Text (LaTeX &amp; Code)</option>
          </select>
        </div>
        <RichTextEditor
          value={formData.instructions}
          onChange={(value) => setFormData({ ...formData, instructions: value })}
          placeholder={t('assignment.instructions_placeholder')}
          height="300px"
          enableLatex={formData.instructions_format === 'RICH'}
          enableCode={formData.instructions_format === 'RICH' || formData.instructions_format === 'MARKDOWN'}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label">
            {t('assignment.resources')}
          </label>
          <button
            type="button"
            onClick={addResource}
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            + {t('assignment.add_resource')}
          </button>
        </div>
        {formData.resources.map((resource, index) => (
          <div key={index} className="mb-2 flex gap-2">
            <input
              type="text"
              value={resource.name}
              onChange={(event) => updateResource(index, 'name', event.target.value)}
              placeholder={t('assignment.resource_name')}
              className="flex-1 input text-sm"
            />
            <input
              type="url"
              value={resource.url}
              onChange={(event) => updateResource(index, 'url', event.target.value)}
              placeholder="URL"
              className="flex-1 input text-sm"
            />
            <button
              type="button"
              onClick={() => removeResource(index)}
              className="px-3 py-1"
              style={{ color: 'var(--fn-error)' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {formData.assignment_type === 'CODE' && (
        <>
          <div>
            <label className="label">
              {t('assignment.programming_language')}
            </label>
            <select
              value={formData.programming_language}
              onChange={(event) => setFormData({ ...formData, programming_language: event.target.value })}
              className="input w-full"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>

          <div>
            <label className="label">
              {t('assignment.starter_code')}
            </label>
            <CodeEditor
              value={formData.starter_code}
              onChange={(value: string) => setFormData({ ...formData, starter_code: value })}
              language={formData.programming_language}
              height="300px"
            />
          </div>

          <div>
            <label className="label">
              {t('assignment.solution_code')} ({t('assignment.instructor_only')})
            </label>
            <CodeEditor
              value={formData.solution_code}
              onChange={(value: string) => setFormData({ ...formData, solution_code: value })}
              language={formData.programming_language}
              height="300px"
            />
          </div>
        </>
      )}

      {formData.assignment_type === 'VIRTUAL_LAB' && (
        <>
          <div>
            <label className="label">
              {t('assignment.programming_language')}
            </label>
            <select
              value={formData.programming_language}
              onChange={(event) => setFormData({ ...formData, programming_language: event.target.value })}
              className="input w-full"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          <div>
            <label className="label">
              {t('assignment.starter_code')}
            </label>
            <CodeEditor
              value={formData.starter_code}
              onChange={(value: string) => setFormData({ ...formData, starter_code: value })}
              language={formData.programming_language}
              height="300px"
            />
          </div>

          <div>
            <label className="label">
              {t('assignment.solution_code')} ({t('assignment.instructor_only')})
            </label>
            <CodeEditor
              value={formData.solution_code}
              onChange={(value: string) => setFormData({ ...formData, solution_code: value })}
              language={formData.programming_language}
              height="300px"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_grading_enabled}
              onChange={(event) => setFormData({ ...formData, auto_grading_enabled: event.target.checked })}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--text-primary)' }}
            />
            <label className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('assignment.enable_auto_grading')}
            </label>
          </div>
        </>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {formData.assignment_type === 'FILE_UPLOAD' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('assignment.file_upload_settings')}
          </h3>

          <div>
            <label className="label">
              {t('assignment.allowed_file_types')}
            </label>
            <input
              type="text"
              value={formData.allowed_file_types.join(', ')}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  allowed_file_types: event.target.value
                    .split(',')
                    .map((item) => item.trim()),
                })
              }
              placeholder=".pdf, .docx, .txt"
              className="input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                {t('assignment.max_files')}
              </label>
              <input
                type="number"
                value={formData.max_files}
                onChange={(event) => setFormData({ ...formData, max_files: parseInt(event.target.value, 10) })}
                min="1"
                className="input w-full"
              />
            </div>

            <div>
              <label className="label">
                {t('assignment.max_file_size')} (MB)
              </label>
              <input
                type="number"
                value={formData.max_file_size / 1048576}
                onChange={(event) =>
                  setFormData({ ...formData, max_file_size: parseFloat(event.target.value) * 1048576 })
                }
                min="0.1"
                step="0.1"
                className="input w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('assignment.late_submission_settings')}
        </h3>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="allow_late"
            checked={formData.allow_late_submission}
            onChange={(event) => setFormData({ ...formData, allow_late_submission: event.target.checked })}
            className="rounded"
            style={{ accentColor: 'var(--text-primary)' }}
          />
          <label htmlFor="allow_late" className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('assignment.allow_late_submission')}
          </label>
        </div>

        {formData.allow_late_submission && (
          <div>
            <label className="label">
              {t('assignment.late_penalty_percent')} (% per day)
            </label>
            <input
              type="number"
              value={formData.late_penalty_percent}
              onChange={(event) => setFormData({ ...formData, late_penalty_percent: parseFloat(event.target.value) })}
              min="0"
              max="100"
              step="1"
              className="input w-full"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div>
        <label className="label">
          {t('assignment.tags')}
        </label>
        <input
          type="text"
          value={formData.tags.join(', ')}
          onChange={(event) =>
            setFormData({
              ...formData,
              tags: event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item),
            })
          }
          placeholder="homework, lab, project"
          className="input w-full"
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Comma-separated tags for categorization
        </p>
      </div>

      <div>
        <label className="label">
          {t('assignment.estimated_duration')} (minutes)
        </label>
        <input
          type="number"
          value={formData.estimated_duration || ''}
          onChange={(event) =>
            setFormData({
              ...formData,
              estimated_duration: event.target.value ? parseInt(event.target.value, 10) : null,
            })
          }
          min="0"
          placeholder="60"
          className="input w-full"
        />
      </div>

      <div>
        <label className="label">
          {t('assignment.prerequisites')}
        </label>
        <select
          multiple
          value={formData.prerequisites}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions, (option) => option.value);
            setFormData({ ...formData, prerequisites: selected });
          }}
          className="input w-full"
          size={5}
        >
          {availableAssignments
            .filter((assignment) => assignment.id !== assignmentId)
            .map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Select assignments that must be completed before this one
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_template"
          checked={formData.is_template}
          onChange={(event) => setFormData({ ...formData, is_template: event.target.checked })}
          className="rounded"
          style={{ accentColor: 'var(--text-primary)' }}
        />
        <label htmlFor="is_template" className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('assignment.save_as_template')}
        </label>
      </div>
    </div>
  );

  const renderGradingTab = () => (
    <div className="space-y-6">
      {(formData.assignment_type === 'CODE' || formData.assignment_type === 'VIRTUAL_LAB') && (
        <>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_grading"
              checked={formData.auto_grading_enabled}
              onChange={(event) => setFormData({ ...formData, auto_grading_enabled: event.target.checked })}
              className="rounded"
              style={{ accentColor: 'var(--text-primary)' }}
            />
            <label htmlFor="auto_grading" className="ml-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('assignment.enable_auto_grading')}
            </label>
          </div>

          {formData.auto_grading_enabled && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label">
                  {t('assignment.test_cases')}
                </label>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  + {t('assignment.add_test_case')}
                </button>
              </div>

              {formData.test_cases.map((testCase, index) => (
                <div key={index} className="mb-3 rounded-lg p-4" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Test Case #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      style={{ color: 'var(--fn-error)' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Input</label>
                      <textarea
                        value={testCase.input}
                        onChange={(event) => updateTestCase(index, 'input', event.target.value)}
                        className="input w-full font-mono text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Expected Output</label>
                      <textarea
                        value={testCase.expected_output}
                        onChange={(event) => updateTestCase(index, 'expected_output', event.target.value)}
                        className="input w-full font-mono text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Points</label>
                      <input
                        type="number"
                        value={testCase.points}
                        onChange={(event) => updateTestCase(index, 'points', parseFloat(event.target.value))}
                        min="0"
                        step="0.1"
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('assignment.rubric_info')}</p>
      </div>
    </div>
  );

  return (
    <>
      {activeTab === 'basic' && renderBasicTab()}
      {activeTab === 'content' && renderContentTab()}
      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'grading' && renderGradingTab()}
      {activeTab === 'advanced' && renderAdvancedTab()}
    </>
  );
};
