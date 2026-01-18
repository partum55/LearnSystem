import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Card, CardHeader, CardBody, Button } from '../components';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import {
  TrashIcon,
  ArrowUpIcon, 
  ArrowDownIcon,
  DocumentDuplicateIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../api/client';

interface Question {
  id?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'multiple_select' | 'fill_blank';
  points: number;
  choices?: string[];
  correct_answer?: string | string[];
  explanation?: string;
  required?: boolean;
}

interface QuizSettings {
  show_results_after: 'immediate' | 'after_due' | 'manual';
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  one_question_at_time: boolean;
  allow_backtrack: boolean;
  require_lockdown_browser: boolean;
  show_point_values: boolean;
}

interface Quiz {
  id?: number;
  title: string;
  description: string;
  instructions?: string;
  course?: string; // changed from number to string to match Course.id
  time_limit?: number;
  attempts_allowed: number;
  available_from?: string;
  available_until?: string;
  passing_score?: number;
  questions: Question[];
  settings: QuizSettings;
}

const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  show_results_after: 'immediate',
  shuffle_questions: false,
  shuffle_answers: false,
  show_correct_answers: true,
  one_question_at_time: false,
  allow_backtrack: true,
  require_lockdown_browser: false,
  show_point_values: true,
};

export const QuizBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'settings'>('basic');
  const [quiz, setQuiz] = useState<Quiz>({
    title: '',
    description: '',
    instructions: '',
    time_limit: 60,
    attempts_allowed: 1,
    passing_score: 70,
    questions: [],
    settings: DEFAULT_QUIZ_SETTINGS,
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialQuizRef = useRef<string>(JSON.stringify(quiz));

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (loading || saving) return false;
    return JSON.stringify(quiz) !== initialQuizRef.current;
  }, [quiz, loading, saving]);

  // Unsaved changes warning
  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedChanges,
    message: t('quiz.unsavedBuilderWarning', 'You have unsaved changes to this quiz. Are you sure you want to leave?'),
  });

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get<any>('/courses/');
      setCourses(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
      const loadedQuiz = {
        // Ensure course id is a string so it matches option values
        ...response.data,
        course: response.data.course ? String((response.data as any).course) : undefined,
        settings: { ...DEFAULT_QUIZ_SETTINGS, ...response.data.settings },
      };
      setQuiz(loadedQuiz);
      // Update initial quiz reference after loading
      initialQuizRef.current = JSON.stringify(loadedQuiz);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchCourses();
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, fetchQuiz]);

  const handleSave = async () => {
    if (!quiz.title || !quiz.course) {
      alert(t('quiz.fillRequired', 'Please fill in all required fields'));
      return;
    }

    setSaving(true);
    try {
      // Prepare payload: if course is numeric-like string, send as number to backend
      const payload: any = {
        ...quiz,
        course: quiz.course && !isNaN(Number(quiz.course)) ? Number(quiz.course) : quiz.course,
      };

      if (quizId) {
        await apiClient.put(`/assessments/quizzes/${quizId}/`, payload);
      } else {
        await apiClient.post('/assessments/quizzes/', payload);
      }
      // Update initial quiz reference after successful save
      initialQuizRef.current = JSON.stringify(quiz);
      alert(t('quiz.saved', 'Quiz saved successfully!'));
      navigate('/question-bank');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert(t('quiz.saveFailed', 'Failed to save quiz'));
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: Question['question_type'] = 'multiple_choice') => {
    const newQuestion: Question = {
      question_text: '',
      question_type: type,
      points: 1,
      required: true,
    };

    if (type === 'multiple_choice' || type === 'multiple_select') {
      newQuestion.choices = ['', '', '', ''];
      newQuestion.correct_answer = type === 'multiple_select' ? [] : '';
    } else if (type === 'true_false') {
      newQuestion.choices = ['True', 'False'];
      newQuestion.correct_answer = '';
    }

    setQuiz({
      ...quiz,
      questions: [...quiz.questions, newQuestion],
    });
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...quiz.questions[index] };
    delete questionToDuplicate.id;
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions.slice(0, index + 1),
        questionToDuplicate,
        ...quiz.questions.slice(index + 1),
      ],
    });
  };

  const removeQuestion = (index: number) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== index),
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
    
    // Reset choices and answers when a question type changes
    if (field === 'question_type') {
      if (value === 'multiple_choice' || value === 'multiple_select') {
        newQuestions[index].choices = ['', '', '', ''];
        newQuestions[index].correct_answer = value === 'multiple_select' ? [] : '';
      } else if (value === 'true_false') {
        newQuestions[index].choices = ['True', 'False'];
        newQuestions[index].correct_answer = '';
      } else {
        newQuestions[index].choices = undefined;
        newQuestions[index].correct_answer = '';
      }
    }
    
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    const newQuestions = [...quiz.questions];
    const choices = [...(newQuestions[questionIndex].choices || [])];
    choices[choiceIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], choices };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const addChoice = (questionIndex: number) => {
    const newQuestions = [...quiz.questions];
    const choices = [...(newQuestions[questionIndex].choices || [])];
    choices.push('');
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], choices };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const newQuestions = [...quiz.questions];
    const choices = (newQuestions[questionIndex].choices || []).filter((_, i) => i !== choiceIndex);
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], choices };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const toggleCorrectAnswer = (questionIndex: number, choice: string) => {
    const question = quiz.questions[questionIndex];
    if (question.question_type === 'multiple_select') {
      const currentAnswers = (question.correct_answer as string[]) || [];
      const newAnswers = currentAnswers.includes(choice)
        ? currentAnswers.filter(a => a !== choice)
        : [...currentAnswers, choice];
      updateQuestion(questionIndex, 'correct_answer', newAnswers);
    } else {
      updateQuestion(questionIndex, 'correct_answer', choice);
    }
  };

  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const renderQuestionEditor = (question: Question, index: number) => {
    return (
      <Card key={index} className="mb-4">
        <CardBody>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {index + 1}
              </span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('quiz.questionNum', { num: index + 1 })}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({question.points} {t('quiz.points', 'points')})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => moveQuestion(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                title={t('common.moveUp', 'Move up')}
              >
                <ArrowUpIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => moveQuestion(index, 'down')}
                disabled={index === quiz.questions.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                title={t('common.moveDown', 'Move down')}
              >
                <ArrowDownIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => duplicateQuestion(index)}
                className="p-1 text-blue-400 hover:text-blue-600"
                title={t('quiz.duplicateQuestion', 'Duplicate question')}
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => removeQuestion(index)}
                className="p-1 text-red-400 hover:text-red-600"
                title={t('common.delete', 'Delete')}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quiz.questionType', 'Question Type')}
                </label>
                <select
                  value={question.question_type}
                  onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="multiple_choice">{t('quiz.multipleChoice', 'Multiple Choice')}</option>
                  <option value="multiple_select">{t('quiz.multipleSelect', 'Multiple Select')}</option>
                  <option value="true_false">{t('quiz.trueFalse', 'True/False')}</option>
                  <option value="short_answer">{t('quiz.shortAnswer', 'Short Answer')}</option>
                  <option value="essay">{t('quiz.essay', 'Essay')}</option>
                  <option value="fill_blank">{t('quiz.fillBlank', 'Fill in the Blank')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quiz.points', 'Points')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={question.points}
                  onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quiz.questionText', 'Question Text')} *
              </label>
              <textarea
                value={question.question_text}
                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder={t('quiz.questionTextPlaceholder', 'Enter your question')}
                required
              />
            </div>

            {/* Multiple Choice / Multiple Select */}
            {(question.question_type === 'multiple_choice' || question.question_type === 'multiple_select') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('quiz.answerChoices', 'Answer Choices')}
                  </label>
                  <button
                    onClick={() => addChoice(index)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    + {t('quiz.addChoice', 'Add Choice')}
                  </button>
                </div>
                <div className="space-y-2">
                  {question.choices?.map((choice, choiceIndex) => (
                    <div key={choiceIndex} className="flex items-center gap-2">
                      <input
                        type={question.question_type === 'multiple_select' ? 'checkbox' : 'radio'}
                        checked={
                          question.question_type === 'multiple_select'
                            ? (question.correct_answer as string[] || []).includes(choice)
                            : question.correct_answer === choice
                        }
                        onChange={() => toggleCorrectAnswer(index, choice)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => updateChoice(index, choiceIndex, e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={t('quiz.choicePlaceholder', { num: choiceIndex + 1 })}
                      />
                      {(question.choices?.length || 0) > 2 && (
                        <button
                          onClick={() => removeChoice(index, choiceIndex)}
                          className="p-2 text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {question.question_type === 'multiple_select'
                    ? t('quiz.selectMultipleHint', 'Check all correct answers')
                    : t('quiz.selectOneHint', 'Select the correct answer')}
                </p>
              </div>
            )}

            {/* True/False */}
            {question.question_type === 'true_false' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quiz.correctAnswer', 'Correct Answer')}
                </label>
                <div className="flex gap-4">
                  {question.choices?.map((choice) => (
                    <label key={choice} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={question.correct_answer === choice}
                        onChange={() => updateQuestion(index, 'correct_answer', choice)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-900 dark:text-white">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Short Answer / Fill Blank */}
            {(question.question_type === 'short_answer' || question.question_type === 'fill_blank') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('quiz.correctAnswer', 'Correct Answer')} (optional)
                </label>
                <input
                  type="text"
                  value={question.correct_answer as string || ''}
                  onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t('quiz.correctAnswerPlaceholder', 'Enter the correct answer')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('quiz.manualGradingNote', 'This question will require manual grading')}
                </p>
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quiz.explanation', 'Explanation')} (optional)
              </label>
              <textarea
                value={question.explanation || ''}
                onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder={t('quiz.explanationPlaceholder', 'Provide an explanation for the correct answer')}
              />
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <Layout>
      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        isSaving={saving}
        title={t('quiz.unsavedChangesTitle', 'Unsaved Quiz Changes')}
        message={t('quiz.unsavedBuilderWarning', 'You have unsaved changes to this quiz. Are you sure you want to leave?')}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quizId ? t('quiz.edit', 'Edit Quiz') : t('quiz.create', 'Create Quiz')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {t('quiz.builderDesc', 'Build your quiz by adding questions and configuring settings')}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate('/question-bank')}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Quiz')}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex gap-8">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'basic'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                  }`}
                >
                  <AcademicCapIcon className="h-5 w-5 inline-block mr-2" />
                  {t('quiz.basicInfo', 'Basic Information')}
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'questions'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                  }`}
                >
                  <CheckCircleIcon className="h-5 w-5 inline-block mr-2" />
                  {t('quiz.questions', 'Questions')} ({quiz.questions.length})
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                  }`}
                >
                  <ClockIcon className="h-5 w-5 inline-block mr-2" />
                  {t('quiz.settings', 'Settings')}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'basic' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('quiz.basicInfo', 'Basic Information')}
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('quiz.title', 'Quiz Title')} *
                      </label>
                      <input
                        type="text"
                        value={quiz.title}
                        onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={t('quiz.titlePlaceholder', 'Enter quiz title')}
                        required
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('quiz.instructions', 'Instructions for Students')}
                      </label>
                      <textarea
                        value={quiz.instructions || ''}
                        onChange={(e) => setQuiz({ ...quiz, instructions: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={t('quiz.instructionsPlaceholder', 'Enter special instructions or notes for students')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('quiz.course', 'Course')} *
                      </label>
                      <select
                        value={quiz.course || ''}
                        onChange={(e) => setQuiz({ ...quiz, course: e.target.value })} // store as string
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('quiz.selectCourse', 'Select a course')}</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('quiz.availableFrom', 'Available From')}
                        </label>
                        <input
                          type="datetime-local"
                          value={quiz.available_from || ''}
                          onChange={(e) => setQuiz({ ...quiz, available_from: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('quiz.availableUntil', 'Available Until')}
                        </label>
                        <input
                          type="datetime-local"
                          value={quiz.available_until || ''}
                          onChange={(e) => setQuiz({ ...quiz, available_until: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {activeTab === 'questions' && (
              <div>
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('quiz.questions', 'Questions')} ({quiz.questions.length})
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('quiz.totalPoints', 'Total Points')}: {totalPoints}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          addQuestion(e.target.value as Question['question_type']);
                          e.target.value = '';
                        }}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          {t('quiz.addQuestion', 'Add Question')}...
                        </option>
                        <option value="multiple_choice">{t('quiz.multipleChoice', 'Multiple Choice')}</option>
                        <option value="multiple_select">{t('quiz.multipleSelect', 'Multiple Select')}</option>
                        <option value="true_false">{t('quiz.trueFalse', 'True/False')}</option>
                        <option value="short_answer">{t('quiz.shortAnswer', 'Short Answer')}</option>
                        <option value="essay">{t('quiz.essay', 'Essay')}</option>
                        <option value="fill_blank">{t('quiz.fillBlank', 'Fill in the Blank')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {quiz.questions.length === 0 ? (
                  <Card>
                    <CardBody>
                      <div className="text-center py-12">
                        <CheckCircleIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          {t('quiz.noQuestions', 'No questions yet. Select a question type to get started.')}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {quiz.questions.map((question, index) => renderQuestionEditor(question, index))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {t('quiz.timingSettings', 'Timing & Attempts')}
                    </h2>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('quiz.timeLimit', 'Time Limit (minutes)')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={quiz.time_limit || ''}
                            onChange={(e) => setQuiz({ ...quiz, time_limit: parseInt(e.target.value) || undefined })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder={t('quiz.noTimeLimit', 'No limit')}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('quiz.timeLimitHint', 'Leave empty for no time limit')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('quiz.attemptsAllowed', 'Attempts Allowed')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={quiz.attempts_allowed}
                            onChange={(e) => setQuiz({ ...quiz, attempts_allowed: parseInt(e.target.value) || 1 })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('quiz.passingScore', 'Passing Score (%)')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={quiz.passing_score || ''}
                          onChange={(e) => setQuiz({ ...quiz, passing_score: parseInt(e.target.value) || undefined })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="70"
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {t('quiz.displaySettings', 'Display Settings')}
                    </h2>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('quiz.showResultsAfter', 'Show Results After')}
                        </label>
                        <select
                          value={quiz.settings.show_results_after}
                          onChange={(e) => setQuiz({
                            ...quiz,
                            settings: { ...quiz.settings, show_results_after: e.target.value as any }
                          })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="immediate">{t('quiz.immediate', 'Immediately')}</option>
                          <option value="after_due">{t('quiz.afterDue', 'After due date')}</option>
                          <option value="manual">{t('quiz.manual', 'Manual release')}</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        {[
                          { key: 'shuffle_questions', label: t('quiz.shuffleQuestions', 'Shuffle questions') },
                          { key: 'shuffle_answers', label: t('quiz.shuffleAnswers', 'Shuffle answer choices') },
                          { key: 'show_correct_answers', label: t('quiz.showCorrectAnswers', 'Show correct answers after submission') },
                          { key: 'show_point_values', label: t('quiz.showPointValues', 'Show point values') },
                          { key: 'one_question_at_time', label: t('quiz.oneQuestionAtTime', 'Show one question at a time') },
                          { key: 'allow_backtrack', label: t('quiz.allowBacktrack', 'Allow students to go back to previous questions') },
                          { key: 'require_lockdown_browser', label: t('quiz.requireLockdown', 'Require lockdown browser') },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quiz.settings[key as keyof QuizSettings] as boolean}
                              onChange={(e) => setQuiz({
                                ...quiz,
                                settings: { ...quiz.settings, [key]: e.target.checked }
                              })}
                              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default QuizBuilder;

