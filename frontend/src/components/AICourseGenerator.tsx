import React, { useState } from 'react';
import { aiApi, CourseGenerationRequest, GeneratedCourseResponse } from '../api/ai';
import { useAuthStore } from '../store/authStore';

interface AICourseGeneratorProps {
  onCourseGenerated?: (course: any) => void;
  onClose?: () => void;
}

export const AICourseGenerator: React.FC<AICourseGeneratorProps> = ({
  onCourseGenerated,
  onClose,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourseResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<CourseGenerationRequest>({
    prompt: '',
    language: 'uk',
    include_modules: true,
    include_assignments: true,
    include_quizzes: true,
    academic_year: '2024-2025',
    module_count: 4,
    assignment_count: 3,
    quiz_count: 10,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleGeneratePreview = async () => {
    if (!formData.prompt.trim()) {
      setError('Будь ласка, введіть опис курсу');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.generateCourse(formData);
      setGeneratedCourse(response.data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка генерації курсу');
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!generatedCourse || !user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.generateAndSaveCourse(formData, user.id);
      if (onCourseGenerated) {
        onCourseGenerated(response.data);
      }
      alert('Курс успішно створено!');
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка збереження курсу');
      console.error('AI save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          🤖 Генерація курсу за допомогою AI
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {!showPreview ? (
        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Опис курсу *
            </label>
            <textarea
              name="prompt"
              value={formData.prompt}
              onChange={handleInputChange}
              placeholder="Наприклад: Створи курс з основ програмування на Python для початківців з практичними завданнями та квізами"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Мова
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="uk">Українська</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Навчальний рік
              </label>
              <input
                type="text"
                name="academic_year"
                value={formData.academic_year}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Що включити в курс:
            </h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="include_modules"
                  checked={formData.include_modules}
                  onChange={handleInputChange}
                  className="rounded text-blue-600"
                />
                <span>Модулі</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="include_assignments"
                  checked={formData.include_assignments}
                  onChange={handleInputChange}
                  className="rounded text-blue-600"
                />
                <span>Завдання</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="include_quizzes"
                  checked={formData.include_quizzes}
                  onChange={handleInputChange}
                  className="rounded text-blue-600"
                />
                <span>Квізи</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {formData.include_modules && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Кількість модулів
                </label>
                <input
                  type="number"
                  name="module_count"
                  value={formData.module_count}
                  onChange={handleInputChange}
                  min="1"
                  max="12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {formData.include_assignments && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Завдань на модуль
                </label>
                <input
                  type="number"
                  name="assignment_count"
                  value={formData.assignment_count}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {formData.include_quizzes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Питань у квізі
                </label>
                <input
                  type="number"
                  name="quiz_count"
                  value={formData.quiz_count}
                  onChange={handleInputChange}
                  min="5"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
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
              onClick={handleGeneratePreview}
              disabled={loading || !formData.prompt.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Генерація...</span>
                </>
              ) : (
                <span>🚀 Згенерувати курс</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {generatedCourse?.title}
            </h3>
            <p className="text-gray-700 mb-4">{generatedCourse?.description}</p>
            <p className="text-sm text-gray-500">
              Навчальний рік: {generatedCourse?.academic_year}
            </p>

            {generatedCourse?.modules && generatedCourse.modules.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">
                  Модулі ({generatedCourse.modules.length}):
                </h4>
                <div className="space-y-3">
                  {generatedCourse.modules.map((module, idx) => (
                    <div key={idx} className="bg-white rounded p-3 border">
                      <h5 className="font-medium">{module.title}</h5>
                      <p className="text-sm text-gray-600">{module.description}</p>
                      {module.assignments && module.assignments.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          📝 Завдань: {module.assignments.length}
                        </p>
                      )}
                      {module.quizzes && module.quizzes.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          ❓ Квізів: {module.quizzes.length}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowPreview(false);
                setGeneratedCourse(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={loading}
            >
              ← Назад до редагування
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Збереження...</span>
                </>
              ) : (
                <span>💾 Зберегти курс</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

