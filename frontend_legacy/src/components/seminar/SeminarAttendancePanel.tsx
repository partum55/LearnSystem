import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/client';
import AttendanceQrDisplay from './AttendanceQrDisplay';

interface AttendanceRecord {
  userId: string;
  attended: boolean;
  notes: string;
  markedAt?: string;
  studentName?: string;
  studentEmail?: string;
}

interface SeminarAttendancePanelProps {
  assignmentId: string;
  courseId: string;
  enrolledStudents?: Array<{ id: string; name: string; email: string }>;
}

const SeminarAttendancePanel: React.FC<SeminarAttendancePanelProps> = ({
  assignmentId,
  courseId,
  enrolledStudents = [],
}) => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    // Fetch existing attendance
    apiClient
      .get<Array<Record<string, unknown>>>(`/assessments/assignments/${assignmentId}/attendance`)
      .then((res) => {
        const existing: Record<string, AttendanceRecord> = {};
        for (const item of res.data) {
          const userId = String(item.userId || '');
          existing[userId] = {
            userId,
            attended: Boolean(item.attended),
            notes: String(item.notes || ''),
            markedAt: item.markedAt ? String(item.markedAt) : undefined,
          };
        }
        // Initialize all enrolled students
        for (const student of enrolledStudents) {
          if (!existing[student.id]) {
            existing[student.id] = {
              userId: student.id,
              attended: false,
              notes: '',
            };
          }
        }
        setRecords(existing);
      })
      .catch(() => {
        // Initialize from enrolled students
        const init: Record<string, AttendanceRecord> = {};
        for (const student of enrolledStudents) {
          init[student.id] = { userId: student.id, attended: false, notes: '' };
        }
        setRecords(init);
      });
  }, [assignmentId, enrolledStudents]);

  const toggleAttended = (userId: string) => {
    setRecords((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], attended: !prev[userId]?.attended },
    }));
    setSaved(false);
  };

  const updateNotes = (userId: string, notes: string) => {
    setRecords((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], notes },
    }));
    setSaved(false);
  };

  const markAllPresent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], attended: true };
      }
      return next;
    });
    setSaved(false);
  };

  const markAllAbsent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], attended: false };
      }
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.values(records).map((r) => ({
        userId: r.userId,
        attended: r.attended,
        notes: r.notes,
      }));
      await apiClient.post(`/assessments/assignments/${assignmentId}/attendance`, entries);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save attendance', err);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(records).filter((r) => r.attended).length;
  const totalCount = Object.keys(records).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {t('seminar.attendance', 'Attendance')}
        </h3>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {presentCount}/{totalCount} {t('seminar.present', 'present')}
        </span>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-xs" onClick={markAllPresent}>
          {t('seminar.markAllPresent', 'Mark all present')}
        </button>
        <button type="button" className="btn btn-xs" onClick={markAllAbsent}>
          {t('seminar.markAllAbsent', 'Mark all absent')}
        </button>
        <button type="button" className="btn btn-xs" onClick={() => setShowQr((v) => !v)}>
          {t('qr.generate', 'Generate QR code')}
        </button>
      </div>

      {showQr && (
        <AttendanceQrDisplay assignmentId={assignmentId} courseId={courseId} />
      )}

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                {t('seminar.student', 'Student')}
              </th>
              <th className="text-center py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                {t('seminar.attended', 'Attended')}
              </th>
              <th className="text-left py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                {t('seminar.notes', 'Notes')}
              </th>
            </tr>
          </thead>
          <tbody>
            {enrolledStudents.map((student) => {
              const record = records[student.id];
              return (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td className="py-2 px-3">
                    <div style={{ color: 'var(--text-primary)' }}>{student.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {student.email}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={record?.attended ?? false}
                      onChange={() => toggleAttended(student.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={record?.notes ?? ''}
                      onChange={(e) => updateNotes(student.id, e.target.value)}
                      placeholder={t('seminar.notesPlaceholder', 'Optional notes...')}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: 'var(--fn-success)' }}>
            {t('seminar.saved', 'Attendance saved')}
          </span>
        )}
      </div>
    </div>
  );
};

export default SeminarAttendancePanel;
