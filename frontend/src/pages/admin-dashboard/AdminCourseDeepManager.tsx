import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  QuestionMarkCircleIcon,
  AcademicCapIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { AdminCourse } from '../../api/admin';
import { adminCourseDeepApi } from '../../api/adminCourseManagement';
import { Loading } from '../../components/Loading';

interface Props {
  course: AdminCourse;
  onBack: () => void;
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

// Lightweight section collapse/expand
const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  count?: number;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon: Icon, count, defaultOpen = false, actions, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          <Icon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          {title}
          {count !== undefined && (
            <span className="badge badge-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {count}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
          {open ? <ChevronDownIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronRightIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
        </span>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
};

const inputClass = 'input text-sm';
const selectClass = 'input text-sm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export const AdminCourseDeepManager: React.FC<Props> = ({ course, onBack, onFeedback }) => {
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [assignments, setAssignments] = useState<AnyRecord[]>([]);
  const [quizzes, setQuizzes] = useState<AnyRecord[]>([]);
  const [questions, setQuestions] = useState<AnyRecord[]>([]);
  const [members, setMembers] = useState<AnyRecord[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleResources, setModuleResources] = useState<Record<string, AnyRecord[]>>({});

  // ---- Forms ----
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [editingModule, setEditingModule] = useState<AnyRecord | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');

  const [newResourceForm, setNewResourceForm] = useState<{ moduleId: string; title: string; type: string; url: string; text: string } | null>(null);

  const [newAssignForm, setNewAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState<AnyRecord>({ assignmentType: 'FILE_UPLOAD', title: '', description: '', maxPoints: 100 });

  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDesc, setNewQuizDesc] = useState('');
  const [newQuizModuleId, setNewQuizModuleId] = useState('');

  const [newQuestionForm, setNewQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState<AnyRecord>({ questionType: 'MULTIPLE_CHOICE', stem: '', points: 5 });

  const courseId = course.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mods, assns, qzs, qns, mbrs] = await Promise.all([
        adminCourseDeepApi.getModules(courseId).catch(() => []),
        adminCourseDeepApi.getAssignments(courseId).catch(() => []),
        adminCourseDeepApi.getQuizzes(courseId).catch(() => []),
        adminCourseDeepApi.getQuestions(courseId).catch(() => []),
        adminCourseDeepApi.getMembers(courseId).catch(() => []),
      ]);
      setModules(mods);
      setAssignments(assns as AnyRecord[]);
      setQuizzes(qzs as AnyRecord[]);
      setQuestions(qns as AnyRecord[]);
      setMembers(mbrs as AnyRecord[]);
    } catch {
      onFeedback('error', 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [courseId, onFeedback]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const loadModuleResources = useCallback(async (moduleId: string) => {
    try {
      const res = await adminCourseDeepApi.getResources(courseId, moduleId);
      setModuleResources(prev => ({ ...prev, [moduleId]: res }));
    } catch { /* ignore */ }
  }, [courseId]);

  const toggleModule = (moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      if (!moduleResources[moduleId]) void loadModuleResources(moduleId);
    }
  };

  // ==================== MODULE ACTIONS ====================
  const createModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      await adminCourseDeepApi.createModule(courseId, { title: newModuleTitle.trim(), description: newModuleDesc.trim() || undefined });
      setNewModuleTitle('');
      setNewModuleDesc('');
      onFeedback('success', 'Module created');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed to create module: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const saveEditModule = async () => {
    if (!editingModule) return;
    try {
      await adminCourseDeepApi.updateModule(courseId, editingModule.id, { title: editModuleTitle, description: editModuleDesc });
      setEditingModule(null);
      onFeedback('success', 'Module updated');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its contents?')) return;
    try {
      await adminCourseDeepApi.deleteModule(courseId, moduleId);
      onFeedback('success', 'Module deleted');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const toggleModulePublish = async (mod: AnyRecord) => {
    try {
      if (mod.isPublished || mod.is_published) {
        await adminCourseDeepApi.unpublishModule(courseId, mod.id);
      } else {
        await adminCourseDeepApi.publishModule(courseId, mod.id);
      }
      onFeedback('success', 'Module status changed');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ==================== RESOURCE ACTIONS ====================
  const createResource = async () => {
    if (!newResourceForm || !newResourceForm.title.trim()) return;
    try {
      await adminCourseDeepApi.createResource(courseId, newResourceForm.moduleId, {
        title: newResourceForm.title.trim(),
        resourceType: newResourceForm.type,
        externalUrl: newResourceForm.url || undefined,
        textContent: newResourceForm.text || undefined,
      });
      setNewResourceForm(null);
      onFeedback('success', 'Resource created');
      await loadModuleResources(newResourceForm.moduleId);
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deleteResource = async (moduleId: string, resourceId: string) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await adminCourseDeepApi.deleteResource(courseId, moduleId, resourceId);
      onFeedback('success', 'Resource deleted');
      await loadModuleResources(moduleId);
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ==================== ASSIGNMENT ACTIONS ====================
  const createAssignment = async () => {
    if (!assignForm.title?.trim()) return;
    if (assignForm.assignmentType === 'QUIZ' && !assignForm.moduleId) {
      onFeedback('error', 'Module is required for QUIZ assignments');
      return;
    }
    try {
      await adminCourseDeepApi.createAssignment({
        courseId,
        assignmentType: assignForm.assignmentType || 'FILE_UPLOAD',
        title: assignForm.title.trim(),
        description: assignForm.description || '',
        maxPoints: Number(assignForm.maxPoints) || 100,
        moduleId: assignForm.moduleId || undefined,
        programmingLanguage: assignForm.programmingLanguage || undefined,
        starterCode: assignForm.starterCode || undefined,
        isPublished: assignForm.isPublished || false,
        dueDate: assignForm.dueDate || undefined,
      });
      setNewAssignForm(false);
      setAssignForm({ assignmentType: 'FILE_UPLOAD', title: '', description: '', maxPoints: 100 });
      onFeedback('success', 'Assignment created');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await adminCourseDeepApi.deleteAssignment(id);
      onFeedback('success', 'Assignment deleted');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const toggleAssignmentPublish = async (assn: AnyRecord) => {
    try {
      if (assn.isPublished || assn.is_published) {
        await adminCourseDeepApi.unpublishAssignment(assn.id);
      } else {
        await adminCourseDeepApi.publishAssignment(assn.id);
      }
      onFeedback('success', 'Assignment status changed');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const duplicateAssignment = async (assignment: AnyRecord) => {
    try {
      await adminCourseDeepApi.duplicateAssignment(String(assignment.id), {
        targetCourseId: courseId,
        targetModuleId: assignment.moduleId || assignment.module_id || undefined,
      });
      onFeedback('success', 'Assignment duplicated');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ==================== QUIZ ACTIONS ====================
  const createQuiz = async () => {
    if (!newQuizTitle.trim() || !newQuizModuleId) return;
    try {
      await adminCourseDeepApi.createQuiz(courseId, newQuizModuleId, newQuizTitle.trim(), newQuizDesc.trim() || undefined);
      setNewQuizTitle('');
      setNewQuizDesc('');
      setNewQuizModuleId('');
      onFeedback('success', 'Quiz created');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    try {
      await adminCourseDeepApi.deleteQuiz(id);
      onFeedback('success', 'Quiz deleted');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const duplicateQuiz = async (quiz: AnyRecord) => {
    try {
      await adminCourseDeepApi.duplicateQuiz(String(quiz.id), {
        targetCourseId: courseId,
        targetModuleId: quiz.moduleId || quiz.module_id || undefined,
      });
      onFeedback('success', 'Quiz duplicated');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ==================== QUESTION ACTIONS ====================
  const createQuestion = async () => {
    if (!questionForm.stem?.trim()) return;
    try {
      const optionsRaw = questionForm.optionsText || '';
      const optsArray = optionsRaw.split('\n').map((s: string) => s.trim()).filter(Boolean);
      const optionsMap: Record<string, string> = {};
      optsArray.forEach((opt: string, i: number) => { optionsMap[String.fromCharCode(65 + i)] = opt; });

      await adminCourseDeepApi.createQuestion({
        courseId,
        questionType: questionForm.questionType || 'MULTIPLE_CHOICE',
        stem: questionForm.stem.trim(),
        options: Object.keys(optionsMap).length > 0 ? optionsMap : undefined,
        correctAnswer: questionForm.correctAnswer ? { answer: questionForm.correctAnswer } : undefined,
        explanation: questionForm.explanation || undefined,
        points: Number(questionForm.points) || 5,
      });
      setNewQuestionForm(false);
      setQuestionForm({ questionType: 'MULTIPLE_CHOICE', stem: '', points: 5 });
      onFeedback('success', 'Question created');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await adminCourseDeepApi.deleteQuestion(id);
      onFeedback('success', 'Question deleted');
      await loadAll();
    } catch (e: unknown) {
      onFeedback('error', `Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading) return <Loading />;

  const published = (v: unknown) => v ? (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--fn-success)' }}>Published</span>
  ) : (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--fn-warning)' }}>Draft</span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm">&larr; Back</button>
        <div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {course.code}: {course.titleUk || course.titleEn}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Full management — {modules.length} modules · {assignments.length} assignments · {quizzes.length} quizzes · {questions.length} questions · {members.length} members
          </p>
        </div>
      </div>

      {/* ==================== MODULES ==================== */}
      <Section title="Modules" icon={FolderIcon} count={modules.length} defaultOpen actions={
        <button type="button" className="btn btn-primary btn-xs" onClick={() => setNewModuleTitle(' ')}>
          <PlusCircleIcon className="h-3.5 w-3.5" /> Add
        </button>
      }>
        {/* Create module form */}
        {newModuleTitle !== '' && (
          <div className="flex flex-wrap gap-2 p-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <input className={inputClass} placeholder="Module title" value={newModuleTitle.trim()} onChange={e => setNewModuleTitle(e.target.value)} style={{ flex: '1 1 200px' }} />
            <input className={inputClass} placeholder="Description (optional)" value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} style={{ flex: '1 1 200px' }} />
            <button className="btn btn-primary btn-xs" onClick={createModule}>Create</button>
            <button className="btn btn-ghost btn-xs" onClick={() => { setNewModuleTitle(''); setNewModuleDesc(''); }}>Cancel</button>
          </div>
        )}

        {modules.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No modules yet</p>}

        {modules.map((mod: AnyRecord) => (
          <div key={mod.id} className="rounded" style={{ border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between p-2">
              <button type="button" className="flex items-center gap-2 text-sm flex-1 text-left" onClick={() => toggleModule(mod.id)} style={{ color: 'var(--text-primary)' }}>
                {expandedModule === mod.id ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                <span className="font-medium">{mod.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{mod.position ?? '-'}</span>
                {published(mod.isPublished ?? mod.is_published)}
              </button>
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-xs" title="Toggle publish" onClick={() => toggleModulePublish(mod)}>
                  {(mod.isPublished ?? mod.is_published) ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                </button>
                <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => { setEditingModule(mod); setEditModuleTitle(mod.title); setEditModuleDesc(mod.description || ''); }}>
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                </button>
                <button className="btn btn-ghost btn-xs" title="Add resource" onClick={() => setNewResourceForm({ moduleId: mod.id, title: '', type: 'TEXT', url: '', text: '' })}>
                  <PlusCircleIcon className="h-3.5 w-3.5" />
                </button>
                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--fn-error)' }} title="Delete" onClick={() => deleteModule(mod.id)}>
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Edit module inline */}
            {editingModule?.id === mod.id && (
              <div className="flex flex-wrap gap-2 p-2 mx-2 mb-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <input className={inputClass} value={editModuleTitle} onChange={e => setEditModuleTitle(e.target.value)} style={{ flex: '1 1 200px' }} />
                <input className={inputClass} value={editModuleDesc} onChange={e => setEditModuleDesc(e.target.value)} placeholder="Description" style={{ flex: '1 1 200px' }} />
                <button className="btn btn-primary btn-xs" onClick={saveEditModule}>Save</button>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditingModule(null)}>Cancel</button>
              </div>
            )}

            {/* Resources + add resource form */}
            {expandedModule === mod.id && (
              <div className="px-2 pb-2 space-y-1">
                {/* New resource form */}
                {newResourceForm?.moduleId === mod.id && (
                  <div className="flex flex-wrap gap-2 p-2 rounded" style={{ background: 'var(--bg-base)', border: '1px dashed var(--border-default)' }}>
                    <input className={inputClass} placeholder="Resource title" value={newResourceForm?.title ?? ''} onChange={e => { if (newResourceForm) setNewResourceForm({ ...newResourceForm, title: e.target.value }); }} style={{ flex: '1 1 160px' }} />
                    <select className={selectClass} value={newResourceForm?.type ?? 'TEXT'} onChange={e => { if (newResourceForm) setNewResourceForm({ ...newResourceForm, type: e.target.value }); }} style={{ flex: '0 0 120px' }}>
                      {['TEXT', 'VIDEO', 'PDF', 'SLIDE', 'LINK', 'CODE', 'OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {newResourceForm && ['LINK', 'VIDEO'].includes(newResourceForm.type) && (
                      <input className={inputClass} placeholder="URL" value={newResourceForm.url} onChange={e => setNewResourceForm({ ...newResourceForm, url: e.target.value })} style={{ flex: '1 1 200px' }} />
                    )}
                    {newResourceForm && ['TEXT', 'CODE'].includes(newResourceForm.type) && (
                      <textarea className={inputClass} placeholder="Content" value={newResourceForm.text} onChange={e => setNewResourceForm({ ...newResourceForm, text: e.target.value })} rows={2} style={{ flex: '1 1 100%' }} />
                    )}
                    <button className="btn btn-primary btn-xs" onClick={createResource}>Add</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setNewResourceForm(null)}>Cancel</button>
                  </div>
                )}

                {(moduleResources[mod.id] || []).length === 0 && (
                  <p className="text-xs py-1 pl-6" style={{ color: 'var(--text-muted)' }}>No resources in this module</p>
                )}

                {(moduleResources[mod.id] || []).map((res: AnyRecord) => (
                  <div key={res.id} className="flex items-center justify-between pl-6 pr-2 py-1">
                    <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <DocumentTextIcon className="h-3.5 w-3.5" />
                      <span className="font-medium">{res.title}</span>
                      <span className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {res.resourceType || res.resource_type}
                      </span>
                    </span>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--fn-error)' }} onClick={() => deleteResource(mod.id, res.id)}>
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* ==================== ASSIGNMENTS ==================== */}
      <Section title="Assignments" icon={ClipboardDocumentListIcon} count={assignments.length} actions={
        <button type="button" className="btn btn-primary btn-xs" onClick={() => setNewAssignForm(true)}>
          <PlusCircleIcon className="h-3.5 w-3.5" /> Add
        </button>
      }>
        {newAssignForm && (
          <div className="p-3 rounded space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="grid gap-2 md:grid-cols-2">
              <input className={inputClass} placeholder="Assignment title" value={assignForm.title || ''} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} />
              <select className={selectClass} value={assignForm.assignmentType} onChange={e => setAssignForm(f => ({ ...f, assignmentType: e.target.value }))}>
                {['FILE_UPLOAD', 'TEXT', 'CODE', 'URL', 'QUIZ', 'MANUAL_GRADE', 'EXTERNAL'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea className={inputClass} placeholder="Description" value={assignForm.description || ''} onChange={e => setAssignForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              <div className="space-y-1">
                <input className={inputClass} type="number" placeholder="Max points" value={assignForm.maxPoints || ''} onChange={e => setAssignForm(f => ({ ...f, maxPoints: e.target.value }))} />
                <input className={inputClass} type="datetime-local" placeholder="Due date" value={assignForm.dueDate || ''} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              {assignForm.assignmentType === 'CODE' && (
                <>
                  <select className={selectClass} value={assignForm.programmingLanguage || ''} onChange={e => setAssignForm(f => ({ ...f, programmingLanguage: e.target.value }))}>
                    <option value="">Language</option>
                    {['python', 'java', 'javascript', 'c', 'cpp', 'rust', 'go'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <textarea className={inputClass} placeholder="Starter code" value={assignForm.starterCode || ''} onChange={e => setAssignForm(f => ({ ...f, starterCode: e.target.value }))} rows={3} />
                </>
              )}
              <select className={selectClass} value={assignForm.moduleId || ''} onChange={e => setAssignForm(f => ({ ...f, moduleId: e.target.value }))}>
                <option value="">No module (standalone)</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={!!assignForm.isPublished} onChange={e => setAssignForm(f => ({ ...f, isPublished: e.target.checked }))} />
                Publish immediately
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-xs" onClick={() => { setNewAssignForm(false); setAssignForm({ assignmentType: 'FILE_UPLOAD', title: '', description: '', maxPoints: 100 }); }}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={createAssignment}>Create Assignment</button>
            </div>
          </div>
        )}

        {assignments.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No assignments yet</p>}

        <div className="space-y-1">
          {assignments.map((assn: AnyRecord) => (
            <div key={assn.id} className="flex items-center justify-between p-2 rounded" style={{ border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {assn.assignmentType || assn.assignment_type}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{assn.title}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{assn.maxPoints || assn.max_points} pts</span>
                {published(assn.isPublished ?? assn.is_published)}
              </div>
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-xs" title="Toggle publish" onClick={() => toggleAssignmentPublish(assn)}>
                  {(assn.isPublished ?? assn.is_published) ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                </button>
                <button className="btn btn-ghost btn-xs" title="Duplicate" onClick={() => duplicateAssignment(assn)}>
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                </button>
                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--fn-error)' }} title="Delete" onClick={() => deleteAssignment(assn.id)}>
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ==================== QUIZZES ==================== */}
      <Section title="Quizzes" icon={AcademicCapIcon} count={quizzes.length} actions={
        <button type="button" className="btn btn-primary btn-xs" onClick={() => setNewQuizTitle(' ')}>
          <PlusCircleIcon className="h-3.5 w-3.5" /> Add
        </button>
      }>
        {newQuizTitle !== '' && (
          <div className="flex flex-wrap gap-2 p-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <select
              className={selectClass}
              value={newQuizModuleId}
              onChange={e => setNewQuizModuleId(e.target.value)}
              style={{ flex: '1 1 180px' }}
            >
              <option value="">Select module</option>
              {modules.map((m: AnyRecord) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            <input className={inputClass} placeholder="Quiz title" value={newQuizTitle.trim()} onChange={e => setNewQuizTitle(e.target.value)} style={{ flex: '1 1 200px' }} />
            <input className={inputClass} placeholder="Description (optional)" value={newQuizDesc} onChange={e => setNewQuizDesc(e.target.value)} style={{ flex: '1 1 200px' }} />
            <button className="btn btn-primary btn-xs" onClick={createQuiz} disabled={!newQuizModuleId}>Create</button>
            <button className="btn btn-ghost btn-xs" onClick={() => { setNewQuizTitle(''); setNewQuizDesc(''); setNewQuizModuleId(''); }}>Cancel</button>
          </div>
        )}

        {quizzes.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No quizzes yet</p>}

        {quizzes.map((quiz: AnyRecord) => (
          <div key={quiz.id} className="flex items-center justify-between p-2 rounded" style={{ border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{quiz.title}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {quiz.timeLimit || quiz.time_limit ? `${quiz.timeLimit || quiz.time_limit} min` : 'No time limit'}
                {' · '}
                {quiz.totalQuestions ?? quiz.total_questions ?? '?'} questions
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button className="btn btn-ghost btn-xs" title="Duplicate quiz" onClick={() => duplicateQuiz(quiz)}>
                <DocumentDuplicateIcon className="h-3.5 w-3.5" />
              </button>
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--fn-error)' }} onClick={() => deleteQuiz(quiz.id)}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* ==================== QUESTION BANK ==================== */}
      <Section title="Question Bank" icon={QuestionMarkCircleIcon} count={questions.length} actions={
        <button type="button" className="btn btn-primary btn-xs" onClick={() => setNewQuestionForm(true)}>
          <PlusCircleIcon className="h-3.5 w-3.5" /> Add
        </button>
      }>
        {newQuestionForm && (
          <div className="p-3 rounded space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="grid gap-2 md:grid-cols-2">
              <select className={selectClass} value={questionForm.questionType} onChange={e => setQuestionForm(f => ({ ...f, questionType: e.target.value }))}>
                {['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER', 'ESSAY', 'CODE', 'NUMERICAL', 'MATCHING', 'ORDERING'].map(t =>
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                )}
              </select>
              <input className={inputClass} type="number" placeholder="Points" value={questionForm.points || ''} onChange={e => setQuestionForm(f => ({ ...f, points: e.target.value }))} />
              <textarea className={inputClass + ' md:col-span-2'} placeholder="Question stem" value={questionForm.stem || ''} onChange={e => setQuestionForm(f => ({ ...f, stem: e.target.value }))} rows={2} />
              {['MULTIPLE_CHOICE', 'MATCHING', 'ORDERING'].includes(questionForm.questionType) && (
                <textarea className={inputClass + ' md:col-span-2'} placeholder="Options (one per line)" value={questionForm.optionsText || ''} onChange={e => setQuestionForm(f => ({ ...f, optionsText: e.target.value }))} rows={4} />
              )}
              <input className={inputClass} placeholder="Correct answer" value={questionForm.correctAnswer || ''} onChange={e => setQuestionForm(f => ({ ...f, correctAnswer: e.target.value }))} />
              <input className={inputClass} placeholder="Explanation (optional)" value={questionForm.explanation || ''} onChange={e => setQuestionForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-xs" onClick={() => { setNewQuestionForm(false); setQuestionForm({ questionType: 'MULTIPLE_CHOICE', stem: '', points: 5 }); }}>Cancel</button>
              <button className="btn btn-primary btn-xs" onClick={createQuestion}>Create Question</button>
            </div>
          </div>
        )}

        {questions.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No questions yet</p>}

        <div className="space-y-1">
          {questions.map((q: AnyRecord) => (
            <div key={q.id} className="flex items-center justify-between p-2 rounded" style={{ border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {(q.questionType || q.question_type || '').replace(/_/g, ' ')}
                </span>
                <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{q.stem}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{q.points} pts</span>
              </div>
              <button className="btn btn-ghost btn-xs shrink-0" style={{ color: 'var(--fn-error)' }} onClick={() => deleteQuestion(q.id)}>
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ==================== MEMBERS ==================== */}
      <Section title="Members" icon={BookOpenIcon} count={members.length}>
        {members.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No members enrolled</p>}

        <div className="space-y-1">
          {members.map((m: AnyRecord) => (
            <div key={m.id || m.userId} className="flex items-center justify-between p-2 rounded" style={{ border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {m.userName || m.user_name || m.userId || m.user_id}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {(m.roleInCourse || m.role_in_course || '').toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
