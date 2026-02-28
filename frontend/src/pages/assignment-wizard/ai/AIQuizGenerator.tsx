import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../../api/ai';
import { QuestionDraft } from '../../../features/authoring/types';

interface AIQuizGeneratorProps {
  moduleId: string;
  topic: string;
  onApply: (questions: QuestionDraft[]) => void;
  onClose: () => void;
}

const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  moduleId,
  topic,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState(topic);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      // generateQuiz returns { moduleId, quizzes: GeneratedQuiz[] }
      const response = await aiApi.generateQuiz({
        moduleId,
        topic: customTopic || topic,
        language: 'en',
      });

      const quizzes = response.quizzes || [];
      const allQuestions = quizzes.flatMap(q => q.questions || []);

      if (allQuestions.length > 0) {
        const mapped: QuestionDraft[] = allQuestions.map(
          (q, i) => ({
            id: `ai-q-${Date.now()}-${i}`,
            type: 'MCQ' as const,
            prompt: String(q.stem || ''),
            explanation: '',
            points: Number(q.points || 1),
            format: 'MARKDOWN' as const,
            options: (Array.isArray(q.options) ? (q.options as string[]) : []).map((opt: string, j: number) => ({
              id: `ai-opt-${Date.now()}-${i}-${j}`,
              text: String(opt),
              isCorrect: String(q.correct_answer ?? '') === String(opt) ||
                Number(q.correct_answer ?? -1) === j,
              format: 'MARKDOWN' as const,
            })),
          })
        );
        setQuestions(mapped);
      }
    } catch {
      setError(t('ai.generationFailed', 'Failed to generate quiz'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-lg p-6 space-y-4 max-h-[80vh] flex flex-col"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {t('ai.quiz.title', 'AI Quiz Generator')}
          </h2>

          <div>
            <label className="label text-sm">{t('ai.quiz.topic', 'Topic')}</label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="input w-full text-sm"
              placeholder={t('ai.quizTopic', 'Enter quiz topic')}
            />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          {/* Generated questions preview */}
          {questions.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('ai.quiz.generated', 'Generated')} {questions.length} {t('common.questions', 'questions')}
              </p>
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="p-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                >
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {q.options.map((opt) => (
                      <p
                        key={opt.id}
                        className="text-xs pl-3"
                        style={{ color: opt.isCorrect ? 'var(--fn-success)' : 'var(--text-muted)' }}
                      >
                        {opt.isCorrect ? '+ ' : '- '}{opt.text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              {t('common.cancel', 'Cancel')}
            </button>
            {questions.length > 0 ? (
              <button
                type="button"
                onClick={() => { onApply(questions); onClose(); }}
                className="btn btn-primary flex-1 py-2"
              >
                {t('ai.quiz.apply', 'Apply Questions')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={loading || !customTopic.trim()}
                className="btn btn-primary flex-1 py-2"
              >
                {loading ? t('ai.generating', 'Generating...') : t('ai.quiz.generate', 'Generate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AIQuizGenerator;
