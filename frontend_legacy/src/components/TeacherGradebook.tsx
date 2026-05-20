import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient, { extractErrorMessage } from '../api/client';
import { gradebookApi, GradebookCategory, GradeHistoryItem } from '../api/gradebook';
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
  MagnifyingGlassIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface GradeEntry {
  entry_id?: string;
  score?: number;
  max_score: number;
  percentage?: number;
  status: string;
  is_late: boolean;
  is_excused: boolean;
  notes?: string;
}

interface Assignment {
  id: string;
  title: string;
  max_points: number;
  due_date?: string;
  category?: string;
  category_id?: string;
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

interface ApiGradebookEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  score?: number;
  finalScore?: number;
  overrideScore?: number;
  maxScore: number;
  percentage?: number;
  status: string;
  late: boolean;
  excused: boolean;
  notes?: string;
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
  const [editStatus, setEditStatus] = useState<string>('NOT_SUBMITTED');
  const [editExcused, setEditExcused] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<'all' | 'graded' | 'pending' | 'missing'>('all');
  const [categories, setCategories] = useState<GradebookCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [historyByEntry, setHistoryByEntry] = useState<Record<string, GradeHistoryItem[]>>({});
  const [loadingHistoryFor, setLoadingHistoryFor] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWeight, setNewCategoryWeight] = useState('10');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryWeight, setEditingCategoryWeight] = useState('0');
  const [editingCategoryDropLowest, setEditingCategoryDropLowest] = useState('0');
  const [editingCategoryDescription, setEditingCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [mappingAssignmentId, setMappingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    fetchGradebook();
    void fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchGradebook = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesResponse, courseResponse, modulesResponse, assignmentsResponse] = await Promise.all([
        apiClient.get<ApiGradebookEntry[]>(`/gradebook/entries/course/${courseId}`),
        apiClient.get<{ code?: string; title?: string; titleUk?: string; titleEn?: string }>(`/courses/${courseId}`),
        apiClient.get<{ id: string; title: string; position?: number }[]>(`/courses/${courseId}/modules`),
        apiClient.get<{ content?: { id: string; moduleId?: string; module_id?: string }[] }>(
          `/assessments/assignments/course/${courseId}`
        ),
      ]);

      // Build assignment → module mapping from assessments API
      const rawAssignments: { id: string; moduleId?: string; module_id?: string; categoryId?: string; category_id?: string }[] = Array.isArray(assignmentsResponse.data)
        ? assignmentsResponse.data
        : (assignmentsResponse.data as {
            content?: { id: string; moduleId?: string; module_id?: string; categoryId?: string; category_id?: string }[];
          })?.content || [];
      const assignmentModuleMap = new Map<string, string>();
      const assignmentCategoryMap = new Map<string, string>();
      rawAssignments.forEach((a: { id: string; moduleId?: string; module_id?: string; categoryId?: string; category_id?: string }) => {
        const modId = a.moduleId || a.module_id;
        if (modId) assignmentModuleMap.set(a.id, String(modId));
        const categoryId = a.categoryId || a.category_id;
        if (categoryId) assignmentCategoryMap.set(a.id, String(categoryId));
      });

      // Build module info map
      const rawModules = Array.isArray(modulesResponse.data) ? modulesResponse.data : [];
      const moduleInfoMap = new Map<string, { title: string; position: number }>();
      rawModules.forEach((m: { id: string; title: string; position?: number }, idx: number) => {
        moduleInfoMap.set(m.id, { title: m.title, position: m.position ?? idx });
      });

      const entries = entriesResponse.data || [];
      const assignmentMap = new Map<string, Assignment>();
      const studentMap = new Map<string, StudentGrades>();

      entries.forEach((entry) => {
        if (!assignmentMap.has(entry.assignmentId)) {
          const moduleId = assignmentModuleMap.get(entry.assignmentId);
          const moduleInfo = moduleId ? moduleInfoMap.get(moduleId) : undefined;
          assignmentMap.set(entry.assignmentId, {
            id: entry.assignmentId,
            title: entry.assignmentTitle || 'Untitled assignment',
            max_points: Number(entry.maxScore || 0),
            module_id: moduleId,
            module_title: moduleInfo?.title,
            category_id: assignmentCategoryMap.get(entry.assignmentId),
          });
        }

        if (!studentMap.has(entry.studentId)) {
          studentMap.set(entry.studentId, {
            student_id: entry.studentId,
            student_name: entry.studentName || 'Student',
            student_email: entry.studentEmail || '',
            grades: {},
          });
        }

        const student = studentMap.get(entry.studentId)!;
        const resolvedScore = entry.finalScore ?? entry.overrideScore ?? entry.score;
        student.grades[entry.assignmentId] = {
          entry_id: entry.id,
          score: resolvedScore !== undefined && resolvedScore !== null ? Number(resolvedScore) : undefined,
          max_score: Number(entry.maxScore || 0),
          percentage: entry.percentage !== undefined && entry.percentage !== null ? Number(entry.percentage) : undefined,
          status: entry.status,
          is_late: Boolean(entry.late),
          is_excused: Boolean(entry.excused),
          notes: entry.notes || undefined,
        };
      });

      const assignments = Array.from(assignmentMap.values());
      const students = Array.from(studentMap.values()).map((student) => {
        // Ensure every student has a slot for every assignment
        assignments.forEach((assignment) => {
          if (!(assignment.id in student.grades)) {
            student.grades[assignment.id] = null;
          }
        });

        const gradeValues = Object.values(student.grades).filter(
          (grade): grade is GradeEntry => Boolean(grade && grade.score !== undefined)
        );
        const totalEarned = gradeValues.reduce((sum, grade) => sum + (grade.score || 0), 0);
        const totalPossible = gradeValues.reduce((sum, grade) => sum + (grade.max_score || 0), 0);
        const currentGrade = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : undefined;
        const letterGrade =
          currentGrade === undefined ? '-' :
            currentGrade >= 90 ? 'A' :
              currentGrade >= 80 ? 'B' :
                currentGrade >= 70 ? 'C' :
                  currentGrade >= 60 ? 'D' : 'F';

        return {
          ...student,
          summary: {
            current_grade: currentGrade,
            letter_grade: letterGrade,
            total_points_earned: totalEarned,
            total_points_possible: totalPossible,
          },
        };
      });

      setGradebook({
        course_id: courseId,
        course_code: courseResponse.data?.code || '',
        course_title:
          courseResponse.data?.title ||
          courseResponse.data?.titleUk ||
          courseResponse.data?.titleEn ||
          '',
        assignments,
        students,
      });
    } catch (err) {
      console.error('Failed to fetch gradebook:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await gradebookApi.getCategories(courseId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch gradebook categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    const weightPercent = Number(newCategoryWeight);
    if (!name || Number.isNaN(weightPercent)) return;

    try {
      await gradebookApi.createCategory({ courseId, name, weight: weightPercent, dropLowest: 0 });
      setNewCategoryName('');
      setNewCategoryWeight('10');
      await fetchCategories();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const startEditCategory = (category: GradebookCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryWeight(String(category.weight));
    setEditingCategoryDropLowest(String(category.dropLowest ?? 0));
    setEditingCategoryDescription(category.description || '');
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryWeight('0');
    setEditingCategoryDropLowest('0');
    setEditingCategoryDescription('');
  };

  const saveCategory = async () => {
    if (!editingCategoryId) return;
    const name = editingCategoryName.trim();
    const weight = Number(editingCategoryWeight);
    const dropLowest = Number(editingCategoryDropLowest);
    if (!name || Number.isNaN(weight) || Number.isNaN(dropLowest)) return;

    setSavingCategory(true);
    try {
      const original = categories.find((category) => category.id === editingCategoryId);
      await gradebookApi.updateCategory(editingCategoryId, {
        courseId,
        name,
        description: editingCategoryDescription.trim() || undefined,
        weight,
        dropLowest,
        position: original?.position,
      });
      cancelEditCategory();
      await fetchCategories();
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!window.confirm(t('gradebook.delete_category_confirm', 'Delete category?'))) return;

    try {
      await gradebookApi.deleteCategory(categoryId);
      await fetchCategories();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const ordered = [...categories].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((category) => category.id === categoryId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      await gradebookApi.reorderCategories(courseId, reordered.map((category) => category.id));
      await fetchCategories();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const mapAssignmentCategory = async (assignmentId: string, categoryId: string) => {
    setMappingAssignmentId(assignmentId);
    try {
      await apiClient.put(`/assessments/assignments/${assignmentId}`, { categoryId });
      setGradebook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assignments: prev.assignments.map((assignment) =>
            assignment.id === assignmentId ? { ...assignment, category_id: categoryId } : assignment
          ),
        };
      });
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setMappingAssignmentId(null);
    }
  };

  const loadEntryHistory = async (entryId?: string) => {
    if (!entryId) return;
    if (historyByEntry[entryId]) {
      setHistoryByEntry((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      return;
    }

    setLoadingHistoryFor(entryId);
    try {
      const history = await gradebookApi.getEntryHistory(entryId);
      setHistoryByEntry((prev) => ({ ...prev, [entryId]: history }));
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setLoadingHistoryFor(null);
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

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position),
    [categories]
  );

  const categoryNameById = useMemo(
    () =>
      sortedCategories.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = category.name;
        return acc;
      }, {}),
    [sortedCategories]
  );

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
          grade => grade && ['PENDING', 'SUBMITTED'].includes(grade.status)
        );
        const hasMissingAssignments = Object.values(student.grades).some(
          grade => !grade || ['NOT_SUBMITTED', 'MISSING'].includes(grade.status)
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

  const startEdit = (
    studentId: string,
    assignmentId: string,
    grade: GradeEntry | null | undefined
  ) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(grade?.score !== undefined ? String(grade.score) : '');
    setEditStatus(grade?.status || 'NOT_SUBMITTED');
    setEditExcused(Boolean(grade?.is_excused));
    setEditNotes(grade?.notes || '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setEditStatus('NOT_SUBMITTED');
    setEditExcused(false);
    setEditNotes('');
  };

  const saveGrade = async (entryId?: string) => {
    if (!editingCell) return;

    setSaving(true);
    try {
      const score = editValue === '' ? null : parseFloat(editValue);
      if (score !== null && Number.isNaN(score)) {
        alert('Invalid score');
        return;
      }

      if (entryId) {
        // Update existing entry
        await apiClient.patch(`/gradebook/entries/${entryId}`, {
          overrideScore: score,
          overrideReason: 'Manual grade entry by teacher',
          status: editStatus,
          isExcused: editExcused,
          notes: editNotes.trim() || null,
        });
      } else {
        // Create new entry (would need additional logic)
        console.log('Creating new entry not yet implemented');
      }

      // Refresh gradebook
      await fetchGradebook();
      cancelEdit();
    } catch (err) {
      console.error('Failed to save grade:', err);
      alert(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const recalculateGrades = async () => {
    if (!window.confirm(t('gradebook.recalculate_confirm'))) return;

    setLoading(true);
    try {
      await apiClient.post(`/gradebook/recalculate/course/${courseId}`);
      await fetchGradebook();
      alert(t('gradebook.recalculate_success'));
    } catch (err) {
      console.error('Failed to recalculate grades:', err);
      alert(extractErrorMessage(err));
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
        <XMarkIcon className="mx-auto h-12 w-12" style={{ color: 'var(--fn-error)' }} />
        <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</h3>
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
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {t('gradebook.teacher_view')}
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="secondary">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {t('gradebook.filters')}
          </Button>
          <Button onClick={recalculateGrades} variant="secondary">
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
                <label className="label block mb-2">
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
                <label className="label block mb-2">
                  {t('gradebook.filter_by_module')}
                </label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="input w-full"
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
                <label className="label block mb-2">
                  {t('gradebook.filter_by_status')}
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value as 'all' | 'graded' | 'pending' | 'missing')}
                  className="input w-full"
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
              <Button onClick={expandAll} variant="secondary" size="sm">
                {t('gradebook.expand_all')}
              </Button>
              <Button onClick={collapseAll} variant="secondary" size="sm">
                {t('gradebook.collapse_all')}
              </Button>
              {(searchQuery || gradeFilter !== 'all') && (
                <span className="ml-auto text-sm self-center" style={{ color: 'var(--text-muted)' }}>
                  {t('gradebook.showing_students', { count: filteredStudents.length })}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Gradebook Categories */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('gradebook.categories', 'Categories')}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('gradebook.categories_help', 'Use categories to structure weighted grading.')}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="label block mb-1">{t('gradebook.category_name', 'Name')}</label>
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-1">{t('gradebook.category_weight', 'Weight %')}</label>
                <Input type="number" value={newCategoryWeight} onChange={(e) => setNewCategoryWeight(e.target.value)} />
              </div>
              <Button onClick={() => void createCategory()}>
                <PlusIcon className="h-4 w-4 mr-1" />
                {t('gradebook.add_category', 'Add')}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {categoriesLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
            ) : categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('gradebook.no_categories', 'No categories yet.')}</p>
            ) : (
              sortedCategories.map((category) => {
                const isEditing = editingCategoryId === category.id;
                return (
                  <div key={category.id} className="rounded-md px-3 py-2" style={{ background: 'var(--bg-base)' }}>
                    {isEditing ? (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                        <Input
                          value={editingCategoryName}
                          onChange={(event) => setEditingCategoryName(event.target.value)}
                          placeholder={t('gradebook.category_name', 'Name')}
                        />
                        <Input
                          type="number"
                          value={editingCategoryWeight}
                          onChange={(event) => setEditingCategoryWeight(event.target.value)}
                          placeholder={t('gradebook.category_weight', 'Weight %')}
                        />
                        <Input
                          type="number"
                          value={editingCategoryDropLowest}
                          onChange={(event) => setEditingCategoryDropLowest(event.target.value)}
                          placeholder={t('gradebook.drop_lowest', 'Drop lowest')}
                        />
                        <Input
                          value={editingCategoryDescription}
                          onChange={(event) => setEditingCategoryDescription(event.target.value)}
                          placeholder={t('assignment.description', 'Description')}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void saveCategory()} isLoading={savingCategory}>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {t('common.save')}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEditCategory}>
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{category.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {category.weight}% · drop lowest {category.dropLowest || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => void moveCategory(category.id, 'up')}>
                            {t('common.moveUp', 'Move up')}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => void moveCategory(category.id, 'down')}>
                            {t('common.moveDown', 'Move down')}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => startEditCategory(category)}>
                            <PencilSquareIcon className="h-4 w-4 mr-1" />
                            {t('gradebook.edit_category', 'Edit')}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => void deleteCategory(category.id)}>
                            <TrashIcon className="h-4 w-4 mr-1" />
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {gradebook.assignments.length > 0 && sortedCategories.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('gradebook.assignment_category', 'Assignment category')}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('gradebook.assignment_category_help', 'Map assignments to grading categories.')}
              </p>
              <div className="mt-3 space-y-2">
                {gradebook.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-md px-3 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                    style={{ background: 'var(--bg-base)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {assignment.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {assignment.module_title || t('gradebook.unassigned_module')}
                      </p>
                    </div>
                    <select
                      className="input w-full md:w-64"
                      value={assignment.category_id || ''}
                      onChange={(event) => void mapAssignmentCategory(assignment.id, event.target.value)}
                      disabled={mappingAssignmentId === assignment.id}
                    >
                      <option value="" disabled>
                        {t('common.select')}
                      </option>
                      {sortedCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.map((student) => {
          const isExpanded = expandedStudents.has(student.student_id);

          return (
            <Card key={student.student_id}>
              <CardBody>
                {/* Student Header */}
                <div
                  className="flex items-center justify-between cursor-pointer -m-6 p-6 rounded-t-lg transition-colors"
                  onClick={() => toggleStudentExpansion(student.student_id)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {student.student_name}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {student.student_email}
                      </p>
                    </div>
                  </div>

                  {/* Student Summary */}
                  {student.summary && (
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {t('gradebook.current_grade')}
                        </div>
                        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {student.summary.letter_grade || '-'}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {student.summary.current_grade !== undefined && student.summary.current_grade !== null
                            ? `${student.summary.current_grade.toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {t('gradebook.points')}
                        </div>
                        <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
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
                        <div key={module.module_id} className="pl-4" style={{ borderLeft: '4px solid var(--text-secondary)' }}>
                          <h4 className="text-md font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
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
                                  className="flex items-center justify-between p-3 rounded-lg"
                                  style={{ background: 'var(--bg-base)' }}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.title}
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                      {t('gradebook.max_points')}: {assignment.max_points}
                                      {assignment.due_date && ` • ${t('gradebook.due')}: ${new Date(assignment.due_date).toLocaleDateString()}`}
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                      {t('gradebook.assignment_category', 'Assignment category')}: {assignment.category_id ? categoryNameById[assignment.category_id] : t('gradebook.unassigned_category', 'Unassigned')}
                                    </div>
                                  </div>

                                  {/* Grade Input/Display */}
                                  <div className="flex items-center gap-2">
                                    {isEditing ? (
                                      <div className="min-w-[340px] space-y-2">
                                        <div className="flex items-center gap-2">
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
                                          <span style={{ color: 'var(--text-muted)' }}>/ {assignment.max_points}</span>
                                          <select
                                            className="input w-40"
                                            value={editStatus}
                                            onChange={(event) => setEditStatus(event.target.value)}
                                            disabled={saving}
                                          >
                                            {['NOT_SUBMITTED', 'SUBMITTED', 'GRADED', 'MISSING', 'LATE', 'EXCUSED'].map((status) => (
                                              <option key={status} value={status}>
                                                {t(`gradebook.status.${status.toLowerCase()}`, status)}
                                              </option>
                                            ))}
                                          </select>
                                          <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <input
                                              type="checkbox"
                                              checked={editExcused}
                                              onChange={(event) => setEditExcused(event.target.checked)}
                                              disabled={saving}
                                            />
                                            {t('gradebook.excused')}
                                          </label>
                                        </div>
                                        <Input
                                          value={editNotes}
                                          onChange={(event) => setEditNotes(event.target.value)}
                                          placeholder={t('gradebook.student_note', 'Note')}
                                          disabled={saving}
                                        />
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => saveGrade(grade?.entry_id)}
                                            disabled={saving}
                                            className="p-2 rounded transition-colors"
                                            style={{ color: 'var(--fn-success)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                                          >
                                            <CheckIcon className="h-5 w-5" />
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-2 rounded transition-colors"
                                            style={{ color: 'var(--fn-error)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                                          >
                                            <XMarkIcon className="h-5 w-5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="min-w-[120px] text-right">
                                          {grade?.is_excused ? (
                                            <span className="italic" style={{ color: 'var(--text-faint)' }}>
                                              {t('gradebook.excused')}
                                            </span>
                                          ) : grade?.score !== undefined && grade?.score !== null ? (
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                              {grade.score.toFixed(1)} / {grade.max_score}
                                              {grade.percentage !== undefined && (
                                                <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                  ({grade.percentage.toFixed(0)}%)
                                                </span>
                                              )}
                                            </span>
                                          ) : (
                                            <span style={{ color: 'var(--text-faint)' }}>
                                              {t('gradebook.not_graded')}
                                            </span>
                                          )}
                                          {grade?.notes && (
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                              {t('gradebook.student_note', 'Note')}: {grade.notes}
                                            </p>
                                          )}
                                        </div>

                                        {/* Status Badges */}
                                        <div className="flex gap-1">
                                          {grade?.is_late && (
                                            <span className="badge badge-warning">
                                              {t('gradebook.late')}
                                            </span>
                                          )}
                                          {(grade?.status === 'SUBMITTED' || grade?.status === 'LATE') && (
                                            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                              {t(`gradebook.status.${grade.status.toLowerCase()}`, grade.status)}
                                            </span>
                                          )}
                                          {(!grade || grade.status === 'NOT_SUBMITTED') && (
                                            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                              {t('gradebook.not_submitted')}
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          onClick={() => startEdit(student.student_id, assignment.id, grade)}
                                          className="p-2 rounded transition-colors"
                                          style={{ color: 'var(--text-faint)' }}
                                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = ''; }}
                                        >
                                          <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        {grade?.entry_id && (
                                          <button
                                            onClick={() => void loadEntryHistory(grade.entry_id)}
                                            className="p-2 rounded transition-colors"
                                            style={{ color: 'var(--text-faint)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = ''; }}
                                          >
                                            <ClockIcon className="h-5 w-5" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {module.assignments.some((assignment) => {
                            const grade = student.grades[assignment.id];
                            return Boolean(grade?.entry_id && historyByEntry[grade.entry_id]?.length);
                          }) && (
                            <div className="mt-3 space-y-2">
                              {module.assignments.map((assignment) => {
                                const grade = student.grades[assignment.id];
                                if (!grade?.entry_id) return null;
                                const history = historyByEntry[grade.entry_id];
                                if (!history) return null;
                                return (
                                  <div key={`${assignment.id}-history`} className="rounded-md p-3" style={{ background: 'var(--bg-overlay)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {assignment.title} · {t('gradebook.history', 'History')}
                                    </p>
                                    {loadingHistoryFor === grade.entry_id ? (
                                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
                                    ) : history.length === 0 ? (
                                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {t('gradebook.no_history', 'No history entries')}
                                      </p>
                                    ) : (
                                      <div className="mt-1 space-y-1">
                                        {history.map((item) => (
                                          <p key={item.id} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {item.changedAt ? new Date(item.changedAt).toLocaleString() : '—'}: {item.previousScore ?? '-'} → {item.newScore ?? '-'} {item.reason ? `(${item.reason})` : ''}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                <p style={{ color: 'var(--text-muted)' }}>
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
