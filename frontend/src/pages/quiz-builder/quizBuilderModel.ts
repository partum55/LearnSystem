export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'multiple_select'
  | 'fill_blank';

export interface Question {
  id?: string | number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  choices?: string[];
  correct_answer?: string | string[];
  explanation?: string;
  required?: boolean;
}

export interface QuizSettings {
  show_results_after: 'immediate' | 'after_due' | 'manual';
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  one_question_at_time: boolean;
  allow_backtrack: boolean;
  require_lockdown_browser: boolean;
  show_point_values: boolean;
}

export interface Quiz {
  id?: string | number;
  title: string;
  description: string;
  instructions?: string;
  course?: string;
  time_limit?: number;
  attempts_allowed: number;
  available_from?: string;
  available_until?: string;
  passing_score?: number;
  questions: Question[];
  settings: QuizSettings;
}

export type QuizBuilderTab = 'basic' | 'questions' | 'settings';

export type QuizSettingsToggleKey = Exclude<keyof QuizSettings, 'show_results_after'>;

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  show_results_after: 'immediate',
  shuffle_questions: false,
  shuffle_answers: false,
  show_correct_answers: true,
  one_question_at_time: false,
  allow_backtrack: true,
  require_lockdown_browser: false,
  show_point_values: true,
};

export const QUIZ_QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; labelKey: string; defaultLabel: string }> = [
  { value: 'multiple_choice', labelKey: 'quiz.multipleChoice', defaultLabel: 'Multiple Choice' },
  { value: 'multiple_select', labelKey: 'quiz.multipleSelect', defaultLabel: 'Multiple Select' },
  { value: 'true_false', labelKey: 'quiz.trueFalse', defaultLabel: 'True/False' },
  { value: 'short_answer', labelKey: 'quiz.shortAnswer', defaultLabel: 'Short Answer' },
  { value: 'essay', labelKey: 'quiz.essay', defaultLabel: 'Essay' },
  { value: 'fill_blank', labelKey: 'quiz.fillBlank', defaultLabel: 'Fill in the Blank' },
];

export const QUIZ_SETTINGS_TOGGLE_OPTIONS: Array<{ key: QuizSettingsToggleKey; labelKey: string; defaultLabel: string }> = [
  { key: 'shuffle_questions', labelKey: 'quiz.shuffleQuestions', defaultLabel: 'Shuffle questions' },
  { key: 'shuffle_answers', labelKey: 'quiz.shuffleAnswers', defaultLabel: 'Shuffle answer choices' },
  {
    key: 'show_correct_answers',
    labelKey: 'quiz.showCorrectAnswers',
    defaultLabel: 'Show correct answers after submission',
  },
  { key: 'show_point_values', labelKey: 'quiz.showPointValues', defaultLabel: 'Show point values' },
  { key: 'one_question_at_time', labelKey: 'quiz.oneQuestionAtTime', defaultLabel: 'Show one question at a time' },
  {
    key: 'allow_backtrack',
    labelKey: 'quiz.allowBacktrack',
    defaultLabel: 'Allow students to go back to previous questions',
  },
  { key: 'require_lockdown_browser', labelKey: 'quiz.requireLockdown', defaultLabel: 'Require lockdown browser' },
];

export const createInitialQuiz = (): Quiz => ({
  title: '',
  description: '',
  instructions: '',
  time_limit: 60,
  attempts_allowed: 1,
  passing_score: 70,
  questions: [],
  settings: { ...DEFAULT_QUIZ_SETTINGS },
});

export const createQuestion = (type: QuestionType = 'multiple_choice'): Question => {
  const question: Question = {
    question_text: '',
    question_type: type,
    points: 1,
    required: true,
  };

  if (type === 'multiple_choice' || type === 'multiple_select') {
    question.choices = ['', '', '', ''];
    question.correct_answer = type === 'multiple_select' ? [] : '';
  } else if (type === 'true_false') {
    question.choices = ['True', 'False'];
    question.correct_answer = '';
  }

  return question;
};

export const applyQuestionTypeDefaults = (question: Question, type: QuestionType): Question => {
  const baseQuestion: Question = {
    ...question,
    question_type: type,
  };

  if (type === 'multiple_choice' || type === 'multiple_select') {
    return {
      ...baseQuestion,
      choices: ['', '', '', ''],
      correct_answer: type === 'multiple_select' ? [] : '',
    };
  }

  if (type === 'true_false') {
    return {
      ...baseQuestion,
      choices: ['True', 'False'],
      correct_answer: '',
    };
  }

  return {
    ...baseQuestion,
    choices: undefined,
    correct_answer: '',
  };
};
