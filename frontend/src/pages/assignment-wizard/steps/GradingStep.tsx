import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData } from '../wizardTypes';
import RubricEditor from '../../../features/authoring/components/RubricEditor';
import QuizBuilder from '../../../features/authoring/components/QuizBuilder';
import AIReviewPanel from '../../../features/authoring/components/AIReviewPanel';
import { aiApi } from '../../../api/ai';

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

      {/* Max Points */}
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

      {/* Quiz mode: QuizBuilder */}
      {isQuiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('wizard.quizQuestions', 'Quiz Questions')}
            </h3>
            <button
              type="button"
              onClick={() => void handleGenerateQuiz()}
              disabled={aiLoading}
              className="btn btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {aiLoading ? t('ai.generating', 'Generating...') : t('ai.generateQuiz', 'AI Generate Quiz')}
            </button>
          </div>
          <QuizBuilder
            questions={formData.quiz_questions}
            onChange={(questions) => onChange({ quiz_questions: questions })}
          />
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
