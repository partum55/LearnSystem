import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  courseManagementApi,
  ImportResult,
  sisAdminOpsApi,
  SisAuditLogEntry,
  SisBulkEnrollmentActionRequest,
  SisImportApplyResponse,
  SisImportPreviewResponse,
  SisImportRunResponse,
  ValidationResult,
} from '../../api/adminCourseManagement';
import { extractErrorMessage } from '../../api/client';

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

  const [semesterCode, setSemesterCode] = useState(new Date().getFullYear() + '-Spring');
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [coursesFile, setCoursesFile] = useState<File | null>(null);
  const [groupMapFile, setGroupMapFile] = useState<File | null>(null);
  const [currentEnrollmentsFile, setCurrentEnrollmentsFile] = useState<File | null>(null);
  const [sisPreview, setSisPreview] = useState<SisImportPreviewResponse | null>(null);
  const [sisApplyResult, setSisApplyResult] = useState<SisImportApplyResponse | null>(null);
  const [sisLoading, setSisLoading] = useState(false);
  const [sisHistory, setSisHistory] = useState<SisImportRunResponse[]>([]);
  const [sisAudit, setSisAudit] = useState<SisAuditLogEntry[]>([]);
  const [bulkAction, setBulkAction] = useState<SisBulkEnrollmentActionRequest>({
    action: 'CHANGE_STATUS',
    emails: [],
    courseCodes: [],
    enrollmentStatus: 'active',
  });
  const [bulkEmailsRaw, setBulkEmailsRaw] = useState('');
  const [bulkCoursesRaw, setBulkCoursesRaw] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deanCourseId, setDeanCourseId] = useState('');
  const [deanSemester, setDeanSemester] = useState(new Date().getFullYear() + '-Spring');
  const [deanGroupCode, setDeanGroupCode] = useState('');
  const [deanExportLoading, setDeanExportLoading] = useState(false);

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
      } catch (error) {
        setValidation({
          valid: false,
          errors: [extractErrorMessage(error)],
          warnings: [],
          summary: {},
        });
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
    } catch (error) {
      const msg = extractErrorMessage(error);
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
    } catch (error) {
      const msg = extractErrorMessage(error);
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

  const parseListInput = (raw: string): string[] =>
    raw
      .split(/[\n,;]/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const loadSisHistoryAndAudit = useCallback(async () => {
    try {
      const [history, audit] = await Promise.all([
        sisAdminOpsApi.listImports({ page: 0, size: 10 }),
        sisAdminOpsApi.getAuditLog({ page: 0, size: 20 }),
      ]);
      setSisHistory(history.content || []);
      setSisAudit(audit.content || []);
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    }
  }, [onFeedback]);

  const handleSisPreview = async () => {
    if (!studentsFile || !coursesFile || !groupMapFile) {
      onFeedback('error', 'studentsFile, coursesFile and groupCourseMapFile are required');
      return;
    }

    setSisLoading(true);
    setSisApplyResult(null);
    try {
      const preview = await sisAdminOpsApi.previewImport({
        semesterCode,
        studentsFile,
        coursesFile,
        groupCourseMapFile: groupMapFile,
        currentEnrollmentsFile: currentEnrollmentsFile || undefined,
      });
      setSisPreview(preview);
      await loadSisHistoryAndAudit();
      if (preview.valid) {
        onFeedback('success', 'Preview is valid and ready to apply');
      } else {
        onFeedback('error', 'Preview has validation errors');
      }
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    } finally {
      setSisLoading(false);
    }
  };

  const handleSisApply = async () => {
    if (!sisPreview?.importId || !sisPreview.valid) {
      onFeedback('error', 'Run preview first and fix errors before apply');
      return;
    }

    setSisLoading(true);
    try {
      const result = await sisAdminOpsApi.applyImport(sisPreview.importId);
      setSisApplyResult(result);
      onFeedback('success', result.message);
      await loadSisHistoryAndAudit();
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    } finally {
      setSisLoading(false);
    }
  };

  const handleRollback = async (importId: string) => {
    setSisLoading(true);
    try {
      const result = await sisAdminOpsApi.rollbackImport(importId);
      setSisApplyResult(result);
      onFeedback('success', result.message);
      await loadSisHistoryAndAudit();
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    } finally {
      setSisLoading(false);
    }
  };

  const handleBulkAction = async () => {
    const emails = parseListInput(bulkEmailsRaw);
    const courseCodes = parseListInput(bulkCoursesRaw);
    if (emails.length === 0 || courseCodes.length === 0) {
      onFeedback('error', 'Provide emails and course codes for bulk action');
      return;
    }

    setBulkLoading(true);
    try {
      const result = await sisAdminOpsApi.bulkEnrollmentAction({
        ...bulkAction,
        emails,
        courseCodes,
      });
      onFeedback('success', `${result.message}: ${result.affectedEnrollments} enrollments affected`);
      await loadSisHistoryAndAudit();
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeanExport = async () => {
    if (!deanCourseId.trim()) {
      onFeedback('error', 'Course ID is required for dean export');
      return;
    }

    setDeanExportLoading(true);
    try {
      await sisAdminOpsApi.downloadDeanGradebook({
        courseId: deanCourseId.trim(),
        semester: deanSemester.trim() || undefined,
        group: deanGroupCode.trim() || undefined,
      });
      onFeedback('success', 'Dean XLSX gradebook exported');
    } catch (error) {
      onFeedback('error', extractErrorMessage(error));
    } finally {
      setDeanExportLoading(false);
    }
  };

  useEffect(() => {
    void loadSisHistoryAndAudit();
  }, [loadSisHistoryAndAudit]);

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
            {(() => {
              const hasInvalidJsonError = validation.errors.some((err) => /invalid json/i.test(err));
              const title = validation.valid
                ? 'Valid — ready to import'
                : hasInvalidJsonError
                  ? 'Invalid JSON'
                  : 'Validation failed';
              return (
                <span className="text-sm font-medium" style={{ color: validation.valid ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                  {title}
                </span>
              );
            })()}
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

      {/* SIS import workflow */}
      <div className="rounded-lg p-4 space-y-4" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            SIS CSV Import (Preview → Apply)
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Canonical format: UTF-8 CSV with headers. Required files: students, courses, group-course map.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Semester code
            <input
              className="input mt-1 w-full"
              value={semesterCode}
              onChange={(event) => setSemesterCode(event.target.value)}
              placeholder="2026-Spring"
            />
          </label>

          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Optional current enrollments
            <input
              className="input mt-1 w-full"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setCurrentEnrollmentsFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            `students.csv`
            <input
              className="input mt-1 w-full"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setStudentsFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            `courses.csv`
            <input
              className="input mt-1 w-full"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setCoursesFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className="text-xs md:col-span-2" style={{ color: 'var(--text-secondary)' }}>
            `group_course_map.csv`
            <input
              className="input mt-1 w-full"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setGroupMapFile(event.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleSisPreview} disabled={sisLoading}>
            {sisLoading ? 'Previewing...' : 'Preview'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSisApply}
            disabled={sisLoading || !sisPreview?.valid}
          >
            Apply
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void loadSisHistoryAndAudit()} disabled={sisLoading}>
            Refresh history
          </button>
        </div>

        {sisPreview && (
          <div className="rounded-md p-3 space-y-2" style={{
            border: `1px solid ${sisPreview.valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            background: sisPreview.valid ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
          }}>
            <div className="flex items-center gap-2">
              {sisPreview.valid ? (
                <CheckCircleIcon className="h-4 w-4" style={{ color: 'var(--fn-success)' }} />
              ) : (
                <XCircleIcon className="h-4 w-4" style={{ color: 'var(--fn-error)' }} />
              )}
              <span className="text-xs font-medium" style={{ color: sisPreview.valid ? 'var(--fn-success)' : 'var(--fn-error)' }}>
                {sisPreview.status} · import {sisPreview.importId}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(sisPreview.summary || {}).map(([key, value]) => (
                <span key={key} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold">{String(value)}</span> {key}
                </span>
              ))}
            </div>
            {sisPreview.errors.length > 0 && (
              <details>
                <summary className="text-xs cursor-pointer" style={{ color: 'var(--fn-error)' }}>
                  Errors ({sisPreview.errors.length})
                </summary>
                <ul className="mt-1 text-xs space-y-1">
                  {sisPreview.errors.slice(0, 20).map((error, index) => (
                    <li key={`${error.code}-${index}`} style={{ color: 'var(--fn-error)' }}>
                      [{error.file}] {error.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {sisApplyResult && (
          <div className="rounded-md p-3 text-xs" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {sisApplyResult.message}
            </div>
            <div className="mt-1">
              Courses: {sisApplyResult.createdCourses} · Enrollments: {sisApplyResult.createdEnrollments} · Skipped: {sisApplyResult.skippedEnrollments}
            </div>
            {sisApplyResult.rollbackExpiresAt && (
              <div className="mt-1">
                Rollback available until: {new Date(sisApplyResult.rollbackExpiresAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md p-3" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Import history
            </h4>
            <div className="space-y-2 text-xs">
              {sisHistory.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No SIS imports yet.</p>}
              {sisHistory.map((run) => (
                <div key={run.id} className="rounded p-2" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--text-primary)' }}>{run.semesterCode}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{run.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-faint)' }}>{new Date(run.createdAt).toLocaleString()}</p>
                  {run.status === 'APPLIED' && (
                    <button
                      className="btn btn-ghost btn-sm mt-1"
                      onClick={() => void handleRollback(run.id)}
                      disabled={sisLoading}
                    >
                      Rollback
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md p-3" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Audit log
            </h4>
            <div className="space-y-2 text-xs">
              {sisAudit.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No audit entries yet.</p>}
              {sisAudit.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded p-2" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--text-primary)' }}>{entry.action}</span>
                    <span style={{ color: 'var(--text-faint)' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>{entry.entityType} {entry.entityKey ? `· ${entry.entityKey}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk admin actions */}
      <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Bulk enrollment actions
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Action
            <select
              className="input mt-1 w-full"
              value={bulkAction.action}
              onChange={(event) =>
                setBulkAction((prev) => ({ ...prev, action: event.target.value as SisBulkEnrollmentActionRequest['action'] }))
              }
            >
              <option value="CHANGE_STATUS">CHANGE_STATUS</option>
              <option value="UNENROLL">UNENROLL</option>
              <option value="MOVE_STUDENTS">MOVE_STUDENTS</option>
            </select>
          </label>

          {bulkAction.action === 'CHANGE_STATUS' && (
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Enrollment status
              <select
                className="input mt-1 w-full"
                value={bulkAction.enrollmentStatus || 'active'}
                onChange={(event) => setBulkAction((prev) => ({ ...prev, enrollmentStatus: event.target.value }))}
              >
                <option value="active">active</option>
                <option value="dropped">dropped</option>
                <option value="completed">completed</option>
              </select>
            </label>
          )}

          {bulkAction.action === 'MOVE_STUDENTS' && (
            <label className="text-xs md:col-span-2" style={{ color: 'var(--text-secondary)' }}>
              Target course code
              <input
                className="input mt-1 w-full"
                value={bulkAction.targetCourseCode || ''}
                onChange={(event) => setBulkAction((prev) => ({ ...prev, targetCourseCode: event.target.value }))}
                placeholder="CS201"
              />
            </label>
          )}

          <label className="text-xs md:col-span-2" style={{ color: 'var(--text-secondary)' }}>
            Emails (comma/newline separated)
            <textarea
              className="input mt-1 w-full h-20"
              value={bulkEmailsRaw}
              onChange={(event) => setBulkEmailsRaw(event.target.value)}
              placeholder="student1@ucu.edu.ua, student2@ucu.edu.ua"
            />
          </label>

          <label className="text-xs md:col-span-2" style={{ color: 'var(--text-secondary)' }}>
            Source course codes (comma/newline separated)
            <textarea
              className="input mt-1 w-full h-20"
              value={bulkCoursesRaw}
              onChange={(event) => setBulkCoursesRaw(event.target.value)}
              placeholder="CS101, PM101"
            />
          </label>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleBulkAction} disabled={bulkLoading}>
          {bulkLoading ? 'Applying...' : 'Run bulk action'}
        </button>
      </div>

      {/* Dean export */}
      <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Dean gradebook export (XLSX)
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Course ID
            <input
              className="input mt-1 w-full"
              value={deanCourseId}
              onChange={(event) => setDeanCourseId(event.target.value)}
              placeholder="f8c8e7d4-0fd9-4d8a-b5fe-6f23c49f5157"
            />
          </label>

          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Semester
            <input
              className="input mt-1 w-full"
              value={deanSemester}
              onChange={(event) => setDeanSemester(event.target.value)}
              placeholder="2026-Spring"
            />
          </label>

          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Group (optional)
            <input
              className="input mt-1 w-full"
              value={deanGroupCode}
              onChange={(event) => setDeanGroupCode(event.target.value)}
              placeholder="PM-31"
            />
          </label>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleDeanExport} disabled={deanExportLoading}>
          {deanExportLoading ? 'Exporting...' : 'Download Dean XLSX'}
        </button>
      </div>

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
      "assignmentType": "FILE_UPLOAD|TEXT|CODE|URL|QUIZ|MANUAL_GRADE|EXTERNAL|SEMINAR",
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
