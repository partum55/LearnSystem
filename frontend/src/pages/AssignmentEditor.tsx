import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import RichTextEditor from '../components/RichTextEditor';
import CodeEditor from '../components/CodeEditor';

interface AssignmentFormData {
  title: string;
  description: string;
  description_format: string;
  instructions: string;
  instructions_format: string;
  assignment_type: string;
  max_points: number;
  due_date: string;
  available_from: string;
  available_until: string;
  starter_code: string;
  solution_code: string;
  programming_language: string;
  resources: Array<{ name: string; url: string; type: string }>;
  allowed_file_types: string[];
  max_files: number;
  max_file_size: number;
  test_cases: Array<{ input: string; expected_output: string; points: number }>;
  auto_grading_enabled: boolean;
  rubric: any;
  allow_late_submission: boolean;
  late_penalty_percent: number;
}

const AssignmentEditor: React.FC = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'settings' | 'grading'>('basic');

  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    description_format: 'MARKDOWN',
    instructions: '',
    instructions_format: 'MARKDOWN',
    assignment_type: 'FILE_UPLOAD',
    max_points: 100,
    due_date: '',
    available_from: '',
    available_until: '',
    starter_code: '',
    solution_code: '',
    programming_language: 'python',
    resources: [],
    allowed_file_types: ['.pdf', '.docx', '.txt'],
    max_files: 5,
    max_file_size: 10485760,
    test_cases: [],
    auto_grading_enabled: false,
    rubric: {},
    allow_late_submission: true,
    late_penalty_percent: 10,
  });

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get<AssignmentFormData>(`assessments/assignments/${assignmentId}/`);
      setFormData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (assignmentId) {
        await api.put(`assessments/assignments/${assignmentId}/`, formData);
      } else {
        await api.post('assessments/assignments/', {
          ...formData,
          course: courseId,
          is_published: false,
        });
      }
      navigate(`/courses/${courseId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
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
      resources: formData.resources.filter((_, i) => i !== index),
    });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input: '', expected_output: '', points: 1 }],
    });
  };

  const updateTestCase = (index: number, field: string, value: any) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, test_cases: newTestCases });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index),
    });
  };

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('assignment.title')} *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('assignment.type')} *
        </label>
        <select
          value={formData.assignment_type}
          onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="FILE_UPLOAD">{t('assignment.types.file_upload')}</option>
          <option value="TEXT">{t('assignment.types.text')}</option>
          <option value="CODE">{t('assignment.types.code')}</option>
          <option value="URL">{t('assignment.types.url')}</option>
          <option value="QUIZ">{t('assignment.types.quiz')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('assignment.max_points')} *
          </label>
          <input
            type="number"
            value={formData.max_points}
            onChange={(e) => setFormData({ ...formData, max_points: parseFloat(e.target.value) })}
            min="0"
            step="0.01"
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('assignment.available_from')}
          </label>
          <input
            type="datetime-local"
            value={formData.available_from}
            onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('assignment.due_date')}
          </label>
          <input
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderContentTab = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('assignment.description')} *
          </label>
          <select
            value={formData.description_format}
            onChange={(e) => setFormData({ ...formData, description_format: e.target.value })}
            className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="PLAIN">Plain Text</option>
            <option value="MARKDOWN">Markdown</option>
            <option value="RICH">Rich Text (LaTeX & Code)</option>
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('assignment.instructions')}
          </label>
          <select
            value={formData.instructions_format}
            onChange={(e) => setFormData({ ...formData, instructions_format: e.target.value })}
            className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="PLAIN">Plain Text</option>
            <option value="MARKDOWN">Markdown</option>
            <option value="RICH">Rich Text (LaTeX & Code)</option>
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

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('assignment.resources')}
          </label>
          <button
            type="button"
            onClick={addResource}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            + {t('assignment.add_resource')}
          </button>
        </div>
        {formData.resources.map((resource, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={resource.name}
              onChange={(e) => updateResource(index, 'name', e.target.value)}
              placeholder={t('assignment.resource_name')}
              className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            />
            <input
              type="url"
              value={resource.url}
              onChange={(e) => updateResource(index, 'url', e.target.value)}
              placeholder="URL"
              className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            />
            <button
              type="button"
              onClick={() => removeResource(index)}
              className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Code-specific fields */}
      {formData.assignment_type === 'CODE' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('assignment.programming_language')}
            </label>
            <select
              value={formData.programming_language}
              onChange={(e) => setFormData({ ...formData, programming_language: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {formData.assignment_type === 'FILE_UPLOAD' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('assignment.file_upload_settings')}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('assignment.allowed_file_types')}
            </label>
            <input
              type="text"
              value={formData.allowed_file_types.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                allowed_file_types: e.target.value.split(',').map(s => s.trim()) 
              })}
              placeholder=".pdf, .docx, .txt"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('assignment.max_files')}
              </label>
              <input
                type="number"
                value={formData.max_files}
                onChange={(e) => setFormData({ ...formData, max_files: parseInt(e.target.value) })}
                min="1"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('assignment.max_file_size')} (MB)
              </label>
              <input
                type="number"
                value={formData.max_file_size / 1048576}
                onChange={(e) => setFormData({ ...formData, max_file_size: parseFloat(e.target.value) * 1048576 })}
                min="0.1"
                step="0.1"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('assignment.late_submission_settings')}
        </h3>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="allow_late"
            checked={formData.allow_late_submission}
            onChange={(e) => setFormData({ ...formData, allow_late_submission: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="allow_late" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('assignment.allow_late_submission')}
          </label>
        </div>

        {formData.allow_late_submission && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('assignment.late_penalty_percent')} (% per day)
            </label>
            <input
              type="number"
              value={formData.late_penalty_percent}
              onChange={(e) => setFormData({ ...formData, late_penalty_percent: parseFloat(e.target.value) })}
              min="0"
              max="100"
              step="1"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderGradingTab = () => (
    <div className="space-y-6">
      {formData.assignment_type === 'CODE' && (
        <>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_grading"
              checked={formData.auto_grading_enabled}
              onChange={(e) => setFormData({ ...formData, auto_grading_enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="auto_grading" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('assignment.enable_auto_grading')}
            </label>
          </div>

          {formData.auto_grading_enabled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('assignment.test_cases')}
                </label>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  + {t('assignment.add_test_case')}
                </button>
              </div>

              {formData.test_cases.map((testCase, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Test Case #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Input</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white font-mono"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Expected Output</label>
                      <textarea
                        value={testCase.expected_output}
                        onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                        className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white font-mono"
                        rows={2}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Points</label>
                      <input
                        type="number"
                        value={testCase.points}
                        onChange={(e) => updateTestCase(index, 'points', parseFloat(e.target.value))}
                        min="0"
                        step="0.1"
                        className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('assignment.rubric_info')}
        </p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'basic', label: t('assignment.tabs.basic'), icon: '📝' },
    { id: 'content', label: t('assignment.tabs.content'), icon: '📄' },
    { id: 'settings', label: t('assignment.tabs.settings'), icon: '⚙️' },
    { id: 'grading', label: t('assignment.tabs.grading'), icon: '✓' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {assignmentId ? t('assignment.edit') : t('assignment.create_new')}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow p-6">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'content' && renderContentTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'grading' && renderGradingTab()}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentEditor;
