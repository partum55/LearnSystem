import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { aiApi } from '../../api/ai';
import {
  AdminCourse,
  AdminUser,
  createAdminCourse,
  createAdminUser,
  getAdminCourses,
  getAdminUsers,
} from '../../api/admin';
import { adminCourseDeepApi } from '../../api/adminCourseManagement';
import { submissionsApi } from '../../api/assessments';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  operation: string;
  status: 'OK' | 'ERR' | 'RUNNING';
  durationMs?: number;
  timestamp: string;
  response?: unknown;
  error?: string;
}

interface DropdownItem { id: string; label: string }
type SectionStateKey = 'aiOpen' | 'crudOpen' | 'workflowOpen';

interface State {
  // Collapse states
  aiOpen: boolean;
  crudOpen: boolean;
  workflowOpen: boolean;

  // Data for dropdowns
  courses: DropdownItem[];
  users: DropdownItem[];
  modules: DropdownItem[];
  assignments: DropdownItem[];
  quizzes: DropdownItem[];
  questions: DropdownItem[];

  // Selected IDs for cascading
  selectedCourseId: string;
  selectedModuleId: string;
  selectedUserId: string;
  selectedAssignmentId: string;

  // AI forms
  aiPrompt: string;
  aiLanguage: 'uk' | 'en';
  aiModuleCount: number;
  aiAssignmentCount: number;
  aiQuizTopic: string;
  aiQuizQuestionCount: number;

  // CRUD forms
  userEmail: string;
  userPassword: string;
  userDisplayName: string;
  userRole: 'STUDENT' | 'TEACHER' | 'TA';
  courseCode: string;
  courseTitleUk: string;
  courseTitleEn: string;
  courseDescription: string;
  courseVisibility: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  moduleTitle: string;
  moduleDescription: string;
  resourceTitle: string;
  resourceContent: string;
  assignmentTitle: string;
  assignmentDescription: string;
  assignmentType: string;
  assignmentMaxPoints: number;
  quizTitle: string;
  quizDescription: string;
  questionStem: string;
  questionOptions: string;
  questionCorrectAnswer: string;
  questionPoints: number;

  // Log
  log: LogEntry[];
  logCounter: number;

  // Loading
  loadingOp: string | null;
}

type Action =
  | { type: 'TOGGLE_SECTION'; section: SectionStateKey }
  | { type: 'SET_FIELD'; field: keyof State; value: unknown }
  | { type: 'SET_COURSES'; courses: DropdownItem[] }
  | { type: 'SET_USERS'; users: DropdownItem[] }
  | { type: 'SET_MODULES'; modules: DropdownItem[] }
  | { type: 'SET_ASSIGNMENTS'; assignments: DropdownItem[] }
  | { type: 'SET_QUIZZES'; quizzes: DropdownItem[] }
  | { type: 'SET_QUESTIONS'; questions: DropdownItem[] }
  | { type: 'ADD_LOG'; entry: LogEntry }
  | { type: 'UPDATE_LOG'; id: number; updates: Partial<LogEntry> }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_LOADING'; op: string | null };

const rnd = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const initialState: State = {
  aiOpen: true,
  crudOpen: false,
  workflowOpen: false,
  courses: [],
  users: [],
  modules: [],
  assignments: [],
  quizzes: [],
  questions: [],
  selectedCourseId: '',
  selectedModuleId: '',
  selectedUserId: '',
  selectedAssignmentId: '',
  aiPrompt: 'Introduction to Computer Science',
  aiLanguage: 'en',
  aiModuleCount: 3,
  aiAssignmentCount: 2,
  aiQuizTopic: 'Data Structures',
  aiQuizQuestionCount: 5,
  userEmail: `testuser-${rnd()}@test.local`,
  userPassword: 'Test1234!',
  userDisplayName: 'Test User',
  userRole: 'STUDENT',
  courseCode: `TST-${rnd()}`,
  courseTitleUk: 'Тестовий курс',
  courseTitleEn: 'Test Course',
  courseDescription: 'Auto-generated test course',
  courseVisibility: 'PRIVATE',
  moduleTitle: 'Test Module',
  moduleDescription: 'Auto-generated test module',
  resourceTitle: 'Test Resource',
  resourceContent: 'This is test resource content created via Test Lab.',
  assignmentTitle: 'Test Assignment',
  assignmentDescription: 'Auto-generated test assignment',
  assignmentType: 'TEXT',
  assignmentMaxPoints: 100,
  quizTitle: 'Test Quiz',
  quizDescription: 'Auto-generated test quiz',
  questionStem: 'What is 2 + 2?',
  questionOptions: '{"A":"3","B":"4","C":"5","D":"6"}',
  questionCorrectAnswer: '{"answer":"B"}',
  questionPoints: 5,
  log: [],
  logCounter: 0,
  loadingOp: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_SECTION':
      return { ...state, [action.section]: !state[action.section] };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_COURSES':
      return { ...state, courses: action.courses };
    case 'SET_USERS':
      return { ...state, users: action.users };
    case 'SET_MODULES':
      return { ...state, modules: action.modules };
    case 'SET_ASSIGNMENTS':
      return { ...state, assignments: action.assignments };
    case 'SET_QUIZZES':
      return { ...state, quizzes: action.quizzes };
    case 'SET_QUESTIONS':
      return { ...state, questions: action.questions };
    case 'ADD_LOG':
      return { ...state, log: [action.entry, ...state.log], logCounter: state.logCounter + 1 };
    case 'UPDATE_LOG':
      return {
        ...state,
        log: state.log.map(e => e.id === action.id ? { ...e, ...action.updates } : e),
      };
    case 'CLEAR_LOG':
      return { ...state, log: [] };
    case 'SET_LOADING':
      return { ...state, loadingOp: action.op };
    default:
      return state;
  }
}

interface SectionHeaderProps {
  title: string;
  stateKey: SectionStateKey;
  isOpen: boolean;
  onToggle: (section: SectionStateKey) => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, stateKey, isOpen, onToggle }) => (
  <button
    type="button"
    className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
    onClick={() => onToggle(stateKey)}
  >
    {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
    {title}
  </button>
);

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, type = 'text', className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <input
      className="input text-sm w-full"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </label>
);

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

const Select: React.FC<SelectProps> = ({ label, value, onChange, options, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <select
      className="input text-sm w-full"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">— select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

interface BtnProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  isLoading: boolean;
  loadingOp: string | null;
}

const Btn: React.FC<BtnProps> = ({ label, onClick, disabled, variant = 'primary', isLoading, loadingOp }) => (
  <button
    type="button"
    className={`btn btn-${variant} btn-sm`}
    disabled={isLoading || disabled}
    onClick={onClick}
  >
    {loadingOp === label ? 'Running...' : label}
  </button>
);

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const AdminTestLabTab: React.FC<Props> = ({ onFeedback }) => {
  const [s, dispatch] = useReducer(reducer, initialState);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof State>(field: K, value: State[K]) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const executeWithLog = useCallback(async <T,>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T | null> => {
    const id = Date.now() + Math.random();
    const entry: LogEntry = {
      id,
      operation,
      status: 'RUNNING',
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOG', entry });
    dispatch({ type: 'SET_LOADING', op: operation });
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      dispatch({
        type: 'UPDATE_LOG',
        id,
        updates: { status: 'OK', durationMs, response: result },
      });
      dispatch({ type: 'SET_LOADING', op: null });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const errorMsg = err instanceof Error ? err.message : String(err);
      dispatch({
        type: 'UPDATE_LOG',
        id,
        updates: { status: 'ERR', durationMs, error: errorMsg },
      });
      dispatch({ type: 'SET_LOADING', op: null });
      return null;
    }
  }, []);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadCourses = useCallback(async () => {
    try {
      const res = await getAdminCourses({ page: 0, size: 100 });
      dispatch({
        type: 'SET_COURSES',
        courses: res.content.map((c: AdminCourse) => ({
          id: c.id,
          label: `${c.code} — ${c.titleEn || c.titleUk}`,
        })),
      });
    } catch { /* ignore */ }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getAdminUsers({ page: 0, size: 100 });
      dispatch({
        type: 'SET_USERS',
        users: res.content.map((u: AdminUser) => ({
          id: u.id,
          label: `${u.email} (${u.role})`,
        })),
      });
    } catch { /* ignore */ }
  }, []);

  const loadModules = useCallback(async (courseId: string) => {
    if (!courseId) { dispatch({ type: 'SET_MODULES', modules: [] }); return; }
    try {
      const mods = await adminCourseDeepApi.getModules(courseId);
      dispatch({
        type: 'SET_MODULES',
        modules: mods.map((m) => ({ id: m.id, label: m.title })),
      });
    } catch { dispatch({ type: 'SET_MODULES', modules: [] }); }
  }, []);

  const loadAssignments = useCallback(async (courseId: string) => {
    if (!courseId) { dispatch({ type: 'SET_ASSIGNMENTS', assignments: [] }); return; }
    try {
      const items = await adminCourseDeepApi.getAssignments(courseId) as { id: string; title: string }[];
      dispatch({
        type: 'SET_ASSIGNMENTS',
        assignments: items.map((a) => ({ id: a.id ?? String(a), label: a.title ?? String(a) })),
      });
    } catch { dispatch({ type: 'SET_ASSIGNMENTS', assignments: [] }); }
  }, []);

  const loadQuizzes = useCallback(async (courseId: string) => {
    if (!courseId) { dispatch({ type: 'SET_QUIZZES', quizzes: [] }); return; }
    try {
      const items = await adminCourseDeepApi.getQuizzes(courseId) as { id: string; title: string }[];
      dispatch({
        type: 'SET_QUIZZES',
        quizzes: items.map((q) => ({ id: q.id ?? String(q), label: q.title ?? String(q) })),
      });
    } catch { dispatch({ type: 'SET_QUIZZES', quizzes: [] }); }
  }, []);

  const loadQuestions = useCallback(async (courseId: string) => {
    if (!courseId) { dispatch({ type: 'SET_QUESTIONS', questions: [] }); return; }
    try {
      const items = await adminCourseDeepApi.getQuestions(courseId) as { id: string; stem: string }[];
      dispatch({
        type: 'SET_QUESTIONS',
        questions: items.map((q) => ({ id: q.id ?? String(q), label: (q.stem ?? String(q)).slice(0, 60) })),
      });
    } catch { dispatch({ type: 'SET_QUESTIONS', questions: [] }); }
  }, []);

  // On mount: load courses and users
  useEffect(() => { void loadCourses(); void loadUsers(); }, [loadCourses, loadUsers]);

  // Cascade: when course changes, load modules/assignments/quizzes/questions
  useEffect(() => {
    if (s.selectedCourseId) {
      void loadModules(s.selectedCourseId);
      void loadAssignments(s.selectedCourseId);
      void loadQuizzes(s.selectedCourseId);
      void loadQuestions(s.selectedCourseId);
    }
  }, [s.selectedCourseId, loadModules, loadAssignments, loadQuizzes, loadQuestions]);

  // ── AI Handlers ──────────────────────────────────────────────────────────

  const handleAiHealth = async () => {
    const result = await executeWithLog('AI Health Check', () => aiApi.health());
    if (result) onFeedback('success', `AI Service: ${result.status}`);
  };

  const handleGenerateCourse = async () => {
    const result = await executeWithLog('Generate Course', () =>
      aiApi.generateCourse({ prompt: s.aiPrompt, language: s.aiLanguage }),
    );
    if (result) onFeedback('success', 'Course generated (preview only)');
  };

  const handleGenerateModules = async () => {
    if (!s.selectedCourseId) { onFeedback('error', 'Select a course first'); return; }
    const result = await executeWithLog('Generate Modules', () =>
      aiApi.generateModules({
        courseId: s.selectedCourseId,
        prompt: s.aiPrompt,
        language: s.aiLanguage,
        moduleCount: s.aiModuleCount,
      }),
    );
    if (result) {
      onFeedback('success', `Generated ${result.modules?.length ?? 0} modules`);
      void loadModules(s.selectedCourseId);
    }
  };

  const handleGenerateAssignments = async () => {
    if (!s.selectedModuleId) { onFeedback('error', 'Select a module first'); return; }
    const result = await executeWithLog('Generate Assignments', () =>
      aiApi.generateAssignments({
        moduleId: s.selectedModuleId,
        moduleTopic: s.aiPrompt,
        language: s.aiLanguage,
        assignmentCount: s.aiAssignmentCount,
      }),
    );
    if (result) {
      onFeedback('success', `Generated ${result.assignments?.length ?? 0} assignments`);
      if (s.selectedCourseId) void loadAssignments(s.selectedCourseId);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!s.selectedModuleId) { onFeedback('error', 'Select a module first'); return; }
    const result = await executeWithLog('Generate Quiz', () =>
      aiApi.generateQuiz({
        moduleId: s.selectedModuleId,
        topic: s.aiQuizTopic,
        language: s.aiLanguage,
        questionCount: s.aiQuizQuestionCount,
      }),
    );
    if (result) {
      onFeedback('success', `Generated ${result.quizzes?.length ?? 0} quizzes`);
      if (s.selectedCourseId) {
        void loadQuizzes(s.selectedCourseId);
      }
    }
  };

  // ── CRUD Handlers ────────────────────────────────────────────────────────

  const handleCreateUser = async () => {
    const result = await executeWithLog('Create User', () =>
      createAdminUser({
        email: s.userEmail,
        password: s.userPassword,
        displayName: s.userDisplayName,
        role: s.userRole,
      }),
    );
    if (result) {
      onFeedback('success', `User created: ${result.email}`);
      set('userEmail', `testuser-${rnd()}@test.local`);
      void loadUsers();
    }
  };

  const handleCreateCourse = async () => {
    const result = await executeWithLog('Create Course', () =>
      createAdminCourse({
        code: s.courseCode,
        titleUk: s.courseTitleUk,
        titleEn: s.courseTitleEn,
        descriptionEn: s.courseDescription,
        visibility: s.courseVisibility,
        isPublished: true,
      }),
    );
    if (result) {
      onFeedback('success', `Course created: ${result.code}`);
      set('courseCode', `TST-${rnd()}`);
      void loadCourses();
    }
  };

  const handleCreateModule = async () => {
    if (!s.selectedCourseId) { onFeedback('error', 'Select a course first'); return; }
    const result = await executeWithLog('Create Module', () =>
      adminCourseDeepApi.createModule(s.selectedCourseId, {
        title: s.moduleTitle,
        description: s.moduleDescription,
        isPublished: true,
      }),
    );
    if (result) {
      onFeedback('success', 'Module created');
      void loadModules(s.selectedCourseId);
    }
  };

  const handleCreateResource = async () => {
    if (!s.selectedCourseId || !s.selectedModuleId) { onFeedback('error', 'Select course and module'); return; }
    const result = await executeWithLog('Create Resource', () =>
      adminCourseDeepApi.createResource(s.selectedCourseId, s.selectedModuleId, {
        title: s.resourceTitle,
        resourceType: 'TEXT',
        textContent: s.resourceContent,
      }),
    );
    if (result) onFeedback('success', 'Resource created');
  };

  const handleCreateAssignment = async () => {
    if (!s.selectedCourseId) { onFeedback('error', 'Select a course first'); return; }
    if (s.assignmentType === 'QUIZ' && !s.selectedModuleId) {
      onFeedback('error', 'Select a module for QUIZ assignments');
      return;
    }
    const result = await executeWithLog('Create Assignment', () =>
      adminCourseDeepApi.createAssignment({
        courseId: s.selectedCourseId,
        moduleId: s.selectedModuleId || undefined,
        assignmentType: s.assignmentType,
        title: s.assignmentTitle,
        description: s.assignmentDescription,
        maxPoints: s.assignmentMaxPoints,
        isPublished: true,
      }),
    );
    if (result) {
      onFeedback('success', 'Assignment created');
      void loadAssignments(s.selectedCourseId);
    }
  };

  const handleCreateQuiz = async () => {
    if (!s.selectedCourseId || !s.selectedModuleId) { onFeedback('error', 'Select course and module first'); return; }
    const result = await executeWithLog('Create Quiz', () =>
      adminCourseDeepApi.createQuiz(s.selectedCourseId, s.selectedModuleId, s.quizTitle, s.quizDescription),
    );
    if (result) {
      onFeedback('success', 'Quiz created');
      void loadQuizzes(s.selectedCourseId);
    }
  };

  const handleCreateQuestion = async () => {
    if (!s.selectedCourseId) { onFeedback('error', 'Select a course first'); return; }
    let options: unknown;
    let correctAnswer: unknown;
    try { options = JSON.parse(s.questionOptions); } catch { options = s.questionOptions; }
    try { correctAnswer = JSON.parse(s.questionCorrectAnswer); } catch { correctAnswer = s.questionCorrectAnswer; }
    const result = await executeWithLog('Create Question', () =>
      adminCourseDeepApi.createQuestion({
        courseId: s.selectedCourseId,
        questionType: 'MULTIPLE_CHOICE',
        stem: s.questionStem,
        options,
        correctAnswer,
        points: s.questionPoints,
      }),
    );
    if (result) {
      onFeedback('success', 'Question created');
      void loadQuestions(s.selectedCourseId);
    }
  };

  // ── Workflow Handlers ────────────────────────────────────────────────────

  const handleFullCourseSetup = async () => {
    const code = `FULL-${rnd()}`;

    // 1. Create course
    const course = await executeWithLog('Workflow: Create Course', () =>
      createAdminCourse({
        code,
        titleUk: 'Повний тестовий курс',
        titleEn: 'Full Test Course',
        descriptionEn: 'End-to-end test course',
        visibility: 'PRIVATE',
        isPublished: true,
      }),
    );
    if (!course) return;
    const courseId = course.id;

    // 2. Create module
    const mod = await executeWithLog('Workflow: Create Module', () =>
      adminCourseDeepApi.createModule(courseId, {
        title: 'Test Module 1',
        description: 'First test module',
        isPublished: true,
      }),
    );
    if (!mod) return;
    const moduleId = String((mod as { id: string }).id);

    // 3. Create resource
    await executeWithLog('Workflow: Create Resource', () =>
      adminCourseDeepApi.createResource(courseId, moduleId, {
        title: 'Test Resource',
        resourceType: 'TEXT',
        textContent: 'This is a test resource.',
      }),
    );

    // 4. Create assignment
    const assignment = await executeWithLog('Workflow: Create Assignment', () =>
      adminCourseDeepApi.createAssignment({
        courseId,
        moduleId,
        assignmentType: 'TEXT',
        title: 'Test Assignment',
        description: 'Auto-created test assignment',
        maxPoints: 100,
        isPublished: true,
      }),
    );

    // 5. Create quiz
    const quiz = await executeWithLog('Workflow: Create Quiz', () =>
      adminCourseDeepApi.createQuiz(courseId, moduleId, 'Test Quiz', 'Auto-created test quiz'),
    );

    // 6. Create question
    const question = await executeWithLog('Workflow: Create Question', () =>
      adminCourseDeepApi.createQuestion({
        courseId,
        questionType: 'MULTIPLE_CHOICE',
        stem: 'What is 1+1?',
        options: { A: '1', B: '2', C: '3', D: '4' },
        correctAnswer: { answer: 'B' },
        points: 5,
      }),
    );

    // 7. Link question to quiz
    if (quiz && question) {
      const quizId = String((quiz as { id: string }).id);
      const questionId = String((question as { id: string }).id);
      await executeWithLog('Workflow: Link Question to Quiz', () =>
        adminCourseDeepApi.addQuestionToQuiz(quizId, questionId),
      );
    }

    onFeedback('success', `Full course setup complete: ${code}`);
    void loadCourses();

    // Store for assignment reference
    if (assignment) {
      const assignmentId = String((assignment as { id: string }).id);
      set('selectedCourseId', courseId);
      set('selectedAssignmentId', assignmentId);
    }
  };

  const handleEnrollStudent = async () => {
    if (!s.selectedCourseId || !s.selectedUserId) {
      onFeedback('error', 'Select course and user');
      return;
    }
    const result = await executeWithLog('Enroll User', () =>
      adminCourseDeepApi.enrollUser(s.selectedCourseId, s.selectedUserId),
    );
    if (result) onFeedback('success', 'User enrolled');
  };

  const handleSubmitAndGrade = async () => {
    if (!s.selectedAssignmentId) { onFeedback('error', 'Select an assignment'); return; }

    const sub = await executeWithLog('Submit Assignment', () =>
      submissionsApi.submit(s.selectedAssignmentId, 'Test submission content from Test Lab'),
    );
    if (!sub) return;

    const submissionId = String((sub as { data?: { id?: string } }).data?.id ?? (sub as { id?: string }).id ?? '');
    if (submissionId) {
      await executeWithLog('Grade Submission', () =>
        submissionsApi.grade(submissionId, 95, 'Auto-graded via Test Lab'),
      );
      onFeedback('success', 'Submitted & graded');
    }
  };

  // ── Rendering helpers ────────────────────────────────────────────────────

  const isLoading = s.loadingOp !== null;
  const toggleSection = useCallback((section: SectionStateKey) => {
    dispatch({ type: 'TOGGLE_SECTION', section });
  }, []);
  const buttonProps = { isLoading, loadingOp: s.loadingOp };

  const courseOptions = s.courses.map(c => ({ value: c.id, label: c.label }));
  const userOptions = s.users.map(u => ({ value: u.id, label: u.label }));
  const moduleOptions = s.modules.map(m => ({ value: m.id, label: m.label }));
  const assignmentOptions = s.assignments.map(a => ({ value: a.id, label: a.label }));

  return (
    <div className="space-y-3">
      {/* Course selector (global) */}
      <div className="flex items-center gap-3">
        <Select
          label="Active Course"
          value={s.selectedCourseId}
          onChange={v => set('selectedCourseId', v)}
          options={courseOptions}
          className="flex-1"
        />
        <Select
          label="Active Module"
          value={s.selectedModuleId}
          onChange={v => set('selectedModuleId', v)}
          options={moduleOptions}
          className="flex-1"
        />
      </div>

      {/* ── Section 1: AI Testing ──────────────────────────────────────── */}
      <SectionHeader title="AI Testing" stateKey="aiOpen" isOpen={s.aiOpen} onToggle={toggleSection} />
      {s.aiOpen && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex flex-wrap gap-2">
            <Btn label="AI Health Check" onClick={handleAiHealth} variant="secondary" {...buttonProps} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="Prompt" value={s.aiPrompt} onChange={v => set('aiPrompt', v)} className="sm:col-span-2" />
            <Select
              label="Language"
              value={s.aiLanguage}
              onChange={v => set('aiLanguage', v as 'uk' | 'en')}
              options={[{ value: 'en', label: 'English' }, { value: 'uk', label: 'Ukrainian' }]}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <Btn label="Generate Course" onClick={handleGenerateCourse} {...buttonProps} />
            <div className="flex items-end gap-1">
              <Field label="Modules #" value={s.aiModuleCount} onChange={v => set('aiModuleCount', Number(v) || 1)} type="number" />
              <Btn label="Generate Modules" onClick={handleGenerateModules} {...buttonProps} />
            </div>
            <div className="flex items-end gap-1">
              <Field label="Assignments #" value={s.aiAssignmentCount} onChange={v => set('aiAssignmentCount', Number(v) || 1)} type="number" />
              <Btn label="Generate Assignments" onClick={handleGenerateAssignments} {...buttonProps} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <Field label="Quiz Topic" value={s.aiQuizTopic} onChange={v => set('aiQuizTopic', v)} />
            <Field label="Questions #" value={s.aiQuizQuestionCount} onChange={v => set('aiQuizQuestionCount', Number(v) || 1)} type="number" />
            <Btn label="Generate Quiz" onClick={handleGenerateQuiz} {...buttonProps} />
          </div>
        </div>
      )}

      {/* ── Section 2: Quick CRUD ──────────────────────────────────────── */}
      <SectionHeader title="Quick CRUD" stateKey="crudOpen" isOpen={s.crudOpen} onToggle={toggleSection} />
      {s.crudOpen && (
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {/* Users */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create User</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Email" value={s.userEmail} onChange={v => set('userEmail', v)} />
              <Field label="Password" value={s.userPassword} onChange={v => set('userPassword', v)} />
              <Field label="Display Name" value={s.userDisplayName} onChange={v => set('userDisplayName', v)} />
              <Select
                label="Role"
                value={s.userRole}
                onChange={v => set('userRole', v as 'STUDENT' | 'TEACHER' | 'TA')}
                options={[
                  { value: 'STUDENT', label: 'Student' },
                  { value: 'TEACHER', label: 'Teacher' },
                  { value: 'TA', label: 'TA' },
                ]}
              />
            </div>
            <div className="mt-2"><Btn label="Create User" onClick={handleCreateUser} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Courses */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Course</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Code" value={s.courseCode} onChange={v => set('courseCode', v)} />
              <Field label="Title (UK)" value={s.courseTitleUk} onChange={v => set('courseTitleUk', v)} />
              <Field label="Title (EN)" value={s.courseTitleEn} onChange={v => set('courseTitleEn', v)} />
              <Select
                label="Visibility"
                value={s.courseVisibility}
                onChange={v => set('courseVisibility', v as 'PUBLIC' | 'PRIVATE' | 'DRAFT')}
                options={[
                  { value: 'PRIVATE', label: 'Private' },
                  { value: 'PUBLIC', label: 'Public' },
                  { value: 'DRAFT', label: 'Draft' },
                ]}
              />
            </div>
            <div className="mt-2"><Btn label="Create Course" onClick={handleCreateCourse} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Modules */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Module</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Title" value={s.moduleTitle} onChange={v => set('moduleTitle', v)} />
              <Field label="Description" value={s.moduleDescription} onChange={v => set('moduleDescription', v)} />
            </div>
            <div className="mt-2"><Btn label="Create Module" onClick={handleCreateModule} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Resource</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Title" value={s.resourceTitle} onChange={v => set('resourceTitle', v)} />
              <Field label="Text Content" value={s.resourceContent} onChange={v => set('resourceContent', v)} />
            </div>
            <div className="mt-2"><Btn label="Create Resource" onClick={handleCreateResource} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Assignments */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Assignment</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Title" value={s.assignmentTitle} onChange={v => set('assignmentTitle', v)} />
              <Field label="Description" value={s.assignmentDescription} onChange={v => set('assignmentDescription', v)} />
              <Select
                label="Type"
                value={s.assignmentType}
                onChange={v => set('assignmentType', v)}
                options={[
                  { value: 'TEXT', label: 'Text' },
                  { value: 'FILE_UPLOAD', label: 'File Upload' },
                  { value: 'CODE', label: 'Code' },
                  { value: 'URL', label: 'URL' },
                  { value: 'QUIZ', label: 'Quiz' },
                ]}
              />
              <Field label="Max Points" value={s.assignmentMaxPoints} onChange={v => set('assignmentMaxPoints', Number(v) || 100)} type="number" />
            </div>
            <div className="mt-2"><Btn label="Create Assignment" onClick={handleCreateAssignment} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Quizzes */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Quiz</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Title" value={s.quizTitle} onChange={v => set('quizTitle', v)} />
              <Field label="Description" value={s.quizDescription} onChange={v => set('quizDescription', v)} />
            </div>
            <div className="mt-2"><Btn label="Create Quiz" onClick={handleCreateQuiz} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Questions */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Create Question</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Stem" value={s.questionStem} onChange={v => set('questionStem', v)} />
              <Field label="Options (JSON)" value={s.questionOptions} onChange={v => set('questionOptions', v)} />
              <Field label="Correct Answer (JSON)" value={s.questionCorrectAnswer} onChange={v => set('questionCorrectAnswer', v)} />
              <Field label="Points" value={s.questionPoints} onChange={v => set('questionPoints', Number(v) || 1)} type="number" />
            </div>
            <div className="mt-2"><Btn label="Create Question" onClick={handleCreateQuestion} {...buttonProps} /></div>
          </div>
        </div>
      )}

      {/* ── Section 3: Workflow Testing ────────────────────────────────── */}
      <SectionHeader title="Workflow Testing" stateKey="workflowOpen" isOpen={s.workflowOpen} onToggle={toggleSection} />
      {s.workflowOpen && (
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {/* Full Course Setup */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Full Course Setup</h4>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Creates: course &rarr; module &rarr; resource &rarr; assignment &rarr; quiz &rarr; question &rarr; links question to quiz
            </p>
            <Btn label="Run Full Setup" onClick={handleFullCourseSetup} {...buttonProps} />
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Enrollment */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Student Enrollment</h4>
            <div className="grid grid-cols-2 gap-2">
              <Select label="Course" value={s.selectedCourseId} onChange={v => set('selectedCourseId', v)} options={courseOptions} />
              <Select label="User" value={s.selectedUserId} onChange={v => set('selectedUserId', v)} options={userOptions} />
            </div>
            <div className="mt-2"><Btn label="Enroll Student" onClick={handleEnrollStudent} {...buttonProps} /></div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Submission & Grading */}
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Submission & Grading</h4>
            <Select
              label="Assignment"
              value={s.selectedAssignmentId}
              onChange={v => set('selectedAssignmentId', v)}
              options={assignmentOptions}
              className="mb-2"
            />
            <Btn label="Submit & Grade" onClick={handleSubmitAndGrade} {...buttonProps} />
          </div>
        </div>
      )}

      {/* ── Section 4: Results Log (always visible) ────────────────────── */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Results Log ({s.log.length} entries)
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => dispatch({ type: 'CLEAR_LOG' })}
            disabled={s.log.length === 0}
          >
            <TrashIcon className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
        <div
          ref={logRef}
          className="overflow-auto p-2 space-y-1"
          style={{ background: 'var(--bg-base)', maxHeight: 360, minHeight: 80 }}
        >
          {s.log.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No operations logged yet. Use the sections above to run tests.
            </p>
          )}
          {s.log.map(entry => (
            <details key={entry.id} className="text-xs">
              <summary
                className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="inline-block w-8 text-center text-[10px] font-bold rounded px-1 py-0.5"
                  style={{
                    background:
                      entry.status === 'OK' ? 'rgba(34,197,94,0.15)' :
                      entry.status === 'ERR' ? 'rgba(239,68,68,0.15)' :
                      'rgba(245,158,11,0.15)',
                    color:
                      entry.status === 'OK' ? 'var(--fn-success)' :
                      entry.status === 'ERR' ? 'var(--fn-error)' :
                      'var(--fn-warning)',
                  }}
                >
                  {entry.status}
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.operation}</span>
                {entry.durationMs != null && (
                  <span style={{ color: 'var(--text-muted)' }}>{entry.durationMs}ms</span>
                )}
                <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </summary>
              <pre
                className="text-[10px] mt-1 mb-2 mx-2 p-2 rounded overflow-auto max-h-48 font-mono"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                {entry.error
                  ? `Error: ${entry.error}`
                  : JSON.stringify(entry.response, null, 2)?.slice(0, 3000) ?? 'No data'}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};
