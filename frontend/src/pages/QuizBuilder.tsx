import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout, Button } from '../components';
import { Course } from '../types';
import { UnsavedChangesPrompt } from '../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import { apiClient } from '../api/client';
import {
  Question,
  Quiz,
  QuizBuilderTab,
  DEFAULT_QUIZ_SETTINGS,
  applyQuestionTypeDefaults,
  createInitialQuiz,
  createQuestion,
} from './quiz-builder/quizBuilderModel';
import { QuizBuilderTabContent } from './quiz-builder/QuizBuilderTabContent';
import { getQuizBuilderTabs } from './quiz-builder/quizBuilderTabs';
import { TabTransition } from '../components/animation';

interface QuizApiResponse {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  moduleId?: string;
  timeLimit?: number | null;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  passPercentage?: number;
}

interface ModuleSummary {
  id: string;
  title: string;
}

export const QuizBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { quizId: routeQuizId } = useParams();
  const [searchParams] = useSearchParams();
  const quizId = routeQuizId || searchParams.get('quizId') || undefined;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<QuizBuilderTab>('basic');
  const [quiz, setQuiz] = useState<Quiz>(createInitialQuiz);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialQuizRef = useRef<string>(JSON.stringify(createInitialQuiz()));

  const hasUnsavedChanges = useMemo(() => {
    if (loading || saving) return false;
    return JSON.stringify(quiz) !== initialQuizRef.current;
  }, [quiz, loading, saving]);

  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty: hasUnsavedChanges,
    message: t('quiz.unsavedBuilderWarning', 'You have unsaved changes to this quiz. Are you sure you want to leave?'),
  });

  const fetchCourses = useCallback(async () => {
    try {
      const response = await apiClient.get<{ content?: Course[] } | Course[]>('/courses');
      const data = response.data;
      const courseList = Array.isArray(data) ? data : data.content || [];
      const normalizedCourses = (Array.isArray(courseList) ? courseList : []).map(
        (
          course: Course & {
            titleUk?: string;
            titleEn?: string;
            descriptionUk?: string;
            descriptionEn?: string;
          }
        ) => ({
          ...course,
          title: course.title || course.titleUk || course.titleEn || '',
          description: course.description || course.descriptionUk || course.descriptionEn || '',
        })
      );
      setCourses(normalizedCourses);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  }, []);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      const response = await apiClient.get<QuizApiResponse>(`/assessments/quizzes/${quizId}`);
      const loadedQuiz: Quiz = {
        id: response.data.id,
        title: response.data.title,
        description: response.data.description || '',
        course: response.data.courseId ? String(response.data.courseId) : undefined,
        time_limit: response.data.timeLimit ?? 60,
        attempts_allowed: response.data.attemptsAllowed ?? 1,
        passing_score: response.data.passPercentage ?? 70,
        questions: [],
        settings: {
          ...DEFAULT_QUIZ_SETTINGS,
          shuffle_questions: Boolean(response.data.shuffleQuestions),
          shuffle_answers: Boolean(response.data.shuffleAnswers),
        },
      };

      setQuiz(loadedQuiz);
      setSelectedModuleId(response.data.moduleId ? String(response.data.moduleId) : '');
      initialQuizRef.current = JSON.stringify(loadedQuiz);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  const fetchModules = useCallback(async (selectedCourseId: string) => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId('');
      return;
    }
    try {
      const response = await apiClient.get<ModuleSummary[]>(`/courses/${selectedCourseId}/modules`);
      const loadedModules = Array.isArray(response.data) ? response.data : [];
      setModules(loadedModules);
      const selectedExists = loadedModules.some((module) => String(module.id) === selectedModuleId);
      if (!selectedExists) {
        setSelectedModuleId(loadedModules.length > 0 ? String(loadedModules[0].id) : '');
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      setModules([]);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    void fetchCourses();
    if (quizId) {
      void fetchQuiz();
    }
  }, [quizId, fetchCourses, fetchQuiz]);

  useEffect(() => {
    if (quiz.course) {
      void fetchModules(String(quiz.course));
    } else {
      setModules([]);
      setSelectedModuleId('');
    }
  }, [quiz.course, fetchModules]);

  const handleSave = async () => {
    if (!quiz.title || !quiz.course) {
      alert(t('quiz.fillRequired', 'Please fill in all required fields'));
      return;
    }
    if (!quizId && !selectedModuleId) {
      alert(t('modules.selectModule', 'Please select a module'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...quiz,
        course: quiz.course && !Number.isNaN(Number(quiz.course)) ? Number(quiz.course) : quiz.course,
      };

      if (quizId) {
        await apiClient.put(`/assessments/quizzes/${quizId}`, {
          id: quizId,
          courseId: payload.course,
          title: payload.title,
          description: payload.description,
          timeLimit: payload.time_limit,
          attemptsAllowed: payload.attempts_allowed,
          shuffleQuestions: payload.settings.shuffle_questions,
          shuffleAnswers: payload.settings.shuffle_answers,
          showCorrectAnswers: payload.settings.show_correct_answers,
          passPercentage: payload.passing_score,
        });
      } else {
        await apiClient.post('/assessments/assignments', {
          courseId: payload.course,
          moduleId: selectedModuleId,
          assignmentType: 'QUIZ',
          title: payload.title,
          description: payload.description || '',
          maxPoints: 100,
          isPublished: false,
          quiz: {
            title: payload.title,
            description: payload.description || undefined,
            timeLimit: payload.time_limit,
            attemptsAllowed: payload.attempts_allowed,
            shuffleQuestions: payload.settings.shuffle_questions,
            shuffleAnswers: payload.settings.shuffle_answers,
            showCorrectAnswers: payload.settings.show_correct_answers,
            passPercentage: payload.passing_score,
          },
        });
      }

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
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: [...previousQuiz.questions, createQuestion(type)],
    }));
  };

  const duplicateQuestion = (index: number) => {
    setQuiz((previousQuiz) => {
      const questionToDuplicate = { ...previousQuiz.questions[index] };
      delete questionToDuplicate.id;

      return {
        ...previousQuiz,
        questions: [
          ...previousQuiz.questions.slice(0, index + 1),
          questionToDuplicate,
          ...previousQuiz.questions.slice(index + 1),
        ],
      };
    });
  };

  const removeQuestion = (index: number) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: previousQuiz.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuiz((previousQuiz) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= previousQuiz.questions.length) {
        return previousQuiz;
      }

      const questions = [...previousQuiz.questions];
      [questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const updateQuestion = (index: number, field: keyof Question, value: unknown) => {
    setQuiz((previousQuiz) => {
      const questions = [...previousQuiz.questions];
      const currentQuestion = questions[index];

      if (!currentQuestion) {
        return previousQuiz;
      }

      if (field === 'question_type') {
        questions[index] = applyQuestionTypeDefaults(currentQuestion, value as Question['question_type']);
      } else {
        questions[index] = { ...currentQuestion, [field]: value };
      }

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    setQuiz((previousQuiz) => {
      const questions = [...previousQuiz.questions];
      const question = questions[questionIndex];
      if (!question) {
        return previousQuiz;
      }

      const choices = [...(question.choices || [])];
      choices[choiceIndex] = value;
      questions[questionIndex] = { ...question, choices };

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const addChoice = (questionIndex: number) => {
    setQuiz((previousQuiz) => {
      const questions = [...previousQuiz.questions];
      const question = questions[questionIndex];
      if (!question) {
        return previousQuiz;
      }

      const choices = [...(question.choices || []), ''];
      questions[questionIndex] = { ...question, choices };

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    setQuiz((previousQuiz) => {
      const questions = [...previousQuiz.questions];
      const question = questions[questionIndex];
      if (!question) {
        return previousQuiz;
      }

      const choices = (question.choices || []).filter((_, currentChoiceIndex) => currentChoiceIndex !== choiceIndex);
      questions[questionIndex] = { ...question, choices };

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const toggleCorrectAnswer = (questionIndex: number, choice: string) => {
    setQuiz((previousQuiz) => {
      const questions = [...previousQuiz.questions];
      const question = questions[questionIndex];
      if (!question) {
        return previousQuiz;
      }

      if (question.question_type === 'multiple_select') {
        const currentAnswers = (question.correct_answer as string[]) || [];
        const correctAnswer = currentAnswers.includes(choice)
          ? currentAnswers.filter((answer) => answer !== choice)
          : [...currentAnswers, choice];
        questions[questionIndex] = { ...question, correct_answer: correctAnswer };
      } else {
        questions[questionIndex] = { ...question, correct_answer: choice };
      }

      return {
        ...previousQuiz,
        questions,
      };
    });
  };

  const totalPoints = useMemo(
    () => quiz.questions.reduce((sum, question) => sum + (question.points || 0), 0),
    [quiz.questions]
  );

  const tabs = getQuizBuilderTabs(t, quiz.questions.length);

  return (
    <Layout>
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {quizId ? t('quiz.edit', 'Edit Quiz') : t('quiz.create', 'Create Quiz')}
              </h1>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
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

          <div className="mb-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <nav className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="border-b-2 px-1 py-4 text-sm font-medium transition-colors"
                  style={
                    activeTab === tab.id
                      ? { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }
                      : { borderColor: 'transparent', color: 'var(--text-muted)' }
                  }
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <TabTransition tabKey={activeTab}>
            <QuizBuilderTabContent
              activeTab={activeTab}
              quiz={quiz}
              courses={courses}
              modules={modules}
              selectedModuleId={selectedModuleId}
              setSelectedModuleId={setSelectedModuleId}
              isEditing={!!quizId}
              totalPoints={totalPoints}
              setQuiz={setQuiz}
              addQuestion={addQuestion}
              moveQuestion={moveQuestion}
              duplicateQuestion={duplicateQuestion}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
              addChoice={addChoice}
              updateChoice={updateChoice}
              removeChoice={removeChoice}
              toggleCorrectAnswer={toggleCorrectAnswer}
              t={t}
            />
          </TabTransition>
        </div>
      </div>
    </Layout>
  );
};

export default QuizBuilder;
