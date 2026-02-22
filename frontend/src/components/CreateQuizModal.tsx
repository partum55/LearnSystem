import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '../components';
import apiClient, { extractErrorMessage } from '../api/client';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  points: number;
}

interface ApiQuestion {
  id: string;
  questionType: string;
  stem: string;
  points: number;
}

interface PageResponse<T> {
  content: T[];
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

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const response = await apiClient.get<PageResponse<ApiQuestion>>(`/assessments/questions/course/${courseId}`);
      const questions = (response.data.content || []).map((q) => ({
        id: q.id,
        question_type: q.questionType,
        stem: q.stem,
        points: Number(q.points),
      }));
      setAvailableQuestions(questions);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isOpen && step === 'questions') {
      fetchQuestions();
    }
  }, [isOpen, step, fetchQuestions]);

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
      const quizResponse = await apiClient.post('/assessments/quizzes', null, {
        params: {
          courseId,
          title: formData.title,
          ...(formData.description ? { description: formData.description } : {}),
        },
      });
      const quizId = (quizResponse.data as { id: string }).id;

      await Promise.all(
        selectedQuestions.map((questionId) =>
          apiClient.post(`/assessments/quizzes/${quizId}/questions/${questionId}`)
        )
      );

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
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
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
            <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
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
            <label className="label block mb-1">
              {t('quiz.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="input w-full"
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
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              <label htmlFor="shuffle_questions" className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('quiz.shuffleQuestions')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="shuffle_answers"
                checked={formData.shuffle_answers}
                onChange={(e) => setFormData(prev => ({ ...prev, shuffle_answers: e.target.checked }))}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              <label htmlFor="shuffle_answers" className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('quiz.shuffleAnswers')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_correct_answers"
                checked={formData.show_correct_answers}
                onChange={(e) => setFormData(prev => ({ ...prev, show_correct_answers: e.target.checked }))}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              <label htmlFor="show_correct_answers" className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('quiz.showCorrectAnswers')}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
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
            <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('quiz.selectedQuestions')}: {selectedQuestions.length}
            </p>
          </div>

          {loadingQuestions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 mx-auto" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
            </div>
          ) : availableQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-muted)' }}>{t('quiz.noAvailableQuestions')}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                {t('quiz.createQuestionsFirst')}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {availableQuestions.map((question) => (
                <label
                  key={question.id}
                  className="flex items-start p-4 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: selectedQuestions.includes(question.id) ? '2px solid var(--text-primary)' : '1px solid var(--border-default)',
                    background: selectedQuestions.includes(question.id) ? 'var(--bg-active)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.id)}
                    onChange={() => toggleQuestion(question.id)}
                    className="h-4 w-4 rounded mt-1"
                    style={{ accentColor: 'var(--text-primary)' }}
                  />
                  <div className="ml-3 flex-1">
                    <span className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                      {question.question_type.replace('_', ' ')}
                    </span>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                      {question.stem}
                    </p>
                    <span className="text-xs mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                      {question.points} {t('quiz.points')}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
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
