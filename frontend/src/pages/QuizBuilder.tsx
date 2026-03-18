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
  QuizSection,
} from './quiz-builder/quizBuilderModel';
import { QuizBuilderTabContent } from './quiz-builder/QuizBuilderTabContent';
import { getQuizBuilderTabs } from './quiz-builder/quizBuilderTabs';
import { TabTransition } from '../components/animation';

interface ApiQuestionDetails {
  id: string;
  questionType: string;
  stem: string;
  imageUrl?: string;
  options?: Record<string, unknown>;
  correctAnswer?: Record<string, unknown>;
  explanation?: string;
  points?: number;
}

interface ApiQuizQuestion {
  questionId?: string;
  position?: number;
  question?: ApiQuestionDetails;
}

interface ApiQuizSectionRule {
  id?: string;
  questionType?: string;
  difficulty?: string;
  tag?: string;
  quota?: number;
}

interface ApiQuizSection {
  id?: string;
  title?: string;
  position?: number;
  questionCount?: number;
  rules?: ApiQuizSectionRule[];
}

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
  questions?: ApiQuizQuestion[];
  sections?: ApiQuizSection[];
}

interface ModuleSummary {
  id: string;
  title: string;
}

interface AssignmentApiResponse {
  quizId?: string;
  quiz_id?: string;
}

const normalizeQuestionType = (value: string): Question['question_type'] => {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return 'single_choice';
    case 'MULTIPLE_RESPONSE':
    case 'MULTI_SELECT':
      return 'multiple_response';
    case 'TRUE_FALSE':
      return 'true_false';
    case 'SHORT_ANSWER':
    case 'FILL_BLANK':
      return 'short_answer';
    case 'NUMERIC':
    case 'NUMERICAL':
      return 'numeric';
    case 'MATCHING':
      return 'matching';
    case 'ORDERING':
      return 'ordering';
    case 'ESSAY':
      return 'essay';
    default:
      return 'short_answer';
  }
};

const toBackendQuestionType = (value: Question['question_type']): string => {
  switch (value) {
    case 'single_choice':
      return 'SINGLE_CHOICE';
    case 'multiple_response':
      return 'MULTIPLE_RESPONSE';
    case 'true_false':
      return 'TRUE_FALSE';
    case 'short_answer':
      return 'SHORT_ANSWER';
    case 'essay':
      return 'ESSAY';
    case 'numeric':
      return 'NUMERIC';
    case 'matching':
      return 'MATCHING';
    case 'ordering':
      return 'ORDERING';
    default:
      return 'SHORT_ANSWER';
  }
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item ?? '').trim())
    .filter((item) => item.length > 0);
};

const mapApiQuestionToBuilder = (apiQuestion: ApiQuestionDetails): Question => {
  const type = normalizeQuestionType(apiQuestion.questionType || '');
  const options = (apiQuestion.options || {}) as Record<string, unknown>;
  const answerKey = (apiQuestion.correctAnswer || {}) as Record<string, unknown>;
  const question = createQuestion(type);

  question.id = apiQuestion.id;
  question.question_text = apiQuestion.stem || '';
  question.image_url = apiQuestion.imageUrl || '';
  question.points = toNumber(apiQuestion.points, 1);
  question.explanation = apiQuestion.explanation || '';

  if (type === 'single_choice') {
    question.choices = readStringArray(options.choices);
    question.correct_answer = String(
      answerKey.choice ?? answerKey.answer ?? answerKey.value ?? ''
    );
  } else if (type === 'multiple_response') {
    question.choices = readStringArray(options.choices);
    question.correct_answer = readStringArray(answerKey.choices ?? answerKey.values);
  } else if (type === 'true_false') {
    question.choices = ['True', 'False'];
    const raw = String(answerKey.choice ?? answerKey.value ?? '');
    question.correct_answer = raw.toLowerCase() === 'true' ? 'True' : 'False';
  } else if (type === 'short_answer') {
    const answers = readStringArray(answerKey.answers);
    question.correct_answer = answers[0] ?? String(answerKey.answer ?? '');
  } else if (type === 'numeric') {
    question.correct_answer = toNumber(answerKey.value, 0);
    question.numeric_tolerance = toNumber(answerKey.tolerance, 0.01);
  } else if (type === 'matching') {
    const pairsFromArray = Array.isArray(options.pairs)
      ? options.pairs
      : [];
    const pairs = pairsFromArray
      .map((pair) => {
        if (!pair || typeof pair !== 'object') return null;
        const left = String((pair as Record<string, unknown>).left ?? '').trim();
        const right = String((pair as Record<string, unknown>).right ?? '').trim();
        if (!left && !right) return null;
        return { left, right };
      })
      .filter((pair): pair is { left: string; right: string } => Boolean(pair));
    question.matching_pairs = pairs.length > 0 ? pairs : [{ left: '', right: '' }];
  } else if (type === 'ordering') {
    const order = readStringArray(answerKey.order);
    const fallback = readStringArray(options.choices);
    question.ordering_items = order.length > 0 ? order : fallback;
  }

  return question;
};

const mapApiSectionToBuilder = (section: ApiQuizSection, index: number): QuizSection => ({
  id: section.id,
  title: section.title || `Section ${index + 1}`,
  position: toNumber(section.position, index),
  question_count: toNumber(section.questionCount, 0),
  rules: (section.rules || []).map((rule) => ({
    id: rule.id,
    question_type: rule.questionType,
    difficulty: rule.difficulty,
    tag: rule.tag,
    quota: toNumber(rule.quota, 1),
  })),
});

const buildQuestionPayload = (question: Question, courseId: string) => {
  const questionType = toBackendQuestionType(question.question_type);
  const points = toNumber(question.points, 1);
  const choices = (question.choices || [])
    .map((choice) => choice.trim())
    .filter((choice) => choice.length > 0);

  let options: Record<string, unknown> = {};
  let correctAnswer: Record<string, unknown> = {};

  switch (question.question_type) {
    case 'single_choice':
      options = { choices };
      correctAnswer = { choice: String(question.correct_answer ?? '') };
      break;
    case 'multiple_response':
      options = { choices };
      correctAnswer = { choices: readStringArray(question.correct_answer) };
      break;
    case 'true_false':
      options = { choices: ['True', 'False'] };
      correctAnswer = { choice: String(question.correct_answer ?? 'False') };
      break;
    case 'short_answer': {
      const answer = String(question.correct_answer ?? '').trim();
      correctAnswer = answer ? { answers: [answer] } : {};
      break;
    }
    case 'essay':
      correctAnswer = {};
      break;
    case 'numeric':
      correctAnswer = {
        value: toNumber(question.correct_answer, 0),
        tolerance: toNumber(question.numeric_tolerance, 0.01),
      };
      break;
    case 'matching': {
      const pairs = (question.matching_pairs || [])
        .map((pair) => ({
          left: pair.left.trim(),
          right: pair.right.trim(),
        }))
        .filter((pair) => pair.left.length > 0 || pair.right.length > 0);

      const answerPairs = Object.fromEntries(
        pairs.filter((pair) => pair.left.length > 0).map((pair) => [pair.left, pair.right])
      );
      options = { pairs };
      correctAnswer = { pairs: answerPairs };
      break;
    }
    case 'ordering': {
      const items = (question.ordering_items || [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      options = { choices: items };
      correctAnswer = { order: items };
      break;
    }
    default:
      correctAnswer = {};
      break;
  }

  return {
    courseId,
    questionType,
    stem: question.question_text,
    imageUrl: question.image_url || undefined,
    options,
    correctAnswer,
    explanation: question.explanation || '',
    points,
    metadata: {},
  };
};

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

      const loadedQuestions = (response.data.questions || [])
        .map((item) => item.question)
        .filter((question): question is ApiQuestionDetails => Boolean(question))
        .map(mapApiQuestionToBuilder);

      const loadedSections = (response.data.sections || []).map(mapApiSectionToBuilder);

      const loadedQuiz: Quiz = {
        id: response.data.id,
        title: response.data.title,
        description: response.data.description || '',
        course: response.data.courseId ? String(response.data.courseId) : undefined,
        time_limit: response.data.timeLimit ?? 60,
        attempts_allowed: response.data.attemptsAllowed ?? 1,
        passing_score: response.data.passPercentage ?? 70,
        questions: loadedQuestions,
        sections: loadedSections,
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

  const syncQuizQuestions = useCallback(async (targetQuizId: string, courseId: string) => {
    const quizResponse = await apiClient.get<QuizApiResponse>(`/assessments/quizzes/${targetQuizId}`);
    const existingQuestionIds = new Set(
      (quizResponse.data.questions || [])
        .map((item) => item.question?.id || item.questionId || '')
        .filter((id): id is string => Boolean(id))
    );

    const persistedQuestions: Question[] = [];
    const desiredQuestionIds: string[] = [];

    for (const localQuestion of quiz.questions) {
      const payload = buildQuestionPayload(localQuestion, courseId);
      let persistedId = localQuestion.id ? String(localQuestion.id) : '';

      if (persistedId) {
        await apiClient.put(`/assessments/questions/${persistedId}`, payload);
      } else {
        const created = await apiClient.post<{ id: string }>('/assessments/questions', payload);
        persistedId = String(created.data.id);
      }

      desiredQuestionIds.push(persistedId);
      persistedQuestions.push({ ...localQuestion, id: persistedId });

      if (!existingQuestionIds.has(persistedId)) {
        await apiClient.post(`/assessments/quizzes/${targetQuizId}/questions/${persistedId}`);
      }
    }

    for (const existingId of existingQuestionIds) {
      if (!desiredQuestionIds.includes(existingId)) {
        await apiClient.delete(`/assessments/quizzes/${targetQuizId}/questions/${existingId}`);
      }
    }

    if (desiredQuestionIds.length > 0) {
      await apiClient.put(`/assessments/quizzes/${targetQuizId}/questions/reorder`, desiredQuestionIds);
    }

    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: persistedQuestions,
    }));
  }, [quiz.questions]);

  const syncQuizSections = useCallback(async (targetQuizId: string) => {
    const existingResponse = await apiClient.get<ApiQuizSection[]>(`/assessments/quizzes/${targetQuizId}/sections`);
    const existingSections = Array.isArray(existingResponse.data) ? existingResponse.data : [];
    const existingIds = new Set(existingSections.map((section) => section.id).filter((id): id is string => Boolean(id)));

    const persistedSections: QuizSection[] = [];
    const keptIds = new Set<string>();

    for (let index = 0; index < quiz.sections.length; index += 1) {
      const section = quiz.sections[index];
      const payload = {
        title: section.title,
        position: section.position ?? index,
        questionCount: section.question_count,
        rules: (section.rules || []).map((rule) => ({
          questionType: rule.question_type || undefined,
          difficulty: rule.difficulty || undefined,
          tag: rule.tag || undefined,
          quota: toNumber(rule.quota, 1),
        })),
      };

      if (section.id && existingIds.has(section.id)) {
        const updated = await apiClient.put<ApiQuizSection>(
          `/assessments/quizzes/${targetQuizId}/sections/${section.id}`,
          payload
        );
        const updatedSection = mapApiSectionToBuilder(updated.data, index);
        persistedSections.push(updatedSection);
        if (updatedSection.id) {
          keptIds.add(updatedSection.id);
        }
      } else {
        const created = await apiClient.post<ApiQuizSection>(
          `/assessments/quizzes/${targetQuizId}/sections`,
          payload
        );
        const createdSection = mapApiSectionToBuilder(created.data, index);
        persistedSections.push(createdSection);
        if (createdSection.id) {
          keptIds.add(createdSection.id);
        }
      }
    }

    for (const existing of existingSections) {
      if (existing.id && !keptIds.has(existing.id)) {
        await apiClient.delete(`/assessments/quizzes/${targetQuizId}/sections/${existing.id}`);
      }
    }

    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: persistedSections,
    }));
  }, [quiz.sections]);

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
      const numericCourseId = Number(quiz.course);
      const courseId = Number.isNaN(numericCourseId) ? String(quiz.course) : String(numericCourseId);

      let targetQuizId = quizId;

      if (quizId) {
        await apiClient.put(`/assessments/quizzes/${quizId}`, {
          id: quizId,
          courseId,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.time_limit,
          attemptsAllowed: quiz.attempts_allowed,
          shuffleQuestions: quiz.settings.shuffle_questions,
          shuffleAnswers: quiz.settings.shuffle_answers,
          showCorrectAnswers: quiz.settings.show_correct_answers,
          passPercentage: quiz.passing_score,
        });
      } else {
        const createdAssignment = await apiClient.post<AssignmentApiResponse>('/assessments/assignments', {
          courseId,
          moduleId: selectedModuleId,
          assignmentType: 'QUIZ',
          title: quiz.title,
          description: quiz.description || '',
          maxPoints: 100,
          isPublished: false,
          quiz: {
            title: quiz.title,
            description: quiz.description || undefined,
            timeLimit: quiz.time_limit,
            attemptsAllowed: quiz.attempts_allowed,
            shuffleQuestions: quiz.settings.shuffle_questions,
            shuffleAnswers: quiz.settings.shuffle_answers,
            showCorrectAnswers: quiz.settings.show_correct_answers,
            passPercentage: quiz.passing_score,
          },
        });
        targetQuizId = createdAssignment.data.quizId || createdAssignment.data.quiz_id;
      }

      if (!targetQuizId) {
        throw new Error('Failed to resolve target quiz ID');
      }

      await syncQuizQuestions(targetQuizId, courseId);
      await syncQuizSections(targetQuizId);

      const refreshedResponse = await apiClient.get<QuizApiResponse>(`/assessments/quizzes/${targetQuizId}`);
      const refreshedQuiz = {
        ...quiz,
        id: targetQuizId,
        questions: (refreshedResponse.data.questions || [])
          .map((item) => item.question)
          .filter((question): question is ApiQuestionDetails => Boolean(question))
          .map(mapApiQuestionToBuilder),
        sections: (refreshedResponse.data.sections || []).map(mapApiSectionToBuilder),
      };
      setQuiz(refreshedQuiz);
      initialQuizRef.current = JSON.stringify(refreshedQuiz);

      alert(t('quiz.saved', 'Quiz saved successfully!'));
      navigate(`/quiz/${targetQuizId}`);
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert(t('quiz.saveFailed', 'Failed to save quiz'));
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: Question['question_type'] = 'single_choice') => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: [...previousQuiz.questions, createQuestion(type)],
    }));
  };

  const duplicateQuestion = (index: number) => {
    setQuiz((previousQuiz) => {
      const questionToDuplicate = JSON.parse(JSON.stringify(previousQuiz.questions[index])) as Question;
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

      if (question.question_type === 'multiple_response') {
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
