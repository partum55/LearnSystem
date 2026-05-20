import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import apiClient, { extractErrorMessage } from '../api/client';
import {
  UserPlusIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface EnrollStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onEnrolled: () => void;
}

type EnrollmentMethod = 'manual' | 'csv';

interface EnrollmentResult {
  enrolled: Array<{ email: string; name: string; role: string }>;
  already_enrolled: Array<{ email: string; name: string; current_role: string }>;
  not_found: string[];
  created_users?: Array<{ email: string; name: string }>;
  errors?: Array<{ row: number; error: string }>;
  total_enrolled: number;
  total_already_enrolled: number;
  total_not_found: number;
  total_created?: number;
  total_errors?: number;
}

interface UserSearchResponse {
  content: Array<{
    id: string;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  }>;
}

export const EnrollStudentsModal: React.FC<EnrollStudentsModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onEnrolled,
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<EnrollmentMethod>('manual');
  const [loading, setLoading] = useState(false);
  const [emailList, setEmailList] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TA'>('STUDENT');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [error, setError] = useState('');

  const enrollUsersByEmail = async (emailsInput: string[]) => {
    const uniqueEmails = Array.from(
      new Set(
        emailsInput
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      )
    );

    const enrollmentResult: EnrollmentResult = {
      enrolled: [],
      already_enrolled: [],
      not_found: [],
      errors: [],
      total_enrolled: 0,
      total_already_enrolled: 0,
      total_not_found: 0,
      total_errors: 0,
    };

    for (let i = 0; i < uniqueEmails.length; i += 1) {
      const email = uniqueEmails[i];
      try {
        const usersResponse = await apiClient.get<UserSearchResponse>(
          `/users?query=${encodeURIComponent(email)}&page=0&size=20`
        );
        const matchedUser = (usersResponse.data.content || []).find(
          (u) => u.email.toLowerCase() === email
        );

        if (!matchedUser) {
          enrollmentResult.not_found.push(email);
          continue;
        }

        const userName =
          matchedUser.displayName ||
          `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim() ||
          matchedUser.email;

        try {
          await apiClient.post(`/courses/${courseId}/enroll`, {
            userId: matchedUser.id,
            roleInCourse: role,
          });
          enrollmentResult.enrolled.push({ email, name: userName, role });
        } catch (err: unknown) {
          const errMsg = extractErrorMessage(err);
          const lowered = errMsg.toLowerCase();
          if (lowered.includes('already') || lowered.includes('exists') || lowered.includes('enrolled')) {
            enrollmentResult.already_enrolled.push({
              email,
              name: userName,
              current_role: role,
            });
          } else {
            enrollmentResult.errors?.push({
              row: i + 1,
              error: `${email}: ${errMsg}`,
            });
          }
        }
      } catch (err: unknown) {
        enrollmentResult.errors?.push({
          row: i + 1,
          error: `${email}: ${extractErrorMessage(err)}`,
        });
      }
    }

    enrollmentResult.total_enrolled = enrollmentResult.enrolled.length;
    enrollmentResult.total_already_enrolled = enrollmentResult.already_enrolled.length;
    enrollmentResult.total_not_found = enrollmentResult.not_found.length;
    enrollmentResult.total_errors = enrollmentResult.errors?.length || 0;
    return enrollmentResult;
  };

  const handleManualEnroll = async () => {
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const emails = emailList
        .split(/[\n,;]/)
        .map(e => e.trim())
        .filter(e => e);

      if (emails.length === 0) {
        setError(t('enrollment.errors.noEmails'));
        setLoading(false);
        return;
      }

      const data = await enrollUsersByEmail(emails);
      setResult(data);

      if (data.total_enrolled > 0) {
        onEnrolled();
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCsvEnroll = async () => {
    if (!csvFile) {
      setError(t('enrollment.errors.noFile'));
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const csvText = await csvFile.text();
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setError(t('enrollment.errors.noFile'));
        setLoading(false);
        return;
      }

      const emails = lines
        .map((line, index) => {
          const firstColumn = line.split(',')[0]?.trim();
          if (index === 0 && firstColumn?.toLowerCase() === 'email') {
            return '';
          }
          return firstColumn || '';
        })
        .filter((email) => email.length > 0);

      if (emails.length === 0) {
        setError(t('enrollment.errors.noEmails'));
        setLoading(false);
        return;
      }

      const data = await enrollUsersByEmail(emails);
      setResult(data);

      if (data.total_enrolled > 0) {
        onEnrolled();
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmailList('');
    setCsvFile(null);
    setResult(null);
    setError('');
    setMethod('manual');
    onClose();
  };

  const downloadSampleCsv = () => {
    const csvContent = 'email,name,role\nstudent1@example.com,John Doe,STUDENT\nstudent2@example.com,Jane Smith,STUDENT\nta@example.com,TA Name,TA';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enrollment_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('enrollment.title')}>
      <div className="space-y-4">
        {/* Method Selection */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMethod('manual')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all"
            style={method === 'manual'
              ? { borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
              : { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            <UserPlusIcon className="h-5 w-5" />
            <span className="font-medium">{t('enrollment.manual')}</span>
          </button>
          <button
            onClick={() => setMethod('csv')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all"
            style={method === 'csv'
              ? { borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
              : { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            <span className="font-medium">{t('enrollment.csv')}</span>
          </button>
        </div>

        {error && (
          <div className="rounded-md p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--fn-error)' }}>
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5" style={{ color: 'var(--fn-error)' }} />
              <div className="ml-3">
                <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {method === 'manual' && !result && (
          <div className="space-y-4">
            <div>
              <label className="label mb-1">
                {t('enrollment.role')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TA')}
                className="input w-full"
              >
                <option value="STUDENT">{t('enrollment.roles.student')}</option>
                <option value="TA">{t('enrollment.roles.ta')}</option>
              </select>
            </div>

            <div>
              <label className="label mb-1">
                {t('enrollment.emailList')}
              </label>
              <textarea
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
                rows={8}
                placeholder={t('enrollment.emailListPlaceholder')}
                className="input w-full font-mono text-sm"
              />
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('enrollment.emailListHint')}
              </p>
            </div>
          </div>
        )}

        {/* CSV Upload Form */}
        {method === 'csv' && !result && (
          <div className="space-y-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div className="ml-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('enrollment.csvFormat')}
                  </h3>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p>{t('enrollment.csvFormatDesc')}</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code className="px-1 rounded" style={{ background: 'var(--bg-surface)' }}>email</code> - {t('enrollment.csvFields.email')}</li>
                      <li><code className="px-1 rounded" style={{ background: 'var(--bg-surface)' }}>name</code> - {t('enrollment.csvFields.name')}</li>
                      <li><code className="px-1 rounded" style={{ background: 'var(--bg-surface)' }}>role</code> - {t('enrollment.csvFields.role')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={downloadSampleCsv}
                    className="mt-3 text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('enrollment.downloadSample')}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="label mb-2">
                {t('enrollment.selectFile')}
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm rounded-lg cursor-pointer"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              />
              {csvFile && (
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('enrollment.selectedFile')}: {csvFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--fn-success)' }}>
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--fn-success)' }} />
                <div className="ml-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--fn-success)' }}>
                    {t('enrollment.success')}
                  </h3>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('enrollment.totalEnrolled', { count: result.total_enrolled })}</li>
                      {result.total_created !== undefined && result.total_created > 0 && (
                        <li>{t('enrollment.totalCreated', { count: result.total_created })}</li>
                      )}
                      {result.total_already_enrolled > 0 && (
                        <li>{t('enrollment.totalAlreadyEnrolled', { count: result.total_already_enrolled })}</li>
                      )}
                      {result.total_not_found > 0 && (
                        <li style={{ color: 'var(--fn-warning)' }}>
                          {t('enrollment.totalNotFound', { count: result.total_not_found })}
                        </li>
                      )}
                      {result.total_errors !== undefined && result.total_errors > 0 && (
                        <li style={{ color: 'var(--fn-error)' }}>
                          {t('enrollment.totalErrors', { count: result.total_errors })}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            {result.enrolled.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('enrollment.enrolledStudents')} ({result.enrolled.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.enrolled.map((student, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm px-3 py-2 rounded" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
                      <CheckCircleIcon className="h-4 w-4" style={{ color: 'var(--fn-success)' }} />
                      <span>{student.name} ({student.email})</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>- {student.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.not_found.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {t('enrollment.notFoundUsers')} ({result.not_found.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.not_found.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm px-3 py-2 rounded" style={{ color: 'var(--fn-warning)', background: 'var(--bg-elevated)' }}>
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          {result ? (
            <>
              <Button variant="secondary" onClick={handleClose}>
                {t('common.close')}
              </Button>
              <Button onClick={() => {
                setResult(null);
                setEmailList('');
                setCsvFile(null);
              }}>
                {t('enrollment.enrollMore')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={method === 'manual' ? handleManualEnroll : handleCsvEnroll}
                isLoading={loading}
                disabled={method === 'manual' ? !emailList.trim() : !csvFile}
              >
                {t('enrollment.enroll')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
