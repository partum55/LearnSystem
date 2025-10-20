import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Card, CardBody } from './Card';
import { Loading } from './Loading';
import { Button } from './Button';
import { Input } from './Input';
import {
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface GradeEntry {
  entry_id?: string;
  score?: number;
  max_score: number;
  percentage?: number;
  status: string;
  is_late: boolean;
  is_excused: boolean;
}

interface StudentGrades {
  student_id: string;
  student_name: string;
  student_email: string;
  grades: Record<string, GradeEntry | null>;
  summary?: {
    current_grade?: number;
    letter_grade?: string;
    total_points_earned: number;
    total_points_possible: number;
  };
}

interface Assignment {
  id: string;
  title: string;
  max_points: number;
  due_date?: string;
  category?: string;
}

interface TeacherGradebookData {
  course_id: string;
  course_code: string;
  course_title: string;
  assignments: Assignment[];
  students: StudentGrades[];
}

interface TeacherGradebookProps {
  courseId: string;
}

export const TeacherGradebook: React.FC<TeacherGradebookProps> = ({ courseId }) => {
  const { t } = useTranslation();
  const [gradebook, setGradebook] = useState<TeacherGradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchGradebook = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TeacherGradebookData>(`/gradebook/entries/course/${courseId}/`);
      setGradebook(response.data);
    } catch (err: any) {
      console.error('Failed to fetch gradebook:', err);
      setError(err.response?.data?.error || 'Failed to load gradebook');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (studentId: string, assignmentId: string, currentScore?: number) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentScore !== undefined ? currentScore.toString() : '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveGrade = async (entryId?: string) => {
    if (!editingCell) return;

    setSaving(true);
    try {
      const score = editValue === '' ? null : parseFloat(editValue);
      
      if (entryId) {
        // Update existing entry
        await apiClient.patch(`/gradebook/entries/${entryId}/update_grade/`, {
          override_score: score,
          override_reason: 'Manual grade entry by teacher'
        });
      } else {
        // Create new entry (would need additional logic)
        console.log('Creating new entry not yet implemented');
      }

      // Refresh gradebook
      await fetchGradebook();
      setEditingCell(null);
      setEditValue('');
    } catch (err: any) {
      console.error('Failed to save grade:', err);
      alert(err.response?.data?.error || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const recalculateGrades = async () => {
    if (!window.confirm(t('gradebook.recalculate_confirm'))) return;

    setLoading(true);
    try {
      await apiClient.post(`/gradebook/entries/recalculate/${courseId}/`);
      await fetchGradebook();
      alert(t('gradebook.recalculate_success'));
    } catch (err: any) {
      console.error('Failed to recalculate grades:', err);
      alert(err.response?.data?.error || 'Failed to recalculate grades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XMarkIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{error}</h3>
        <Button onClick={fetchGradebook} className="mt-4">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (!gradebook) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('gradebook.teacher_view')}
        </h2>
        <Button onClick={recalculateGrades} variant="outline">
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          {t('gradebook.recalculate')}
        </Button>
      </div>

      {/* Gradebook Table */}
      <Card>
        <CardBody className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                  {t('gradebook.student')}
                </th>
                {gradebook.assignments.map((assignment) => (
                  <th
                    key={assignment.id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]"
                  >
                    <div className="truncate" title={assignment.title}>
                      {assignment.title}
                    </div>
                    <div className="text-xs text-gray-400 font-normal mt-1">
                      {assignment.max_points} pts
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('gradebook.total')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {gradebook.students.map((student) => (
                <tr key={student.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-900 z-10">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.student_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {student.student_email}
                    </div>
                  </td>
                  {gradebook.assignments.map((assignment) => {
                    const grade = student.grades[assignment.id];
                    const isEditing = editingCell?.studentId === student.student_id && 
                                     editingCell?.assignmentId === assignment.id;

                    return (
                      <td
                        key={assignment.id}
                        className="px-4 py-4 text-center text-sm"
                      >
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 text-center"
                              min="0"
                              max={assignment.max_points}
                              step="0.1"
                              disabled={saving}
                              autoFocus
                            />
                            <button
                              onClick={() => saveGrade(grade?.entry_id)}
                              disabled={saving}
                              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="group cursor-pointer flex items-center justify-center"
                            onClick={() => startEdit(student.student_id, assignment.id, grade?.score)}
                          >
                            <span className={`${
                              grade?.is_excused
                                ? 'text-gray-400 italic'
                                : grade?.score !== undefined
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400'
                            }`}>
                              {grade?.is_excused
                                ? t('gradebook.excused')
                                : grade?.score !== undefined
                                ? `${grade.score.toFixed(1)} / ${grade.max_score}`
                                : '-'}
                            </span>
                            <PencilSquareIcon className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 text-gray-400" />
                          </div>
                        )}
                        {grade?.is_late && !isEditing && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            {t('gradebook.late')}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center font-semibold">
                    {student.summary ? (
                      <div>
                        <div className="text-lg text-gray-900 dark:text-white">
                          {student.summary.letter_grade || '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {student.summary.current_grade !== undefined
                            ? `${student.summary.current_grade.toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {gradebook.students.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {t('gradebook.no_students')}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
