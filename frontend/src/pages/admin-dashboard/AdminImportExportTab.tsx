import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { courseManagementApi, ImportResult, ValidationResult } from '../../api/adminCourseManagement';

interface Props {
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const AdminImportExportTab: React.FC<Props> = ({ onFeedback }) => {
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonText(text);
      setValidation(null);
      setImportResult(null);

      // Auto-validate
      setValidating(true);
      try {
        const result = await courseManagementApi.validateImport(text);
        setValidation(result);
      } catch {
        setValidation({ valid: false, errors: ['Failed to validate'], warnings: [], summary: {} });
      }
      setValidating(false);
    } catch {
      onFeedback('error', 'Failed to read file');
    }
    // Reset input
    if (e.target) e.target.value = '';
  }, [onFeedback]);

  const handleValidate = async () => {
    if (!jsonText.trim()) return;
    setValidating(true);
    setValidation(null);
    try {
      const result = await courseManagementApi.validateImport(jsonText);
      setValidation(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Validation failed';
      setValidation({ valid: false, errors: [msg], warnings: [], summary: {} });
    }
    setValidating(false);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await courseManagementApi.importCourseJson(jsonText);
      setImportResult(result);
      if (result.success) {
        onFeedback('success', result.message);
      } else {
        onFeedback('error', result.message);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      onFeedback('error', msg);
      setImportResult({ success: false, message: msg, coursesCreated: 0, modulesCreated: 0, resourcesCreated: 0, assignmentsCreated: 0, quizzesCreated: 0, questionsCreated: 0, logs: [] });
    }
    setImporting(false);
  };

  const loadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const template = await courseManagementApi.getTemplate();
      setJsonText(JSON.stringify(template, null, 2));
      setValidation(null);
      setImportResult(null);
    } catch {
      onFeedback('error', 'Failed to load template');
    }
    setTemplateLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText);
    onFeedback('success', 'Copied to clipboard');
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch {
      onFeedback('error', 'Invalid JSON — cannot format');
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
          <ArrowUpTrayIcon className="h-4 w-4" /> Load JSON File
        </button>
        <input ref={fileInputRef} type="file" className="hidden" accept=".json,application/json" onChange={handleFileSelect} />

        <button className="btn btn-secondary btn-sm" onClick={loadTemplate} disabled={templateLoading}>
          <DocumentTextIcon className="h-4 w-4" /> {templateLoading ? 'Loading...' : 'Load Template'}
        </button>

        <div className="flex-1" />

        {jsonText.trim() && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={formatJson}>Format</button>
            <button className="btn btn-ghost btn-sm" onClick={copyToClipboard}>
              <ClipboardDocumentIcon className="h-4 w-4" /> Copy
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleValidate} disabled={validating}>
              {validating ? 'Validating...' : 'Validate'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleImport}
              disabled={importing || (validation !== null && !validation.valid)}
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> {importing ? 'Importing...' : 'Import'}
            </button>
          </>
        )}
      </div>

      {/* JSON Editor */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Course JSON</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {jsonText ? `${jsonText.length.toLocaleString()} chars` : 'Paste JSON below or load a file'}
          </span>
        </div>
        <textarea
          className="w-full bg-transparent text-sm p-3 font-mono resize-y focus:outline-none"
          style={{ color: 'var(--text-primary)', background: 'var(--bg-base)', minHeight: 300, maxHeight: 600 }}
          placeholder={`{
  "version": "1.0",
  "course": {
    "code": "CS101",
    "titleUk": "Курс",
    "titleEn": "Course"
  },
  "modules": [...],
  "quizzes": [...],
  "questionBank": [...]
}`}
          value={jsonText}
          onChange={e => { setJsonText(e.target.value); setValidation(null); setImportResult(null); }}
          spellCheck={false}
        />
      </div>

      {/* Validation result */}
      {validation && (
        <div className="rounded-lg p-3 space-y-2" style={{
          background: validation.valid ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
          border: `1px solid ${validation.valid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}>
          <div className="flex items-center gap-2">
            {validation.valid
              ? <CheckCircleIcon className="h-5 w-5" style={{ color: 'var(--fn-success)' }} />
              : <XCircleIcon className="h-5 w-5" style={{ color: 'var(--fn-error)' }} />
            }
            <span className="text-sm font-medium" style={{ color: validation.valid ? 'var(--fn-success)' : 'var(--fn-error)' }}>
              {validation.valid ? 'Valid — ready to import' : 'Invalid JSON'}
            </span>
          </div>

          {validation.errors.length > 0 && (
            <ul className="text-xs space-y-0.5 pl-7" style={{ color: 'var(--fn-error)' }}>
              {validation.errors.map((err, i) => <li key={i}>• {err}</li>)}
            </ul>
          )}

          {validation.warnings.length > 0 && (
            <ul className="text-xs space-y-0.5 pl-7" style={{ color: 'var(--fn-warning)' }}>
              {validation.warnings.map((w, i) => <li key={i}>
                <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />{w}
              </li>)}
            </ul>
          )}

          {Object.keys(validation.summary).length > 0 && (
            <div className="flex flex-wrap gap-3 pl-7">
              {Object.entries(validation.summary).map(([key, val]) => (
                <span key={key} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium">{val}</span> {key}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-lg p-3 space-y-2" style={{
          background: importResult.success ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
          border: `1px solid ${importResult.success ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}>
          <div className="flex items-center gap-2">
            {importResult.success
              ? <CheckCircleIcon className="h-5 w-5" style={{ color: 'var(--fn-success)' }} />
              : <XCircleIcon className="h-5 w-5" style={{ color: 'var(--fn-error)' }} />
            }
            <span className="text-sm font-semibold" style={{ color: importResult.success ? 'var(--fn-success)' : 'var(--fn-error)' }}>
              {importResult.message}
            </span>
          </div>

          {importResult.success && (
            <div className="flex flex-wrap gap-3 pl-7">
              <Stat label="Courses" value={importResult.coursesCreated} />
              <Stat label="Modules" value={importResult.modulesCreated} />
              <Stat label="Resources" value={importResult.resourcesCreated} />
              <Stat label="Assignments" value={importResult.assignmentsCreated} />
              <Stat label="Quizzes" value={importResult.quizzesCreated} />
              <Stat label="Questions" value={importResult.questionsCreated} />
            </div>
          )}

          {importResult.logs && importResult.logs.length > 0 && (
            <details className="pl-7">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>Import log ({importResult.logs.length} entries)</summary>
              <pre className="text-[10px] mt-1 p-2 rounded max-h-48 overflow-auto font-mono" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                {importResult.logs.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Quick reference */}
      <details className="rounded-lg" style={{ border: '1px solid var(--border-default)' }}>
        <summary className="p-3 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
          JSON Schema Reference
        </summary>
        <div className="p-3" style={{ background: 'var(--bg-base)' }}>
          <pre className="text-[11px] font-mono overflow-auto max-h-96" style={{ color: 'var(--text-secondary)' }}>{`{
  "version": "1.0",
  "course": {
    "code": "CS101",              // Required — unique uppercase
    "titleUk": "Назва курсу",     // Required
    "titleEn": "Course Title",     // Optional
    "descriptionUk": "...",
    "descriptionEn": "...",
    "syllabus": "...",
    "visibility": "PUBLIC|PRIVATE|DRAFT",
    "maxStudents": 100,
    "isPublished": false
  },
  "modules": [{
    "title": "Module 1",           // Required
    "description": "...",
    "position": 1,
    "isPublished": true,
    "resources": [{
      "title": "Resource",         // Required
      "resourceType": "TEXT|VIDEO|PDF|SLIDE|LINK|CODE|OTHER", // Required
      "externalUrl": "https://...",
      "textContent": "...",
      "position": 1,
      "isDownloadable": false
    }],
    "assignments": [{
      "assignmentType": "FILE_UPLOAD|TEXT|CODE|URL|QUIZ|MANUAL_GRADE|EXTERNAL",
      "title": "Assignment",       // Required
      "description": "...",        // Required
      "maxPoints": 100,
      "programmingLanguage": "python",
      "starterCode": "# ...",
      "dueDate": "2025-12-31T23:59:00",
      "isPublished": false,
      "testCases": [{"input":"1","output":"1"}],
      "tags": ["homework"]
    }]
  }],
  "standaloneAssignments": [ /* same as module assignments */ ],
  "quizzes": [{
    "title": "Quiz 1",
    "description": "...",
    "timeLimit": 30,               // minutes
    "attemptsAllowed": 2,
    "shuffleQuestions": true,
    "shuffleAnswers": true,
    "passPercentage": 60
  }],
  "questionBank": [{
    "questionType": "MULTIPLE_CHOICE|TRUE_FALSE|FILL_BLANK|SHORT_ANSWER|ESSAY|CODE|NUMERICAL|MATCHING|ORDERING",
    "stem": "What is 2+2?",       // Required
    "options": {"A":"3","B":"4","C":"5","D":"6"},
    "correctAnswer": {"answer":"B"},
    "explanation": "2+2=4",
    "points": 5
  }]
}`}</pre>
        </div>
      </details>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span> {label}
  </span>
);
