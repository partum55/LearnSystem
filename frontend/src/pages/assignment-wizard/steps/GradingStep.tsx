import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import RubricEditor from '../../../features/authoring/components/RubricEditor';
import AIReviewPanel from '../../../features/authoring/components/AIReviewPanel';
import { QuestionDraft, QuestionOption } from '../../../features/authoring/types';
import { aiApi } from '../../../api/ai';
import {
  BlockEditor,
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../../../features/editor-core';
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

  const questions = formData.quiz_questions;

  /* ── Quiz helpers ── */
  const totalQuizPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [questions],
  );

  const addQuizQuestion = (type: QuestionDraft['type'] = 'MCQ') => {
    const newQ: QuestionDraft = {
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
    };
    onChange({ quiz_questions: [...questions, newQ], max_points: totalQuizPoints + newQ.points });
  };

  const updateQuizQuestion = (index: number, updated: QuestionDraft) => {
    const next = [...questions];
    next[index] = updated;
    const pts = next.reduce((s, q) => s + (q.points || 0), 0);
    onChange({ quiz_questions: next, max_points: pts });
  };

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

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    const updated: QuestionDraft = {
      ...q,
      options: [
        ...q.options,
        { id: `o-${Date.now()}`, text: '', isCorrect: false, format: q.format },
      ],
    };
    updateQuizQuestion(qIndex, updated);
  };

  const updateOption = (qIndex: number, oIndex: number, partial: Partial<QuestionOption>) => {
    const q = questions[qIndex];
    const opts = q.options.map((o, i) => (i === oIndex ? { ...o, ...partial } : o));
    // For MCQ single-select, only one can be correct
    if (partial.isCorrect && q.type === 'MCQ') {
      opts.forEach((o, i) => { if (i !== oIndex) o.isCorrect = false; });
    }
    updateQuizQuestion(qIndex, { ...q, options: opts });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) return;
    updateQuizQuestion(qIndex, {
      ...q,
      options: q.options.filter((_, i) => i !== oIndex),
    });
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

  const handleGenerateRubric = async () => {
    setAiLoading(true);
    try {
      // editContent returns a string directly
      const content = await aiApi.editContent({
        entity_type: 'ASSIGNMENT',
        entity_id: '',
        current_content: JSON.stringify(formData.rubric_draft),
        prompt: `Generate a rubric for an assignment titled "${formData.title}" with description: ${formData.description}. Max points: ${formData.max_points}`,
        language: 'en',
      });
      if (typeof content === 'string' && content.trim()) {
        onChange({
          ai_drafts: [
            ...formData.ai_drafts,
            {
              id: `ai-${Date.now()}`,
              summary: 'AI-generated rubric',
              content,
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

  const handleGenerateQuiz = async () => {
    if (!courseId || !moduleId) return;
    setAiLoading(true);
    try {
      // generateQuiz returns { moduleId, quizzes: GeneratedQuiz[] }
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
      {/* Quiz Builder — dedicated question creation flow */}
      {/* ══════════════════════════════════════ */}
      {isQuiz && (
        <div className="space-y-4">
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
                <select
                  onChange={(e) => {
                    if (e.target.value) addQuizQuestion(e.target.value as QuestionDraft['type']);
                    e.target.value = '';
                  }}
                  className="input text-sm py-1.5"
                  defaultValue=""
                >
                  <option value="" disabled>
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    {t('quiz.addQuestion', 'Add Question')}...
                  </option>
                  <option value="MCQ">{t('quiz.types.mcq', 'Multiple Choice')}</option>
                  <option value="MULTI_SELECT">{t('quiz.types.multiSelect', 'Multi-Select')}</option>
                  <option value="NUMERIC">{t('quiz.types.numeric', 'Numeric')}</option>
                  <option value="OPEN_TEXT">{t('quiz.types.openText', 'Open Text')}</option>
                  <option value="LATEX">{t('quiz.types.latex', 'LaTeX Response')}</option>
                </select>
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
                        {q.type === 'MCQ' ? 'Multiple Choice' :
                         q.type === 'MULTI_SELECT' ? 'Multi-Select' :
                         q.type === 'NUMERIC' ? 'Numeric' :
                         q.type === 'OPEN_TEXT' ? 'Open Text' : 'LaTeX'}
                      </span>
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {q.points} {t('quiz.points', 'pts')}
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
                          {opt.text || <em style={{ color: 'var(--text-faint)' }}>Empty option</em>}
                          {opt.isCorrect && (
                            <span className="ml-auto text-xs" style={{ color: 'var(--fn-success)' }}>✓ Correct</span>
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
            /* ── Edit Mode ── */
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-lg p-4"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}
                      >
                        {idx + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuizQuestion(idx, { ...q, type: e.target.value as QuestionDraft['type'] })
                        }
                        className="input text-sm py-1"
                      >
                        <option value="MCQ">Multiple Choice</option>
                        <option value="MULTI_SELECT">Multi-Select</option>
                        <option value="NUMERIC">Numeric</option>
                        <option value="OPEN_TEXT">Open Text</option>
                        <option value="LATEX">LaTeX Response</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={q.points}
                        onChange={(e) =>
                          updateQuizQuestion(idx, { ...q, points: Number(e.target.value) || 0 })
                        }
                        className="input w-16 text-sm py-1"
                        title={t('quiz.points', 'Points')}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {t('quiz.points', 'pts')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveQuizQuestion(idx, 'up')}
                        className="p-1 disabled:opacity-30"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => moveQuizQuestion(idx, 'down')}
                        className="p-1 disabled:opacity-30"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuizQuestion(idx)}
                        className="p-1"
                        style={{ color: 'var(--fn-error)' }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question prompt — RTE */}
                  <div className="mb-3">
                    <label className="label text-xs mb-1">{t('quiz.prompt', 'Question')}</label>
                    <BlockEditor
                      value={parseCanonicalDocument(q.prompt)}
                      onChange={(doc) =>
                        updateQuizQuestion(idx, { ...q, prompt: serializeCanonicalDocument(doc) })
                      }
                      mode="lite"
                      showSidebarTabs={false}
                      mobileToolsDrawer={false}
                      placeholder={t('quiz.questionTextPlaceholder', 'Enter your question')}
                    />
                  </div>

                  {/* Options for MCQ / Multi-Select */}
                  {(q.type === 'MCQ' || q.type === 'MULTI_SELECT') && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <label className="label text-xs">{t('quiz.answerChoices', 'Answer Choices')}</label>
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <PlusIcon className="h-3.5 w-3.5" /> {t('quiz.addChoice', 'Add')}
                        </button>
                      </div>
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type={q.type === 'MCQ' ? 'radio' : 'checkbox'}
                            checked={opt.isCorrect}
                            onChange={(e) => updateOption(idx, oIdx, { isCorrect: e.target.checked })}
                            className="h-4 w-4 flex-shrink-0"
                            style={{ accentColor: 'var(--text-primary)' }}
                            title={t('quiz.markCorrect', 'Mark as correct')}
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOption(idx, oIdx, { text: e.target.value })}
                            className="input flex-1 text-sm py-1.5"
                            placeholder={`${t('quiz.option', 'Option')} ${oIdx + 1}`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx, oIdx)}
                              className="p-1"
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
                  {q.type === 'NUMERIC' && (
                    <div className="mb-3">
                      <label className="label text-xs mb-1">{t('quiz.correctAnswer', 'Correct Answer')}</label>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) => updateQuizQuestion(idx, { ...q, correctAnswer: e.target.value })}
                        className="input w-48 text-sm"
                        placeholder="42"
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <details>
                    <summary className="cursor-pointer text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      {t('quiz.explanation', 'Explanation')} ({t('common.optional', 'optional')})
                    </summary>
                    <textarea
                      value={q.explanation || ''}
                      onChange={(e) => updateQuizQuestion(idx, { ...q, explanation: e.target.value })}
                      rows={2}
                      className="input w-full text-sm mt-1"
                      placeholder={t('quiz.explanationPlaceholder', 'Explain the correct answer')}
                    />
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-quiz: Rubric Editor */}
      {!isQuiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('wizard.rubric', 'Rubric')}
            </h3>
            <button
              type="button"
              onClick={() => void handleGenerateRubric()}
              disabled={aiLoading}
              className="btn btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {aiLoading ? t('ai.generating', 'Generating...') : t('ai.generateRubric', 'AI Generate Rubric')}
            </button>
          </div>
          <RubricEditor
            rubric={formData.rubric_draft}
            onChange={(rubric) => onChange({ rubric_draft: rubric })}
          />
        </div>
      )}

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
