import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { Loading } from '../components';
import { CreateQuestionModal } from '../components';
import apiClient from '../api/client';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  points: number;
  options: any;
  correct_answer: any;
  explanation: string;
}

interface QuizQuestion {
  id: string;
  position: number;
  points_override: number | null;
  question_detail: Question;
}

interface Quiz {
  id: string;
  course: string;
  title: string;
  description: string;
  time_limit: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  pass_percentage: number;
  questions: QuizQuestion[];
  questions_count: number;
  total_points: number;
}

export const QuizDetail: React.FC = () => {
  const { t } = useTranslation();
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    try {
      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
      setQuiz(response.data);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  const fetchAvailableQuestions = useCallback(async () => {
    if (!quiz?.course) return;
    try {
      const response = await apiClient.get<{ results?: Question[] } | Question[]>(`/assessments/questions/?course=${quiz?.course}`);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setAvailableQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  }, [quiz?.course]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  useEffect(() => {
    if (quiz?.course) {
      fetchAvailableQuestions();
    }
  }, [quiz?.course, fetchAvailableQuestions]);

  const handleAddQuestions = async () => {
    try {
      await apiClient.post(`/assessments/quizzes/${quizId}/add_questions/`, { question_ids: selectedQuestions });
      setSelectedQuestions([]);
      fetchQuiz();
    } catch (error) {
      console.error('Failed to add questions:', error);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'MULTIPLE_CHOICE': t('question.types.multipleChoice'),
      'TRUE_FALSE': t('question.types.trueFalse'),
      'FILL_BLANK': t('question.types.fillBlank'),
      'MATCHING': t('question.types.matching'),
      'NUMERICAL': t('question.types.numerical'),
      'FORMULA': t('question.types.formula'),
      'SHORT_ANSWER': t('question.types.shortAnswer'),
      'ESSAY': t('question.types.essay'),
      'CODE': t('question.types.code'),
    };
    return types[type] || type;
  };

  if (loading) {
    return <Loading />;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {/* Quiz Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {quiz.title}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {quiz.description}
              </p>
            </div>

            {/* Quiz Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {quiz.questions_count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('quiz.questions')}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {quiz.total_points}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('quiz.totalPoints')}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {quiz.time_limit || '∞'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('quiz.minutes')}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {quiz.attempts_allowed}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('quiz.attempts')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Questions List */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('quiz.questions')}
                  </h2>
                  <Button onClick={() => setIsQuestionModalOpen(true)}>
                    {t('question.createNew')}
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {quiz.questions.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                    {t('quiz.noQuestions')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {quiz.questions.map((quizQuestion, index) => (
                      <div
                        key={quizQuestion.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {index + 1}.
                              </span>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {getQuestionTypeLabel(quizQuestion.question_detail.question_type)}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {quizQuestion.points_override || quizQuestion.question_detail.points} {t('quiz.points')}
                              </span>
                            </div>
                            <p className="text-gray-900 dark:text-white mb-2">
                              {quizQuestion.question_detail.stem}
                            </p>
                            {quizQuestion.question_detail.explanation && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                💡 {quizQuestion.question_detail.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Add Questions from Bank */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('quiz.addFromBank')}
                </h2>
              </CardHeader>
              <CardBody>
                {availableQuestions.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                    {t('quiz.noAvailableQuestions')}
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {availableQuestions.map((question) => (
                        <label
                          key={question.id}
                          className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestions([...selectedQuestions, question.id]);
                              } else {
                                setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                {getQuestionTypeLabel(question.question_type)}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {question.points} {t('quiz.points')}
                              </span>
                            </div>
                            <p className="text-gray-900 dark:text-white">
                              {question.stem}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button
                      onClick={handleAddQuestions}
                      disabled={selectedQuestions.length === 0}
                    >
                      {t('quiz.addSelected')} ({selectedQuestions.length})
                    </Button>
                  </>
                )}
              </CardBody>
          </Card>
        </div>
      </div>

      <CreateQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        courseId={quiz.course}
        onQuestionCreated={() => {
          fetchAvailableQuestions();
        }}
      />
    </Layout>
  );
};

export default QuizDetail;
