import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components';
import { Sidebar } from '../components';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../api/client';

interface Question {
  id?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  points: number;
  choices?: string[];
  correct_answer?: string | string[];
}

interface Quiz {
  id?: number;
  title: string;
  description: string;
  course?: number;
  time_limit?: number;
  questions: Question[];
}

export const QuizBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz>({
    title: '',
    description: '',
    time_limit: 60,
    questions: []
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get<any>('/courses/');
      setCourses(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchQuiz = async () => {
    try {
      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
      setQuiz(response.data);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (quizId) {
        await apiClient.put(`/assessments/quizzes/${quizId}/`, quiz);
      } else {
        await apiClient.post('/assessments/quizzes/', quiz);
      }
      alert(t('quiz.saved', 'Quiz saved successfully!'));
      navigate('/question-bank');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert(t('quiz.saveFailed', 'Failed to save quiz'));
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          question_text: '',
          question_type: 'multiple_choice',
          points: 1,
          choices: ['', '', '', ''],
          correct_answer: ''
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== index)
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...quiz.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...quiz.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    const newQuestions = [...quiz.questions];
    const choices = [...(newQuestions[questionIndex].choices || [])];
    choices[choiceIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], choices };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quizId ? t('quiz.edit', 'Edit Quiz') : t('quiz.create', 'Create Quiz')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {t('quiz.builderDesc', 'Build your quiz by adding questions')}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate('/question-bank')}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('quiz.basicInfo', 'Basic Information')}
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('quiz.title', 'Quiz Title')}
                    </label>
                    <input
                      type="text"
                      value={quiz.title}
                      onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder={t('quiz.titlePlaceholder', 'Enter quiz title')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('quiz.description', 'Description')}
                    </label>
                    <textarea
                      value={quiz.description}
                      onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder={t('quiz.descriptionPlaceholder', 'Enter quiz description')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('quiz.course', 'Course')}
                      </label>
                      <select
                        value={quiz.course || ''}
                        onChange={(e) => setQuiz({ ...quiz, course: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('quiz.selectCourse', 'Select a course')}</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('quiz.timeLimit', 'Time Limit (minutes)')}
                      </label>
                      <input
                        type="number"
                        value={quiz.time_limit || ''}
                        onChange={(e) => setQuiz({ ...quiz, time_limit: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="60"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('quiz.questions', 'Questions')} ({quiz.questions.length})
                </h2>
                <Button onClick={addQuestion} size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('quiz.addQuestion', 'Add Question')}
                </Button>
              </div>

              {quiz.questions.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      {t('quiz.noQuestions', 'No questions yet. Click "Add Question" to get started.')}
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-4">
                  {quiz.questions.map((question, index) => (
                    <Card key={index}>
                      <CardBody>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {t('quiz.questionNum', 'Question {{num}}', { num: index + 1 })}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveQuestion(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                            >
                              <ArrowUpIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, 'down')}
                              disabled={index === quiz.questions.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                            >
                              <ArrowDownIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => removeQuestion(index)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quiz.questionType', 'Question Type')}
                              </label>
                              <select
                                value={question.question_type}
                                onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="multiple_choice">{t('quiz.multipleChoice', 'Multiple Choice')}</option>
                                <option value="true_false">{t('quiz.trueFalse', 'True/False')}</option>
                                <option value="short_answer">{t('quiz.shortAnswer', 'Short Answer')}</option>
                                <option value="essay">{t('quiz.essay', 'Essay')}</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quiz.points', 'Points')}
                              </label>
                              <input
                                type="number"
                                value={question.points}
                                onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t('quiz.questionText', 'Question Text')}
                            </label>
                            <textarea
                              value={question.question_text}
                              onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              placeholder={t('quiz.questionTextPlaceholder', 'Enter your question')}
                            />
                          </div>

                          {question.question_type === 'multiple_choice' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quiz.choices', 'Answer Choices')}
                              </label>
                              <div className="space-y-2">
                                {question.choices?.map((choice, choiceIndex) => (
                                  <input
                                    key={choiceIndex}
                                    type="text"
                                    value={choice}
                                    onChange={(e) => updateChoice(index, choiceIndex, e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('quiz.choicePlaceholder', 'Choice {{num}}', { num: choiceIndex + 1 })}
                                  />
                                ))}
                              </div>
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {t('quiz.correctAnswer', 'Correct Answer')}
                                </label>
                                <input
                                  type="text"
                                  value={question.correct_answer as string || ''}
                                  onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('quiz.correctAnswerPlaceholder', 'Enter the correct answer')}
                                />
                              </div>
                            </div>
                          )}

                          {question.question_type === 'true_false' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quiz.correctAnswer', 'Correct Answer')}
                              </label>
                              <select
                                value={question.correct_answer as string || ''}
                                onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">{t('quiz.selectAnswer', 'Select answer')}</option>
                                <option value="true">{t('quiz.true', 'True')}</option>
                                <option value="false">{t('quiz.false', 'False')}</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QuizBuilder;

