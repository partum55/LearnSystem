import React, { useState, useRef } from 'react';
import { aiApi, GeneratedModule, GeneratedAssignment, GeneratedQuiz } from '../../api/ai';
import { extractErrorMessage } from '../../api/client';

/**
 * AI Generator for individual course elements
 * Supports: Modules, Assignments, Quizzes with context
 */

type GenerationStage = 'idle' | 'connecting' | 'generating' | 'processing' | 'saving';

interface AIElementGeneratorProps {
  elementType: 'module' | 'assignment' | 'quiz';
  courseId?: string;
  moduleId?: string;
  courseContext?: string; // Context about the course
  moduleContext?: string; // Context about the module
  onGenerated?: (data: GeneratedModule[] | GeneratedAssignment[] | GeneratedQuiz[]) => void;
  onClose?: () => void;
}

export const AIElementGenerator: React.FC<AIElementGeneratorProps> = ({
  elementType,
  courseId,
  moduleId,
  courseContext,
  moduleContext,
  onGenerated,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeneratedModule[] | GeneratedAssignment[] | GeneratedQuiz[] | null>(null);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    prompt: '',
    language: 'uk' as 'uk' | 'en',
    context: '',
    count: elementType === 'quiz' ? 10 : elementType === 'assignment' ? 3 : 1,
    // Module specific
    durationWeeks: 2,
    // Assignment specific
    maxScore: 100,
    submissionType: 'FILE',
    // Quiz specific
    timeLimit: 60,
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
  });

  const elementLabels = {
    module: { uk: 'Модуль', en: 'Module' },
    assignment: { uk: 'Завдання', en: 'Assignment' },
    quiz: { uk: 'Квіз', en: 'Quiz' },
  };

  const stageLabels: Record<GenerationStage, { uk: string; en: string }> = {
    idle: { uk: '', en: '' },
    connecting: { uk: 'Підключення до AI...', en: 'Connecting to AI...' },
    generating: { uk: 'Генерація контенту...', en: 'Generating content...' },
    processing: { uk: 'Обробка результату...', en: 'Processing result...' },
    saving: { uk: 'Збереження...', en: 'Saving...' },
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsCancelled(true);
      setLoading(false);
      setGenerationStage('idle');
      setError('Генерацію скасовано');
    }
  };

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      setError('Будь ласка, введіть опис');
      return;
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    setIsCancelled(false);
    setLoading(true);
    setError(null);
    setGenerationStage('connecting');

    try {
      // Simulate stage progression for better UX feedback
      const progressTimer = setInterval(() => {
        if (isCancelled) {
          clearInterval(progressTimer);
          return;
        }
        setGenerationStage((prev) => {
          if (prev === 'connecting') return 'generating';
          if (prev === 'generating') return 'processing';
          return prev;
        });
      }, 2000);

      // Build full context
      const fullContext = [
        courseContext ? `Курс: ${courseContext}` : '',
        moduleContext ? `Модуль: ${moduleContext}` : '',
        formData.context ? `Додатковий контекст: ${formData.context}` : '',
      ].filter(Boolean).join('\n');

      const promptWithContext = fullContext
        ? `${fullContext}\n\n${formData.prompt}`
        : formData.prompt;

      let result;

      switch (elementType) {
        case 'module':
          if (!courseId) {
            throw new Error('Course ID required for module generation');
          }
          result = await aiApi.generateModules({
            courseId,
            prompt: promptWithContext,
            language: formData.language,
            moduleCount: formData.count,
          });
          break;

        case 'assignment':
          if (!moduleId) {
            throw new Error('Module ID required for assignment generation');
          }
          result = await aiApi.generateAssignments({
            moduleId,
            moduleTopic: promptWithContext,
            language: formData.language,
            assignmentCount: formData.count,
          });
          break;

        case 'quiz':
          if (!moduleId) {
            throw new Error('Module ID required for quiz generation');
          }
          result = await aiApi.generateQuiz({
            moduleId,
            topic: promptWithContext,
            language: formData.language,
            questionCount: formData.count,
            timeLimit: formData.timeLimit,
          });
          break;
      }

      clearInterval(progressTimer);
      setGenerationStage('saving');

      // Extract data based on element type with type narrowing
      let extractedData;
      if (elementType === 'module' && 'modules' in result) {
        extractedData = result.modules;
      } else if (elementType === 'assignment' && 'assignments' in result) {
        extractedData = result.assignments;
      } else if (elementType === 'quiz' && 'quizzes' in result) {
        extractedData = result.quizzes;
      }

      // Check for empty results
      if (!extractedData || (Array.isArray(extractedData) && extractedData.length === 0)) {
        setError('AI не зміг згенерувати контент. Спробуйте уточнити запит або змінити параметри.');
        setLoading(false);
        setGenerationStage('idle');
        return;
      }

      setGeneratedData(extractedData);
      if (onGenerated && extractedData) {
        onGenerated(extractedData);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.name === 'AbortError' || isCancelled) {
        setError('Генерацію скасовано');
      } else {
        setError(extractErrorMessage(err));
      }
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
      setGenerationStage('idle');
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="card rounded-lg p-6 max-w-3xl mx-auto" style={{ background: 'var(--bg-surface)' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Генерація {elementLabels[elementType][formData.language]}
        </h2>
        {onClose && !loading && (
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md flex items-start" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <span style={{ color: 'var(--fn-error)' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2"
            style={{ color: 'var(--fn-error)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Progress Overlay */}
      {loading && (
        <div className="mb-6 p-6 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {stageLabels[generationStage][formData.language]}
              </span>
            </div>
            <button
              onClick={handleCancel}
              className="btn px-3 py-1 text-sm rounded transition-colors"
              style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--fn-error)' }}
            >
              Скасувати
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-base)' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                background: 'var(--text-secondary)',
                width: generationStage === 'connecting' ? '25%' :
                  generationStage === 'generating' ? '50%' :
                    generationStage === 'processing' ? '75%' :
                      generationStage === 'saving' ? '95%' : '0%'
              }}
            />
          </div>

          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Генерація може зайняти від 10 до 60 секунд залежно від складності запиту
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Language Selection */}
        <div>
          <label className="label block mb-2">
            Мова
          </label>
          <select
            value={formData.language}
            onChange={(e) =>
              setFormData({ ...formData, language: e.target.value as 'uk' | 'en' })
            }
            disabled={loading}
            className="input w-full disabled:opacity-50"
          >
            <option value="uk">Українська</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Context Display */}
        {(courseContext || moduleContext) && (
          <div className="rounded-md p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Контекст:</p>
            {courseContext && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Курс: {courseContext}</p>
            )}
            {moduleContext && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Модуль: {moduleContext}</p>
            )}
          </div>
        )}

        {/* Additional Context */}
        <div>
          <label className="label block mb-2">
            Додатковий контекст (необов'язково)
          </label>
          <textarea
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            placeholder="Наприклад: Це для студентів 1 курсу, з базовими знаннями програмування"
            rows={2}
            className="input w-full"
          />
        </div>

        {/* Main Prompt */}
        <div>
          <label className="label block mb-2">
            Що згенерувати? *
          </label>
          <textarea
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            placeholder={
              elementType === 'module'
                ? 'Наприклад: Модуль про основи ООП в Python з прикладами та вправами'
                : elementType === 'assignment'
                  ? 'Наприклад: Практичне завдання на створення класів і об\'єктів'
                  : 'Наприклад: Квіз на перевірку знань про основи ООП'
            }
            rows={3}
            className="input w-full"
            required
          />
        </div>

        {/* Element-specific options */}
        <div className="grid grid-cols-2 gap-4">
          {/* Count */}
          {elementType !== 'module' && (
            <div>
              <label className="label block mb-2">
                {elementType === 'quiz' ? 'Кількість питань' : 'Кількість завдань'}
              </label>
              <input
                type="number"
                value={formData.count}
                onChange={(e) =>
                  setFormData({ ...formData, count: parseInt(e.target.value) })
                }
                min="1"
                max={elementType === 'quiz' ? 50 : 10}
                className="input w-full"
              />
            </div>
          )}

          {/* Module duration */}
          {elementType === 'module' && (
            <div>
              <label className="label block mb-2">
                Тривалість (тижні)
              </label>
              <input
                type="number"
                value={formData.durationWeeks}
                onChange={(e) =>
                  setFormData({ ...formData, durationWeeks: parseInt(e.target.value) })
                }
                min="1"
                max="12"
                className="input w-full"
              />
            </div>
          )}

          {/* Assignment max score */}
          {elementType === 'assignment' && (
            <>
              <div>
                <label className="label block mb-2">
                  Максимальний бал
                </label>
                <input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) =>
                    setFormData({ ...formData, maxScore: parseInt(e.target.value) })
                  }
                  min="1"
                  max="1000"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label block mb-2">
                  Тип подання
                </label>
                <select
                  value={formData.submissionType}
                  onChange={(e) =>
                    setFormData({ ...formData, submissionType: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="FILE">Файл</option>
                  <option value="TEXT">Текст</option>
                  <option value="URL">URL</option>
                  <option value="CODE">Код</option>
                </select>
              </div>
            </>
          )}

          {/* Quiz options */}
          {elementType === 'quiz' && (
            <>
              <div>
                <label className="label block mb-2">
                  Ліміт часу (хв)
                </label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, timeLimit: parseInt(e.target.value) })
                  }
                  min="5"
                  max="180"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label block mb-2">
                  Складність
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD',
                    })
                  }
                  className="input w-full"
                >
                  <option value="EASY">Легкий</option>
                  <option value="MEDIUM">Середній</option>
                  <option value="HARD">Складний</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Preview of generated data */}
        {generatedData && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--fn-success)' }}>Згенеровано:</h3>
            <pre className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
              {JSON.stringify(generatedData, null, 2)}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Скасувати
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !formData.prompt.trim()}
            className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin">...</span>
                <span>Генерація...</span>
              </>
            ) : (
              <span>Згенерувати</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
