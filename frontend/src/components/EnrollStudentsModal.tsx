import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
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

      const response = await fetch(`http://localhost:8000/api/courses/${courseId}/enroll_students/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          student_emails: emails,
          role: role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('enrollment.errors.enrollFailed'));
      }

      const data: EnrollmentResult = await response.json();
      setResult(data);

      if (data.total_enrolled > 0) {
        onEnrolled();
      }
    } catch (err: any) {
      setError(err.message);
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
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`http://localhost:8000/api/courses/${courseId}/enroll-csv/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('enrollment.errors.enrollFailed'));
      }

      const data: EnrollmentResult = await response.json();
      setResult(data);

      if (data.total_enrolled > 0 || (data.total_created && data.total_created > 0)) {
        onEnrolled();
      }
    } catch (err: any) {
      setError(err.message);
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
              method === 'manual'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <UserPlusIcon className="h-5 w-5" />
            <span className="font-medium">{t('enrollment.manual')}</span>
          </button>
          <button
            onClick={() => setMethod('csv')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
              method === 'csv'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            <span className="font-medium">{t('enrollment.csv')}</span>
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {method === 'manual' && !result && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('enrollment.role')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TA')}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="STUDENT">{t('enrollment.roles.student')}</option>
                <option value="TA">{t('enrollment.roles.ta')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('enrollment.emailList')}
              </label>
              <textarea
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
                rows={8}
                placeholder={t('enrollment.emailListPlaceholder')}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('enrollment.emailListHint')}
              </p>
            </div>
          </div>
        )}

        {/* CSV Upload Form */}
        {method === 'csv' && !result && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {t('enrollment.csvFormat')}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                    <p>{t('enrollment.csvFormatDesc')}</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">email</code> - {t('enrollment.csvFields.email')}</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">name</code> - {t('enrollment.csvFields.name')}</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">role</code> - {t('enrollment.csvFields.role')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={downloadSampleCsv}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    {t('enrollment.downloadSample')}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('enrollment.selectFile')}
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
              />
              {csvFile && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('enrollment.selectedFile')}: {csvFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t('enrollment.success')}
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('enrollment.totalEnrolled', { count: result.total_enrolled })}</li>
                      {result.total_created !== undefined && result.total_created > 0 && (
                        <li>{t('enrollment.totalCreated', { count: result.total_created })}</li>
                      )}
                      {result.total_already_enrolled > 0 && (
                        <li>{t('enrollment.totalAlreadyEnrolled', { count: result.total_already_enrolled })}</li>
                      )}
                      {result.total_not_found > 0 && (
                        <li className="text-yellow-700 dark:text-yellow-400">
                          {t('enrollment.totalNotFound', { count: result.total_not_found })}
                        </li>
                      )}
                      {result.total_errors !== undefined && result.total_errors > 0 && (
                        <li className="text-red-700 dark:text-red-400">
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('enrollment.enrolledStudents')} ({result.enrolled.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.enrolled.map((student, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span>{student.name} ({student.email})</span>
                      <span className="text-xs text-gray-500">- {student.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.not_found.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('enrollment.notFoundUsers')} ({result.not_found.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.not_found.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded">
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
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

