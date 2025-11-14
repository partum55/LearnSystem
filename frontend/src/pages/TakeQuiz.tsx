import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import apiClient from '../api/client';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  points: number;
  options: any;
}

interface QuizQuestion {
  id: string;
  position: number;
  points_override: number | null;
  question_detail: Question;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  questions: QuizQuestion[];
  total_points: number;
}

interface QuizAttempt {
  id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  final_score: number | null;
}

export const TakeQuiz: React.FC = () => {
  const { t } = useTranslation();
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit && attempt && !attempt.submitted_at) {
      const startTime = new Date(attempt.started_at).getTime();
      const endTime = startTime + quiz.time_limit * 60 * 1000;
      
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining === 0) {
          handleSubmit();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [quiz, attempt]);
  const fetchQuiz = async () => {
    try {
      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
      setQuiz(response.data);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAttempt = async () => {
    try {
      const response = await apiClient.post<QuizAttempt>(`/assessments/quizzes/${quizId}/start_attempt/`);
      setAttempt(response.data);
    } catch (error) {
      console.error('Failed to start attempt:', error);
    }
  };

  const handleSubmit = async () => {
    if (!attempt) return;

    setSubmitting(true);
    try {
      const response = await apiClient.post(`/assessments/quiz-attempts/${attempt.id}/submit/`, { answers });
      const data: any = response.data;
      navigate(`/quiz-results/${data.id}`);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (quizQuestion: QuizQuestion) => {
    const question = quizQuestion.question_detail;
    const questionId = question.id;

    switch (question.question_type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {question.options.choices?.map((choice: string, idx: number) => (
              <label
                key={idx}
                className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name={questionId}
                  value={choice}
                  checked={answers[questionId] === choice}
                  onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">{choice}</span>
              </label>
            ))}
          </div>
        );

      case 'TRUE_FALSE':
        return (
          <div className="space-y-2">
            {['True', 'False'].map((option) => (
              <label
                key={option}
                className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name={questionId}
                  value={option}
                  checked={answers[questionId] === option}
                  onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'FILL_BLANK':
        const blanksCount = question.options.blanks_count || 1;
        return (
          <div className="space-y-3">
            {Array.from({ length: blanksCount }).map((_, idx) => (
              <input
                key={idx}
                type="text"
                value={answers[questionId]?.answers?.[idx] || ''}
                onChange={(e) => {
                  const currentAnswers = answers[questionId]?.answers || [];
                  currentAnswers[idx] = e.target.value;
                  setAnswers({
                    ...answers,
                    [questionId]: { answers: currentAnswers },
                  });
                }}
                placeholder={`${t('question.blank')} ${idx + 1}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            ))}
          </div>
        );

      case 'MATCHING':
        const leftItems = question.options.left_items || [];
        const rightItems = question.options.right_items || [];
        return (
          <div className="space-y-3">
            {leftItems.map((leftItem: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-3">
                <span className="w-1/3 text-gray-900 dark:text-white">{leftItem}</span>
                <span className="text-gray-500">→</span>
                <select
                  value={answers[questionId]?.pairs?.[leftItem] || ''}
                  onChange={(e) => {
                    const currentPairs = answers[questionId]?.pairs || {};
                    currentPairs[leftItem] = e.target.value;
                    setAnswers({
                      ...answers,
                      [questionId]: { pairs: currentPairs },
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('question.selectMatch')}</option>
                  {rightItems.map((rightItem: string) => (
                    <option key={rightItem} value={rightItem}>
                      {rightItem}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );

      case 'NUMERICAL':
        return (
          <input
            type="number"
            value={answers[questionId] || ''}
            onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
            step="any"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder={t('question.enterNumber')}
          />
        );

      case 'SHORT_ANSWER':
        return (
          <textarea
            value={answers[questionId] || ''}
            onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder={t('question.enterAnswer')}
          />
        );

      case 'ESSAY':
        return (
          <textarea
            value={answers[questionId] || ''}
            onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            placeholder={t('question.enterEssay')}
          />
        );

      case 'CODE':
        return (
          <textarea
            value={answers[questionId] || ''}
            onChange={(e) => setAnswers({ ...answers, [questionId]: e.target.value })}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm dark:bg-gray-700 dark:text-white"
            placeholder={t('question.enterCode')}
          />
        );

      default:
        return null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Loading />;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  // Show quiz start screen
  if (!attempt) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quiz.title}
                  </h1>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      {quiz.description}
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                      <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>{t('quiz.questions')}:</strong> {quiz.questions.length}
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>{t('quiz.totalPoints')}:</strong> {quiz.total_points}
                      </p>
                      {quiz.time_limit && (
                        <p className="text-sm text-blue-900 dark:text-blue-300">
                          <strong>{t('quiz.timeLimit')}:</strong> {quiz.time_limit} {t('quiz.minutes')}
                        </p>
                      )}
                      <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>{t('quiz.attemptsAllowed')}:</strong> {quiz.attempts_allowed}
                      </p>
                    </div>

                    <Button onClick={startAttempt} className="w-full">
                      {t('quiz.startQuiz')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show quiz questions
  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            {/* Timer */}
            {timeRemaining !== null && (
              <div className="mb-6 sticky top-4 z-10">
                <Card className={`${timeRemaining < 300 ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('quiz.timeRemaining')}
                      </span>
                      <span className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-6 mb-8">
              {quiz.questions.map((quizQuestion, index) => (
                <Card key={quizQuestion.id}>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                              {index + 1}.
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ({quizQuestion.points_override || quizQuestion.question_detail.points} {t('quiz.points')})
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white mb-4">
                            {quizQuestion.question_detail.stem}
                          </p>
                        </div>
                      </div>
                      
                      {renderQuestionInput(quizQuestion)}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-4">
              <Card>
                <CardBody>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? t('quiz.submitting') : t('quiz.submitQuiz')}
                  </Button>
                </CardBody>
              </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TakeQuiz;
