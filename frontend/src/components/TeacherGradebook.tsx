import React, { useEffect, useState, useMemo } from 'react';
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
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
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

interface Assignment {
  id: string;
  title: string;
  max_points: number;
  due_date?: string;
  category?: string;
  module_id?: string;
  module_title?: string;
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

interface Module {
  id: string;
  title: string;
  assignments: Assignment[];
}

interface TeacherGradebookData {
  course_id: string;
  course_code: string;
  course_title: string;
  assignments: Assignment[];
  students: StudentGrades[];
  modules?: Module[];
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

  // Filters and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<'all' | 'graded' | 'pending' | 'missing'>('all');

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

  // Group assignments by modules
  const groupedAssignments = useMemo(() => {
    if (!gradebook) return [];

    const moduleMap = new Map<string, { module_id: string; module_title: string; assignments: Assignment[] }>();

    gradebook.assignments.forEach((assignment) => {
      const moduleId = assignment.module_id || 'unassigned';
      const moduleTitle = assignment.module_title || t('gradebook.unassigned_module');

      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, {
          module_id: moduleId,
          module_title: moduleTitle,
          assignments: []
        });
      }

      moduleMap.get(moduleId)!.assignments.push(assignment);
    });

    return Array.from(moduleMap.values());
  }, [gradebook, t]);

  // Filter students based on search and grade filter
  const filteredStudents = useMemo(() => {
    if (!gradebook) return [];

    return gradebook.students.filter((student) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = student.student_name.toLowerCase().includes(query);
        const matchesEmail = student.student_email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Grade filter
      if (gradeFilter !== 'all') {
        const hasGradedAssignments = Object.values(student.grades).some(
          grade => grade && grade.score !== null && grade.score !== undefined
        );
        const hasPendingAssignments = Object.values(student.grades).some(
          grade => grade && grade.status === 'PENDING'
        );
        const hasMissingAssignments = Object.values(student.grades).some(
          grade => !grade || grade.status === 'NOT_SUBMITTED'
        );

        if (gradeFilter === 'graded' && !hasGradedAssignments) return false;
        if (gradeFilter === 'pending' && !hasPendingAssignments) return false;
        if (gradeFilter === 'missing' && !hasMissingAssignments) return false;
      }

      return true;
    });
  }, [gradebook, searchQuery, gradeFilter]);

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (gradebook) {
      setExpandedStudents(new Set(gradebook.students.map(s => s.student_id)));
    }
  };

  const collapseAll = () => {
    setExpandedStudents(new Set());
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('gradebook.teacher_view')}
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {t('gradebook.filters')}
          </Button>
          <Button onClick={recalculateGrades} variant="outline">
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            {t('gradebook.recalculate')}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
                  {t('gradebook.search_student')}
                </label>
                <Input
                  type="text"
                  placeholder={t('gradebook.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Module Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('gradebook.filter_by_module')}
                </label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('gradebook.all_modules')}</option>
                  {groupedAssignments.map((module) => (
                    <option key={module.module_id} value={module.module_id}>
                      {module.module_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('gradebook.filter_by_status')}
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('gradebook.all_students')}</option>
                  <option value="graded">{t('gradebook.has_graded')}</option>
                  <option value="pending">{t('gradebook.has_pending')}</option>
                  <option value="missing">{t('gradebook.has_missing')}</option>
                </select>
              </div>
            </div>

            {/* Expand/Collapse Controls */}
            <div className="mt-4 flex gap-2">
              <Button onClick={expandAll} variant="outline" size="sm">
                {t('gradebook.expand_all')}
              </Button>
              <Button onClick={collapseAll} variant="outline" size="sm">
                {t('gradebook.collapse_all')}
              </Button>
              {(searchQuery || gradeFilter !== 'all') && (
                <span className="ml-auto text-sm text-gray-600 dark:text-gray-400 self-center">
                  {t('gradebook.showing_students', { count: filteredStudents.length })}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.map((student) => {
          const isExpanded = expandedStudents.has(student.student_id);

          return (
            <Card key={student.student_id}>
              <CardBody>
                {/* Student Header */}
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -m-6 p-6 rounded-t-lg"
                  onClick={() => toggleStudentExpansion(student.student_id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {student.student_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.student_email}
                      </p>
                    </div>
                  </div>

                  {/* Student Summary */}
                  {student.summary && (
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t('gradebook.current_grade')}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {student.summary.letter_grade || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.summary.current_grade !== undefined && student.summary.current_grade !== null
                            ? `${student.summary.current_grade.toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t('gradebook.points')}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {student.summary.total_points_earned.toFixed(1)} / {student.summary.total_points_possible.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Content - Modules and Assignments */}
                {isExpanded && (
                  <div className="mt-6 space-y-6">
                    {groupedAssignments
                      .filter(module => selectedModule === 'all' || module.module_id === selectedModule)
                      .map((module) => (
                      <div key={module.module_id} className="border-l-4 border-indigo-500 pl-4">
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                          {module.module_title}
                        </h4>

                        <div className="space-y-2">
                          {module.assignments.map((assignment) => {
                            const grade = student.grades[assignment.id];
                            const isEditing = editingCell?.studentId === student.student_id &&
                                             editingCell?.assignmentId === assignment.id;

                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {assignment.title}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('gradebook.max_points')}: {assignment.max_points}
                                    {assignment.due_date && ` • ${t('gradebook.due')}: ${new Date(assignment.due_date).toLocaleDateString()}`}
                                  </div>
                                </div>

                                {/* Grade Input/Display */}
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-24 text-center"
                                        min="0"
                                        max={assignment.max_points}
                                        step="0.1"
                                        disabled={saving}
                                        autoFocus
                                      />
                                      <span className="text-gray-500">/ {assignment.max_points}</span>
                                      <button
                                        onClick={() => saveGrade(grade?.entry_id)}
                                        disabled={saving}
                                        className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                      >
                                        <CheckIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                      >
                                        <XMarkIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="min-w-[120px] text-right">
                                        {grade?.is_excused ? (
                                          <span className="text-gray-400 italic">
                                            {t('gradebook.excused')}
                                          </span>
                                        ) : grade?.score !== undefined && grade?.score !== null ? (
                                          <span className="font-semibold text-gray-900 dark:text-white">
                                            {grade.score.toFixed(1)} / {grade.max_score}
                                            {grade.percentage !== undefined && (
                                              <span className="ml-2 text-sm text-gray-500">
                                                ({grade.percentage.toFixed(0)}%)
                                              </span>
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">
                                            {t('gradebook.not_graded')}
                                          </span>
                                        )}
                                      </div>

                                      {/* Status Badges */}
                                      <div className="flex gap-1">
                                        {grade?.is_late && (
                                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                            {t('gradebook.late')}
                                          </span>
                                        )}
                                        {grade?.status === 'PENDING' && (
                                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                            {t('gradebook.pending')}
                                          </span>
                                        )}
                                        {(!grade || grade.status === 'NOT_SUBMITTED') && (
                                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 rounded">
                                            {t('gradebook.not_submitted')}
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => startEdit(student.student_id, assignment.id, grade?.score ?? undefined)}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                      >
                                        <PencilSquareIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}

        {filteredStudents.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || gradeFilter !== 'all'
                    ? t('gradebook.no_students_match_filter')
                    : t('gradebook.no_students')}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
