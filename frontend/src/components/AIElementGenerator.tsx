import React, { useState } from 'react';
import { aiApi } from '../api/ai';

/**
 * AI Generator for individual course elements
 * Supports: Modules, Assignments, Quizzes with context
 */

interface AIElementGeneratorProps {
  elementType: 'module' | 'assignment' | 'quiz';
  courseId?: string;
  moduleId?: string;
  courseContext?: string; // Context about the course
  moduleContext?: string; // Context about the module
  onGenerated?: (data: any) => void;
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
  const [generatedData, setGeneratedData] = useState<any>(null);

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

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      setError('Будь ласка, введіть опис');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;

      // Build full context
      const fullContext = [
        courseContext ? `Курс: ${courseContext}` : '',
        moduleContext ? `Модуль: ${moduleContext}` : '',
        formData.context ? `Додатковий контекст: ${formData.context}` : '',
      ].filter(Boolean).join('\n');

      const promptWithContext = fullContext
        ? `${fullContext}\n\n${formData.prompt}`
        : formData.prompt;

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
          if (!courseId) {
            throw new Error('Course ID required for quiz generation');
          }
          result = await aiApi.generateQuiz({
            courseId,
            topic: promptWithContext,
            language: formData.language,
            questionCount: formData.count,
            timeLimit: formData.timeLimit,
          });
          break;
      }

      // Extract data based on element type with type narrowing
      let extractedData;
      if (elementType === 'module' && 'modules' in result) {
        extractedData = result.modules;
      } else if (elementType === 'assignment' && 'assignments' in result) {
        extractedData = result.assignments;
      } else if (elementType === 'quiz' && 'quizzes' in result) {
        extractedData = result.quizzes;
      }

      setGeneratedData(extractedData);
      if (onGenerated && extractedData) {
        onGenerated(extractedData);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Помилка генерації');
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          🤖 Генерація {elementLabels[elementType][formData.language]}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Мова
          </label>
          <select
            value={formData.language}
            onChange={(e) =>
              setFormData({ ...formData, language: e.target.value as 'uk' | 'en' })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="uk">🇺🇦 Українська</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>

        {/* Context Display */}
        {(courseContext || moduleContext) && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm font-medium text-blue-900 mb-1">📚 Контекст:</p>
            {courseContext && (
              <p className="text-sm text-blue-700">Курс: {courseContext}</p>
            )}
            {moduleContext && (
              <p className="text-sm text-blue-700">Модуль: {moduleContext}</p>
            )}
          </div>
        )}

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Додатковий контекст (необов'язково)
          </label>
          <textarea
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            placeholder="Наприклад: Це для студентів 1 курсу, з базовими знаннями програмування"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Main Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Element-specific options */}
        <div className="grid grid-cols-2 gap-4">
          {/* Count */}
          {elementType !== 'module' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Module duration */}
          {elementType === 'module' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Assignment max score */}
          {elementType === 'assignment' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип подання
                </label>
                <select
                  value={formData.submissionType}
                  onChange={(e) =>
                    setFormData({ ...formData, submissionType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">✅ Згенеровано:</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {JSON.stringify(generatedData, null, 2)}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={loading}
            >
              Скасувати
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !formData.prompt.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Генерація...</span>
              </>
            ) : (
              <span>🚀 Згенерувати</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

