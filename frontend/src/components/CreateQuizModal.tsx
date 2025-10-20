import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '../components';
import apiClient from '../api/client';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  points: number;
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onQuizCreated: () => void;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onQuizCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'basic' | 'questions'>('basic');

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time_limit: '',
    attempts_allowed: '1',
    shuffle_questions: false,
    shuffle_answers: false,
    show_correct_answers: true,
    pass_percentage: '60',
  });

  useEffect(() => {
    if (isOpen && step === 'questions') {
      fetchQuestions();
    }
  }, [isOpen, step, courseId]);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await apiClient.get(`/assessments/questions/?course=${courseId}`);
      const data = response.data as any;
      const questions = Array.isArray(data) ? data : data.results || [];
      setAvailableQuestions(questions);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError(t('quiz.errors.titleRequired'));
      return;
    }
    setStep('questions');
  };

  const handleFinalSubmit = async () => {
    if (selectedQuestions.length === 0) {
      setError(t('quiz.errors.noQuestions'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Create quiz
      const quizPayload = {
        course: courseId,
        title: formData.title,
        description: formData.description,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
        attempts_allowed: parseInt(formData.attempts_allowed),
        shuffle_questions: formData.shuffle_questions,
        shuffle_answers: formData.shuffle_answers,
        show_correct_answers: formData.show_correct_answers,
        pass_percentage: parseFloat(formData.pass_percentage),
      };

      const quizResponse = await apiClient.post('/assessments/quizzes/', quizPayload);
      const quizId = (quizResponse.data as { id: string }).id;

      // Add questions to quiz
      await apiClient.post(`/assessments/quizzes/${quizId}/add_questions/`, {
        question_ids: selectedQuestions,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        time_limit: '',
        attempts_allowed: '1',
        shuffle_questions: false,
        shuffle_answers: false,
        show_correct_answers: true,
        pass_percentage: '60',
      });
      setSelectedQuestions([]);
      setStep('basic');

      onQuizCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || t('quiz.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleBack = () => {
    setStep('basic');
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'basic' ? t('quiz.createQuiz') : t('quiz.addQuestions')}
      size="large"
    >
      {step === 'basic' ? (
        <form onSubmit={handleBasicSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <Input
            label={t('quiz.title')}
            name="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            placeholder={t('quiz.titlePlaceholder')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('quiz.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder={t('quiz.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('quiz.timeLimit')}
              name="time_limit"
              type="number"
              value={formData.time_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, time_limit: e.target.value }))}
              min="1"
              placeholder={t('quiz.timeLimitPlaceholder')}
            />

            <Input
              label={t('quiz.attemptsAllowed')}
              name="attempts_allowed"
              type="number"
              value={formData.attempts_allowed}
              onChange={(e) => setFormData(prev => ({ ...prev, attempts_allowed: e.target.value }))}
              required
              min="1"
            />
          </div>

          <Input
            label={t('quiz.passPercentage')}
            name="pass_percentage"
            type="number"
            value={formData.pass_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, pass_percentage: e.target.value }))}
            required
            min="0"
            max="100"
            step="0.1"
          />

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="shuffle_questions"
                checked={formData.shuffle_questions}
                onChange={(e) => setFormData(prev => ({ ...prev, shuffle_questions: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="shuffle_questions" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('quiz.shuffleQuestions')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="shuffle_answers"
                checked={formData.shuffle_answers}
                onChange={(e) => setFormData(prev => ({ ...prev, shuffle_answers: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="shuffle_answers" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('quiz.shuffleAnswers')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_correct_answers"
                checked={formData.show_correct_answers}
                onChange={(e) => setFormData(prev => ({ ...prev, show_correct_answers: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show_correct_answers" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('quiz.showCorrectAnswers')}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {t('common.next')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('quiz.selectedQuestions')}: {selectedQuestions.length}
            </p>
          </div>

          {loadingQuestions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : availableQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">{t('quiz.noAvailableQuestions')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('quiz.createQuestionsFirst')}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {availableQuestions.map((question) => (
                <label
                  key={question.id}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuestions.includes(question.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.id)}
                    onChange={() => toggleQuestion(question.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {question.question_type.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {question.stem}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-block">
                      {question.points} {t('quiz.points')}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={handleBack}>
              {t('common.back')}
            </Button>
            <Button
              onClick={handleFinalSubmit}
              isLoading={loading}
              disabled={selectedQuestions.length === 0}
            >
              {t('quiz.createQuiz')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
