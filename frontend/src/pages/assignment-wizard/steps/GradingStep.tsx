import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import AIReviewPanel from '../../../features/authoring/components/AIReviewPanel';
import { QuestionDraft, QuestionOption } from '../../../features/authoring/types';
import { aiApi } from '../../../api/ai';
import {
  BlockEditor,
  parseCanonicalDocument,
  serializeCanonicalDocument,
  extractDocumentText,
} from '../../../features/editor-core';
import { Modal } from '../../../components/Modal';
import { RichContentRenderer } from '../../../components/common/RichContentRenderer';
import {
  TrashIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface GradingStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  validationErrors: Record<string, string>;
  courseId: string;
  moduleId?: string;
}

const QUESTION_TYPES: { value: QuestionDraft['type']; label: string; desc: string }[] = [
  { value: 'MCQ', label: 'Multiple Choice', desc: 'Single correct answer from options' },
  { value: 'MULTI_SELECT', label: 'Multi-Select', desc: 'Multiple correct answers' },
  { value: 'NUMERIC', label: 'Numeric', desc: 'Exact numeric answer' },
  { value: 'OPEN_TEXT', label: 'Open Text', desc: 'Free-form text response' },
  { value: 'LATEX', label: 'LaTeX Response', desc: 'Math / LaTeX formatted answer' },
];

const typeLabel = (type: QuestionDraft['type']) =>
  QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;

const makeEmptyDraft = (type: QuestionDraft['type'] = 'MCQ'): QuestionDraft => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  prompt: '',
  explanation: '',
  points: 1,
  format: 'MARKDOWN',
  options:
    type === 'MCQ' || type === 'MULTI_SELECT'
      ? [
          { id: `o-${Date.now()}-1`, text: '', isCorrect: false, format: 'MARKDOWN' },
          { id: `o-${Date.now()}-2`, text: '', isCorrect: false, format: 'MARKDOWN' },
        ]
      : [],
});

/** Get a short plain-text preview of a question prompt */
const promptPreview = (prompt: string, maxLen = 80): string => {
  if (!prompt) return '';
  try {
    const doc = parseCanonicalDocument(prompt);
    const text = extractDocumentText(doc);
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  } catch {
    return prompt.length > maxLen ? prompt.slice(0, maxLen) + '...' : prompt;
  }
};

const GradingStep: React.FC<GradingStepProps> = ({
  formData,
  onChange,
  validationErrors,
  courseId,
  moduleId,
}) => {
  const { t } = useTranslation();
  const isQuiz = formData.assignment_type === 'QUIZ';
  const isCode = formData.assignment_type === 'CODE' || formData.assignment_type === 'VIRTUAL_LAB';
  const [aiLoading, setAiLoading] = useState(false);
  const [quizPreview, setQuizPreview] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);

  const questions = formData.quiz_questions;

  /* ── Quiz helpers ── */
  const totalQuizPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [questions],
  );

  const commitQuestion = useCallback(
    (question: QuestionDraft, index: number | null) => {
      if (index !== null) {
        // Update existing
        const next = [...questions];
        next[index] = question;
        const pts = next.reduce((s, q) => s + (q.points || 0), 0);
        onChange({ quiz_questions: next, max_points: pts });
      } else {
        // Add new
        const next = [...questions, question];
        const pts = next.reduce((s, q) => s + (q.points || 0), 0);
        onChange({ quiz_questions: next, max_points: pts });
      }
    },
    [questions, onChange],
  );

  const removeQuizQuestion = (index: number) => {
    const next = questions.filter((_, i) => i !== index);
    const pts = next.reduce((s, q) => s + (q.points || 0), 0);
    onChange({ quiz_questions: next, max_points: pts });
  };

  const moveQuizQuestion = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ quiz_questions: next });
  };

  /* ── Modal open helpers ── */
  const openAddModal = () => {
    setEditingIndex(null);
    setDraft(makeEmptyDraft('MCQ'));
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setDraft({ ...questions[index], options: questions[index].options.map((o) => ({ ...o })) });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setDraft(null);
    setEditingIndex(null);
  };

  const handleModalSave = () => {
    if (!draft) return;
    commitQuestion(draft, editingIndex);
    closeModal();
  };

  /* ── Draft mutation helpers (inside modal) ── */
  const updateDraft = (partial: Partial<QuestionDraft>) => {
    if (!draft) return;
    const next = { ...draft, ...partial };
    // If type changed, ensure options array is correct
    if (partial.type && partial.type !== draft.type) {
      const needsOptions = partial.type === 'MCQ' || partial.type === 'MULTI_SELECT';
      if (needsOptions && next.options.length === 0) {
        next.options = [
          { id: `o-${Date.now()}-1`, text: '', isCorrect: false, format: 'MARKDOWN' },
          { id: `o-${Date.now()}-2`, text: '', isCorrect: false, format: 'MARKDOWN' },
        ];
      }
    }
    setDraft(next);
  };

  const addDraftOption = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: [
        ...draft.options,
        { id: `o-${Date.now()}`, text: '', isCorrect: false, format: draft.format },
      ],
    });
  };

  const updateDraftOption = (oIndex: number, partial: Partial<QuestionOption>) => {
    if (!draft) return;
    const opts = draft.options.map((o, i) => (i === oIndex ? { ...o, ...partial } : o));
    if (partial.isCorrect && draft.type === 'MCQ') {
      opts.forEach((o, i) => {
        if (i !== oIndex) o.isCorrect = false;
      });
    }
    setDraft({ ...draft, options: opts });
  };

  const removeDraftOption = (oIndex: number) => {
    if (!draft || draft.options.length <= 2) return;
    setDraft({ ...draft, options: draft.options.filter((_, i) => i !== oIndex) });
  };

  const addTestCase = () => {
    onChange({
      test_cases: [...formData.test_cases, { input: '', expected_output: '', points: 1 }],
    });
  };

  const updateTestCase = (index: number, field: string, value: string | number) => {
    const updated = [...formData.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ test_cases: updated });
  };

  const removeTestCase = (index: number) => {
    onChange({ test_cases: formData.test_cases.filter((_, i) => i !== index) });
  };

  const handleGenerateQuiz = async () => {
    if (!courseId || !moduleId) return;
    setAiLoading(true);
    try {
      const response = await aiApi.generateQuiz({
        moduleId,
        topic: formData.title || formData.description,
        language: 'en',
      });
      const quizzes = response.quizzes || [];
      const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
      if (quizzes.length > 0) {
        onChange({
          ai_drafts: [
            ...formData.ai_drafts,
            {
              id: `ai-quiz-${Date.now()}`,
              summary: `AI-generated quiz: ${totalQuestions} questions`,
              content: JSON.stringify(quizzes),
              format: 'MARKDOWN' as const,
              status: 'PENDING_REVIEW' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  const draftPromptIsEmpty = draft
    ? !draft.prompt || (() => {
        try {
          return extractDocumentText(parseCanonicalDocument(draft.prompt)).trim().length === 0;
        } catch {
          return draft.prompt.trim().length === 0;
        }
      })()
    : true;

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.gradingTitle', 'Grading configuration')}
      </h2>

      {/* Max Points — auto-calculated for quiz, manual for others */}
      {!isQuiz && (
        <div>
          <label className="label" htmlFor="wizard-max-points">
            {t('assignment.max_points', 'Max points')} *
          </label>
          <input
            id="wizard-max-points"
            type="number"
            min={1}
            value={formData.max_points}
            onChange={(e) => onChange({ max_points: Number(e.target.value) })}
            className={`input w-32 ${validationErrors.max_points ? 'input-error' : ''}`}
          />
          {validationErrors.max_points && (
            <p className="error-text mt-1">{t(`validation.${validationErrors.max_points}`, validationErrors.max_points)}</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* Quiz Builder                           */}
      {/* ══════════════════════════════════════ */}
      {isQuiz && (
        <div className="space-y-4">
          <div
            className="rounded-lg p-4 space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('quiz.timingAndSecurity', 'Timing, attempts, and secure session')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.quiz_timer_enabled}
                    onChange={(event) => onChange({
                      quiz_timer_enabled: event.target.checked,
                      quiz_time_limit: event.target.checked ? (formData.quiz_time_limit ?? 20) : null,
                    })}
                    className="rounded"
                  />
                  {t('quiz.enableTimer', 'Enable timer')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  className="input w-full"
                  disabled={!formData.quiz_timer_enabled}
                  value={formData.quiz_time_limit ?? ''}
                  onChange={(event) =>
                    onChange({
                      quiz_time_limit: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder={t('quiz.timeLimitMinutes', 'Time limit (minutes)')}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.quiz_attempt_limit_enabled}
                    onChange={(event) => onChange({
                      quiz_attempt_limit_enabled: event.target.checked,
                      quiz_attempts_allowed: event.target.checked ? (formData.quiz_attempts_allowed ?? 1) : null,
                    })}
                    className="rounded"
                  />
                  {t('quiz.limitAttempts', 'Limit attempts')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="input w-full"
                  disabled={!formData.quiz_attempt_limit_enabled}
                  value={formData.quiz_attempts_allowed ?? ''}
                  onChange={(event) =>
                    onChange({
                      quiz_attempts_allowed: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder={t('quiz.attemptsAllowed', 'Attempts allowed')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs mb-1 block">{t('quiz.attemptScorePolicy', 'Attempt score policy')}</label>
                <select
                  className="input w-full"
                  value={formData.quiz_attempt_score_policy}
                  onChange={(event) =>
                    onChange({
                      quiz_attempt_score_policy: event.target.value as WizardFormData['quiz_attempt_score_policy'],
                    })
                  }
                >
                  <option value="HIGHEST">{t('quiz.policyHighest', 'Highest score')}</option>
                  <option value="LATEST">{t('quiz.policyLatest', 'Latest attempt')}</option>
                  <option value="FIRST">{t('quiz.policyFirst', 'First attempt')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.quiz_secure_session_enabled}
                    onChange={(event) =>
                      onChange({
                        quiz_secure_session_enabled: event.target.checked,
                        quiz_secure_require_fullscreen: event.target.checked ? formData.quiz_secure_require_fullscreen : true,
                      })
                    }
                    className="rounded"
                  />
                  {t('quiz.secureSession', 'Enable secure session monitoring')}
                </label>
                <label className="flex items-center gap-2 text-sm ml-6" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.quiz_secure_require_fullscreen}
                    disabled={!formData.quiz_secure_session_enabled}
                    onChange={(event) =>
                      onChange({
                        quiz_secure_require_fullscreen: event.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  {t('quiz.requireFullscreen', 'Require fullscreen before start')}
                </label>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('wizard.quizQuestions', 'Quiz Questions')} ({questions.length})
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('quiz.totalPoints', 'Total Points')}: {totalQuizPoints}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuizPreview((p) => !p)}
                className="btn btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
              >
                {quizPreview ? (
                  <><PencilSquareIcon className="h-4 w-4" />{t('common.edit', 'Edit')}</>
                ) : (
                  <><EyeIcon className="h-4 w-4" />{t('common.preview', 'Preview')}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateQuiz()}
                disabled={aiLoading}
                className="btn btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {aiLoading ? t('ai.generating', 'Generating...') : t('ai.generateQuiz', 'AI Generate')}
              </button>
              {!quizPreview && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="btn btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t('quiz.addQuestion', 'Add Question')}
                </button>
              )}
            </div>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <div
              className="rounded-lg py-12 text-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <p style={{ color: 'var(--text-muted)' }}>
                {t('quiz.noQuestions', 'No questions yet. Add a question to begin building your quiz.')}
              </p>
            </div>
          ) : quizPreview ? (
            /* ── Preview Mode ── */
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-lg p-5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                        {typeLabel(q.type)}
                      </span>
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {q.points} / {totalQuizPoints} {t('quiz.points', 'pts')}
                    </span>
                  </div>
                  {q.prompt && (
                    <div className="mb-3">
                      <BlockEditor
                        value={parseCanonicalDocument(q.prompt)}
                        onChange={() => {}}
                        readOnly
                        mode="lite"
                      />
                    </div>
                  )}
                  {(q.type === 'MCQ' || q.type === 'MULTI_SELECT') && q.options.length > 0 && (
                    <div className="space-y-2 pl-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-default"
                          style={{
                            background: opt.isCorrect ? 'rgba(34,197,94,0.08)' : 'var(--bg-surface)',
                            border: opt.isCorrect ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <input
                            type={q.type === 'MCQ' ? 'radio' : 'checkbox'}
                            checked={opt.isCorrect}
                            disabled
                            className="h-4 w-4"
                          />
                          <span className="flex-1">
                            <RichContentRenderer content={opt.text || undefined} />
                            {!opt.text && <em style={{ color: 'var(--text-faint)' }}>Empty option</em>}
                          </span>
                          {opt.isCorrect && (
                            <span className="ml-auto text-xs" style={{ color: 'var(--fn-success)' }}>&#10003; Correct</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'NUMERIC' && q.correctAnswer && (
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                      {t('quiz.expectedAnswer', 'Expected')}: <strong>{q.correctAnswer}</strong>
                    </p>
                  )}
                  {q.type === 'OPEN_TEXT' && (
                    <div
                      className="mt-2 rounded-md p-3 text-sm"
                      style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-default)', color: 'var(--text-faint)' }}
                    >
                      {t('quiz.openTextPlaceholder', 'Student will type their answer here...')}
                    </div>
                  )}
                  {q.explanation && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('quiz.explanation', 'Explanation')}
                      </summary>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{q.explanation}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ── Compact Edit Mode — question cards ── */
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                        {typeLabel(q.type)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                        <input
                          type="number"
                          min={0}
                          value={q.points}
                          onChange={(e) => {
                            const next = [...questions];
                            next[idx] = { ...next[idx], points: Number(e.target.value) || 0 };
                            const pts = next.reduce((s, qq) => s + (qq.points || 0), 0);
                            onChange({ quiz_questions: next, max_points: pts });
                          }}
                          className="input w-12 text-xs text-center px-1 py-0.5"
                          style={{ height: '22px' }}
                        />
                        / {totalQuizPoints} {t('quiz.points', 'pts')}
                      </span>
                    </div>
                    <p
                      className="text-sm truncate mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                      title={promptPreview(q.prompt, 200)}
                    >
                      {promptPreview(q.prompt) || <em style={{ color: 'var(--text-faint)' }}>No prompt</em>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(idx)}
                      className="p-1.5 rounded hover:bg-white/5"
                      style={{ color: 'var(--text-secondary)' }}
                      title={t('common.edit', 'Edit')}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveQuizQuestion(idx, 'up')}
                      className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuizQuestion(idx, 'down')}
                      className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuizQuestion(idx)}
                      className="p-1.5 rounded hover:bg-white/5"
                      style={{ color: 'var(--fn-error)' }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* Question Add/Edit Modal               */}
      {/* ══════════════════════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingIndex !== null
          ? t('quiz.editQuestion', 'Edit Question')
          : t('quiz.addQuestion', 'Add Question')}
        size="large"
      >
        {draft && (
          <div className="space-y-5">
            {/* Question type selector */}
            <div>
              <label className="label text-xs mb-2">{t('quiz.questionType', 'Question Type')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {QUESTION_TYPES.map((qt) => (
                  <button
                    key={qt.value}
                    type="button"
                    onClick={() => updateDraft({ type: qt.value })}
                    className="rounded-lg p-3 text-left transition-colors"
                    style={{
                      background: draft.type === qt.value ? 'var(--bg-active)' : 'var(--bg-surface)',
                      border: draft.type === qt.value
                        ? '1px solid var(--border-strong)'
                        : '1px solid var(--border-default)',
                    }}
                  >
                    <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
                      {qt.label}
                    </span>
                    <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {qt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question prompt */}
            <div>
              <label className="label text-xs mb-1">{t('quiz.prompt', 'Question')}</label>
              <BlockEditor
                value={parseCanonicalDocument(draft.prompt)}
                onChange={(doc) => updateDraft({ prompt: serializeCanonicalDocument(doc) })}
                mode="lite"
                showSidebarTabs={false}
                mobileToolsDrawer={false}
                placeholder={t('quiz.questionTextPlaceholder', 'Enter your question')}
              />
            </div>

            {/* Options for MCQ / Multi-Select */}
            {(draft.type === 'MCQ' || draft.type === 'MULTI_SELECT') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label text-xs">{t('quiz.answerChoices', 'Answer Choices')}</label>
                  <button
                    type="button"
                    onClick={addDraftOption}
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> {t('quiz.addChoice', 'Add')}
                  </button>
                </div>
                {draft.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-start gap-2">
                    <input
                      type={draft.type === 'MCQ' ? 'radio' : 'checkbox'}
                      checked={opt.isCorrect}
                      onChange={(e) => updateDraftOption(oIdx, { isCorrect: e.target.checked })}
                      className="h-4 w-4 flex-shrink-0 mt-2.5"
                      style={{ accentColor: 'var(--text-primary)' }}
                      title={t('quiz.markCorrect', 'Mark as correct')}
                    />
                    <div className="flex-1 min-w-0">
                      <BlockEditor
                        value={parseCanonicalDocument(opt.text)}
                        onChange={(doc) =>
                          updateDraftOption(oIdx, { text: serializeCanonicalDocument(doc) })
                        }
                        mode="lite"
                        showSidebarTabs={false}
                        mobileToolsDrawer={false}
                        placeholder={`${t('quiz.option', 'Option')} ${oIdx + 1}`}
                      />
                    </div>
                    {draft.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeDraftOption(oIdx)}
                        className="p-1 mt-2 flex-shrink-0"
                        style={{ color: 'var(--fn-error)' }}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Correct answer for numeric */}
            {draft.type === 'NUMERIC' && (
              <div>
                <label className="label text-xs mb-1">{t('quiz.correctAnswer', 'Correct Answer')}</label>
                <input
                  type="text"
                  value={draft.correctAnswer || ''}
                  onChange={(e) => updateDraft({ correctAnswer: e.target.value })}
                  className="input w-48 text-sm"
                  placeholder="42"
                />
              </div>
            )}

            {/* Points */}
            <div>
              <label className="label text-xs mb-1">{t('quiz.points', 'Points')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={draft.points}
                  onChange={(e) => updateDraft({ points: Number(e.target.value) || 0 })}
                  className="input w-24 text-sm"
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  / {editingIndex !== null
                    ? totalQuizPoints
                    : totalQuizPoints + (draft.points || 0)
                  } {t('quiz.points', 'pts')}
                </span>
              </div>
            </div>

            {/* Explanation (collapsible) */}
            <details>
              <summary className="cursor-pointer text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                {t('quiz.explanation', 'Explanation')} ({t('common.optional', 'optional')})
              </summary>
              <textarea
                value={draft.explanation || ''}
                onChange={(e) => updateDraft({ explanation: e.target.value })}
                rows={2}
                className="input w-full text-sm mt-1"
                placeholder={t('quiz.explanationPlaceholder', 'Explain the correct answer')}
              />
            </details>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 pt-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <button type="button" onClick={closeModal} className="btn btn-ghost text-sm px-4 py-2">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={draftPromptIsEmpty}
                className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {editingIndex !== null
                  ? t('common.save', 'Save')
                  : t('quiz.addQuestion', 'Add Question')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Code auto-grading */}
      {isCode && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_grading_enabled}
              onChange={(e) => onChange({ auto_grading_enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('assignment.enable_auto_grading', 'Enable auto-grading')}
            </span>
          </label>

          {formData.auto_grading_enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t('assignment.test_cases', 'Test cases')}
                </h3>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="btn btn-primary px-3 py-1 text-sm"
                >
                  {t('assignment.add_test_case', 'Add test case')}
                </button>
              </div>
              {formData.test_cases.map((tc, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg space-y-2"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Test Case {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--fn-error)' }}
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Input</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="input w-full text-sm"
                        rows={2}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Expected Output</label>
                      <textarea
                        value={tc.expected_output}
                        onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                        className="input w-full text-sm"
                        rows={2}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Points</label>
                      <input
                        type="number"
                        min={0}
                        value={tc.points}
                        onChange={(e) => updateTestCase(index, 'points', Number(e.target.value))}
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Review Panel */}
      {formData.ai_drafts.length > 0 && (
        <AIReviewPanel
          drafts={formData.ai_drafts}
          onApprove={(id) => {
            onChange({
              ai_drafts: formData.ai_drafts.map(d =>
                d.id === id ? { ...d, status: 'APPROVED' } : d
              ),
            });
          }}
          onReject={(id) => {
            onChange({
              ai_drafts: formData.ai_drafts.map(d =>
                d.id === id ? { ...d, status: 'REJECTED' } : d
              ),
            });
          }}
          onApply={(id) => {
            const draft = formData.ai_drafts.find(d => d.id === id);
            if (draft) {
              onChange({ description: draft.content });
            }
          }}
        />
      )}
    </div>
  );
};

export default GradingStep;
